'use client';

import { useState, useEffect } from 'react';
import { Lightbulb } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

export default function SettingsPage() {
  const [taskLimit, setTaskLimit] = useState(5);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loadingSettings, setLoadingSettings] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const supabase = createClient();

  useEffect(() => {
    loadSettings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadSettings() {
    setLoadingSettings(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoadingSettings(false); return; }

    const { data, error: loadError } = await supabase
      .from('profiles')
      .select('daily_task_limit')
      .eq('id', user.id)
      .single();

    if (loadError) setError('Failed to load settings');
    if (data) {
      setTaskLimit(data.daily_task_limit);
    }
    setLoadingSettings(false);
  }

  async function saveSettings() {
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error: saveError } = await supabase
      .from('profiles')
      .update({ daily_task_limit: taskLimit })
      .eq('id', user.id);

    setSaving(false);
    if (saveError) { setError('Failed to save settings'); return; }
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  if (loadingSettings) return <div className="space-y-4 animate-pulse"><div className="h-8 w-32 bg-gray-200 rounded" /><div className="h-40 bg-gray-200 rounded-lg" /></div>;

  return (
    <div>
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="text-red-500 hover:text-red-700 font-medium focus:outline-none focus:ring-2 focus:ring-red-300 rounded">Dismiss</button>
        </div>
      )}
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-calm-text">Settings</h1>
      </header>

      <div className="space-y-6">
        {/* Task Limit */}
        <div className="bg-white rounded-lg border border-calm-border p-6">
          <h2 className="font-semibold text-calm-text mb-2">Daily Task Limit</h2>
          <p className="text-sm text-calm-muted mb-4">
            Tasks per day (3-5 recommended)
          </p>
          <div className="flex items-center gap-4">
            <input
              type="range"
              min="1"
              max="10"
              value={taskLimit}
              onChange={(e) => setTaskLimit(parseInt(e.target.value))}
              className="flex-1 accent-primary-600"
            />
            <span className="text-2xl font-bold text-primary-600 w-12 text-center">
              {taskLimit}
            </span>
          </div>
          <div className="flex justify-between text-xs text-calm-muted mt-2">
            <span>1</span>
            <span>10</span>
          </div>
        </div>

        {/* Save Button */}
        <button
          onClick={saveSettings}
          disabled={saving}
          className="calm-button-primary w-full"
        >
          {saving ? 'Saving...' : saved ? 'Saved!' : 'Save Settings'}
        </button>

        {/* Tips */}
        <div className="bg-primary-50 rounded-lg border border-primary-200 p-6">
          <h3 className="font-medium text-primary-800 mb-2"><Lightbulb className="w-4 h-4 inline" /> Tips for ADHD</h3>
          <ul className="text-sm text-primary-700 space-y-2">
            <li>• Keep your daily limit low — less is more</li>
            <li>• Use the inbox to capture ideas without distraction</li>
            <li>• Complete tasks in any order — just get one done!</li>
            <li>• Don&apos;t worry about perfect, just progress</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
