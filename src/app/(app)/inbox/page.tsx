'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Inbox } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

interface InboxItem {
  id: string;
  title: string;
  is_processed: boolean;
  created_at: string;
}

export default function InboxPage() {
  const [items, setItems] = useState<InboxItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [newItemTitle, setNewItemTitle] = useState('');
  const [adding, setAdding] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    loadInbox();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadInbox() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from('inbox_items')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_processed', false)
      .order('created_at', { ascending: false });

    setItems(data || []);
    setLoading(false);
  }

  async function addItem() {
    if (!newItemTitle.trim()) return;
    setAdding(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from('inbox_items')
      .insert({
        user_id: user.id,
        title: newItemTitle.trim(),
      })
      .select()
      .single();

    setAdding(false);
    if (!error && data) {
      setItems([data, ...items]);
      setNewItemTitle('');
    }
  }

  async function deleteItem(id: string) {
    const { error } = await supabase
      .from('inbox_items')
      .delete()
      .eq('id', id);

    if (!error) {
      setItems(items.filter(i => i.id !== id));
    }
  }

  async function processItem(item: InboxItem) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: tasks } = await supabase
      .from('tasks')
      .select('id')
      .eq('user_id', user.id)
      .eq('task_date', new Date().toISOString().split('T')[0]);

    const nextSlot = (tasks?.length || 0) + 1;

    const { error } = await supabase
      .from('tasks')
      .insert({
        user_id: user.id,
        title: item.title,
        slot_order: nextSlot,
        task_date: new Date().toISOString().split('T')[0],
      });

    if (!error) {
      await supabase
        .from('inbox_items')
        .update({ is_processed: true })
        .eq('id', item.id);

      setItems(items.filter(i => i.id !== item.id));
      router.push('/today');
    }
  }

  return (
    <div>
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-calm-text">Inbox</h1>
        <p className="text-calm-muted text-sm mt-1">
          Brain dump — capture ideas, process later
        </p>
      </header>

      {/* Quick Add */}
      <div className="mb-6">
        <div className="flex gap-2">
          <input
            type="text"
            value={newItemTitle}
            onChange={(e) => setNewItemTitle(e.target.value)}
            placeholder="Quick capture..."
            className="calm-input flex-1"
            onKeyDown={(e) => e.key === 'Enter' && addItem()}
          />
          <button
            onClick={addItem}
            disabled={adding || !newItemTitle.trim()}
            className="calm-button-primary"
          >
            Add
          </button>
        </div>
      </div>

      {/* Inbox List */}
      {loading ? (
        <div className="space-y-3 animate-pulse">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-16 bg-gray-200 rounded-lg" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-12">
          <Inbox className="w-10 h-10 text-calm-muted mx-auto mb-3" />
          <p className="text-calm-muted">Inbox is empty</p>
          <p className="text-sm text-calm-muted mt-1">
            Capture thoughts quickly, process them later
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <div
              key={item.id}
              className="group bg-white rounded-lg border border-calm-border p-4"
            >
              <div className="flex items-start gap-3">
                <p className="flex-1 text-calm-text">{item.title}</p>
                <div className="flex gap-2 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => processItem(item)}
                    className="text-xs text-primary-600 hover:underline"
                  >
                    Add to Today
                  </button>
                  <button
                    onClick={() => deleteItem(item.id)}
                    className="text-xs text-calm-muted hover:text-accent-red"
                  >
                    Delete
                  </button>
                </div>
              </div>
              <p className="text-xs text-calm-muted mt-2">
                {new Date(item.created_at).toLocaleString()}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
