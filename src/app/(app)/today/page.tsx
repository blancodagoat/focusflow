'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';

interface Task {
  id: string;
  title: string;
  is_completed: boolean;
  slot_order: number;
  completed_at: string | null;
}

export default function TodayPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [taskLimit, setTaskLimit] = useState(5);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [addingTask, setAddingTask] = useState(false);
  const [celebratingTaskId, setCelebratingTaskId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const supabase = createClient();

  useEffect(() => {
    loadTasks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadTasks() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: profile } = await supabase
      .from('profiles')
      .select('daily_task_limit')
      .eq('id', user.id)
      .single();

    if (profile) setTaskLimit(profile.daily_task_limit);

    const { data: tasksData, error: loadError } = await supabase
      .from('tasks')
      .select('*')
      .eq('user_id', user.id)
      .eq('task_date', new Date().toISOString().split('T')[0])
      .order('slot_order');

    if (loadError) setError('Failed to load tasks');
    setTasks(tasksData || []);
    setLoading(false);
  }

  async function addTask() {
    if (!newTaskTitle.trim()) return;
    setAddingTask(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setAddingTask(false); return; }

    const nextSlot = tasks.length + 1;
    if (nextSlot > taskLimit) {
      setAddingTask(false);
      return;
    }

    const { data, error } = await supabase
      .from('tasks')
      .insert({
        user_id: user.id,
        title: newTaskTitle.trim(),
        slot_order: nextSlot,
        task_date: new Date().toISOString().split('T')[0],
      })
      .select()
      .single();

    setAddingTask(false);
    if (error) { setError('Failed to add task'); return; }
    if (!error && data) {
      setTasks(prev => [...prev, data]);
      setNewTaskTitle('');
      setShowAddModal(false);
    }
  }

  async function toggleComplete(task: Task) {
    const newCompleted = !task.is_completed;
    
    setTasks(prev => prev.map(t => 
      t.id === task.id 
        ? { ...t, is_completed: newCompleted, completed_at: newCompleted ? new Date().toISOString() : null }
        : t
    ));

    const { error } = await supabase
      .from('tasks')
      .update({ 
        is_completed: newCompleted,
        completed_at: newCompleted ? new Date().toISOString() : null
      })
      .eq('id', task.id);

    if (error) { setTasks(prev => prev.map(t => t.id === task.id ? task : t)); setError('Failed to update task'); return; }

    if (!error && newCompleted) {
      setCelebratingTaskId(task.id);
      setTimeout(() => setCelebratingTaskId(null), 600);
      
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const today = new Date().toISOString().split('T')[0];
        await supabase
          .from('completion_log')
          .upsert({
            user_id: user.id,
            completed_date: today,
          }, { onConflict: 'user_id,completed_date' });
        
        await updateStreak();
      }
    }
  }

  async function updateStreak() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const today = new Date().toISOString().split('T')[0];
    
    const { data: logs } = await supabase
      .from('completion_log')
      .select('completed_date')
      .eq('user_id', user.id)
      .gte('completed_date', new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
      .order('completed_date', { ascending: false });

    let currentStreak = 0;
    let longestStreak = 0;
    let tempStreak = 0;
    let prevDate: Date | null = null;
    let firstGapSeen = false;

    for (const log of logs || []) {
      const logDate = new Date(log.completed_date);
      if (!prevDate) {
        tempStreak = 1;
      } else {
        const dayDiff = Math.floor((prevDate.getTime() - logDate.getTime()) / (1000 * 60 * 60 * 24));
        if (dayDiff === 1) {
          tempStreak++;
        } else {
          if (!firstGapSeen) {
            currentStreak = tempStreak;
            firstGapSeen = true;
          }
          longestStreak = Math.max(longestStreak, tempStreak);
          tempStreak = 1;
        }
      }
      prevDate = logDate;
    }
    longestStreak = Math.max(longestStreak, tempStreak);

    // If no gap was ever seen, the entire history is one streak
    if (!firstGapSeen) {
      currentStreak = tempStreak;
    }

    // Only count as current if the streak includes today
    if (logs?.[0]?.completed_date !== today) {
      currentStreak = 0;
    }

    const { data: currentStreakData } = await supabase
      .from('streaks')
      .select('longest_streak')
      .eq('user_id', user.id)
      .single();

    await supabase
      .from('streaks')
      .update({ 
        current_streak: currentStreak,
        longest_streak: Math.max(longestStreak, currentStreakData?.longest_streak || 0),
        last_completed_date: today,
      })
      .eq('user_id', user.id);
  }

  async function deleteTask(taskId: string) {
    const { error } = await supabase
      .from('tasks')
      .delete()
      .eq('id', taskId);

    if (!error) {
      setTasks(prev => prev.filter(t => t.id !== taskId));
    } else { setError('Failed to delete task'); }
  }

  const completedCount = tasks.filter(t => t.is_completed).length;
  const canAddMore = tasks.length < taskLimit;

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-8 w-32 bg-gray-200 rounded" />
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-16 bg-gray-200 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div>
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="text-red-500 hover:text-red-700 font-medium focus:outline-none focus:ring-2 focus:ring-red-300 rounded">Dismiss</button>
        </div>
      )}
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-calm-text">Today</h1>
        <p className="text-calm-muted text-sm mt-1">
          {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
        </p>
      </header>

      {/* Progress */}
      <div className="mb-6 p-4 bg-white rounded-lg border border-calm-border">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-calm-text">Progress</span>
          <span className="text-sm text-calm-muted">{completedCount}/{taskLimit}</span>
        </div>
        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
          <div 
            className="h-full bg-primary-500 transition-all duration-500 ease-out"
            style={{ width: `${(completedCount / taskLimit) * 100}%` }}
          />
        </div>
      </div>

      {/* Task Slots */}
      <div className="space-y-3 mb-6">
        {tasks.map((task, index) => (
          <div
            key={task.id}
            className={`group relative bg-white rounded-lg border transition-all duration-200 ${
              task.is_completed 
                ? 'border-accent-green/30 bg-accent-green/5' 
                : celebratingTaskId === task.id
                  ? 'border-accent-green animate-celebrate'
                  : 'border-calm-border hover:border-primary-300'
            }`}
          >
            <div className="flex items-center p-4">
              <button
                onClick={() => toggleComplete(task)}
                className={`flex-shrink-0 w-6 h-6 rounded-full border-2 mr-3 flex items-center justify-center transition-all ${
                  task.is_completed 
                    ? 'bg-accent-green border-accent-green' 
                    : 'border-gray-300 hover:border-primary-400'
                }`}
              >
                {task.is_completed && (
                  <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </button>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-calm-muted bg-gray-100 px-1.5 py-0.5 rounded">
                    {index + 1}
                  </span>
                  <span className={`text-base ${
                    task.is_completed ? 'text-calm-muted line-through' : 'text-calm-text'
                  }`}>
                    {task.title}
                  </span>
                </div>
              </div>

              <button
                onClick={() => deleteTask(task.id)}
                className="sm:opacity-0 sm:group-hover:opacity-100 text-calm-muted hover:text-accent-red text-sm transition-opacity"
              >
                Delete
              </button>
            </div>
          </div>
        ))}

        {/* Empty slots */}
        {canAddMore && (
          <button
            onClick={() => setShowAddModal(true)}
            className="w-full p-4 border-2 border-dashed border-gray-200 rounded-lg text-calm-muted hover:border-primary-300 hover:text-primary-600 transition-colors text-left flex items-center gap-2"
          >
            <span className="text-xl">+</span>
            <span>Add a task</span>
          </button>
        )}

        {!canAddMore && (
          <p className="text-center text-sm text-calm-muted py-2">
            Daily limit reached ({taskLimit} tasks)
          </p>
        )}
      </div>

      {/* Add Task Modal */}
      {showAddModal && (
        <div 
          className="fixed inset-0 bg-black/30 flex items-end sm:items-center justify-center z-50"
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-title"
          onClick={(e) => { if (e.target === e.currentTarget) { setShowAddModal(false); setNewTaskTitle(''); } }}
          onKeyDown={(e) => { if (e.key === 'Escape') { setShowAddModal(false); setNewTaskTitle(''); } }}
        >
          <div className="bg-white rounded-t-2xl sm:rounded-xl w-full sm:max-w-md p-4 sm:p-6">
            <h3 id="modal-title" className="text-lg font-semibold mb-4">Add Task</h3>
            <input
              type="text"
              value={newTaskTitle}
              onChange={(e) => setNewTaskTitle(e.target.value)}
              placeholder="What do you need to do?"
              className="calm-input mb-4"
              autoFocus
              onKeyDown={(e) => e.key === 'Enter' && addTask()}
            />
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setNewTaskTitle('');
                }}
                className="calm-button-secondary flex-1"
              >
                Cancel
              </button>
              <button
                onClick={addTask}
                disabled={addingTask || !newTaskTitle.trim()}
                className="calm-button-primary flex-1"
              >
                {addingTask ? 'Adding...' : 'Add Task'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
