import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import AppNav from '@/components/AppNav';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: streakData } = await supabase
    .from('streaks')
    .select('current_streak')
    .eq('user_id', user.id)
    .single();

  return (
    <div className="min-h-screen bg-calm-bg">
      <AppNav streak={streakData?.current_streak} />
      <main className="max-w-md mx-auto px-4 py-6">{children}</main>
    </div>
  );
}
