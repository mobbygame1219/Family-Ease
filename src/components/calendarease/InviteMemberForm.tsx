'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { UserPlus, X, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface Props {
  groupId: string;
}

export default function InviteMemberForm({ groupId }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) { setError('請輸入 Email'); return; }
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const res = await fetch(`/api/calendarease/groups/${groupId}/members`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? '邀請失敗');
        return;
      }
      setSuccess(`✓ 已邀請 ${email}`);
      setEmail('');
      router.refresh();
      // Auto-close after 2 s
      setTimeout(() => { setOpen(false); setSuccess(''); }, 2000);
    } catch {
      setError('網路錯誤，請重試');
    } finally {
      setLoading(false);
    }
  };

  if (!open) {
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
        className="border-purple-200 text-purple-600 hover:bg-purple-50"
      >
        <UserPlus className="h-3.5 w-3.5 mr-1.5" />
        邀請成員
      </Button>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex items-center gap-2 rounded-xl border border-purple-200 bg-purple-50 px-3 py-2"
    >
      <Input
        type="email"
        placeholder="輸入對方 Email"
        value={email}
        onChange={(e) => { setEmail(e.target.value); setError(''); }}
        className="h-7 text-sm border-purple-200 focus-visible:ring-purple-500 bg-white w-48"
        autoFocus
        disabled={loading}
      />
      <Button
        type="submit"
        size="sm"
        disabled={loading}
        className="h-7 px-2 bg-purple-600 hover:bg-purple-700 text-white"
      >
        {loading ? '…' : <Check className="h-3.5 w-3.5" />}
      </Button>
      <button
        type="button"
        onClick={() => { setOpen(false); setError(''); setSuccess(''); }}
        className="text-muted-foreground hover:text-foreground"
      >
        <X className="h-4 w-4" />
      </button>

      {error && (
        <span className="text-xs text-red-500 whitespace-nowrap">{error}</span>
      )}
      {success && (
        <span className="text-xs text-green-600 whitespace-nowrap">{success}</span>
      )}
    </form>
  );
}
