'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Flame } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

export default function AppNav({ streak }: { streak?: number }) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();

  const nav = [
    { href: '/today', label: 'Today' },
    { href: '/inbox', label: 'Inbox' },
    { href: '/settings', label: 'Settings' },
  ];

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  }

  return (
    <nav className="bg-white border-b border-calm-border">
      <div className="max-w-md mx-auto px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <Link href="/today" className="font-bold text-lg text-primary-600">
            Focus Flow
          </Link>
          <div className="flex gap-4">
            {nav.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                className={`text-sm font-medium transition-colors rounded focus:outline-none focus:ring-2 focus:ring-primary-300 ${
                  pathname === href 
                    ? 'text-primary-600' 
                    : 'text-calm-muted hover:text-calm-text'
                }`}
              >
                {label}
              </Link>
            ))}
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          {streak !== undefined && streak > 0 && (
            <div className="flex items-center gap-1 text-accent-yellow text-sm font-medium">
              <Flame className="w-4 h-4 text-accent-orange" />
              <span>{streak}</span>
            </div>
          )}
          <button
            onClick={handleSignOut}
            className="text-sm text-calm-muted hover:text-calm-text rounded focus:outline-none focus:ring-2 focus:ring-primary-300"
          >
            Sign out
          </button>
        </div>
      </div>
    </nav>
  );
}
