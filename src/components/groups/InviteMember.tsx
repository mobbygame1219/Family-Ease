'use client';

import { useState } from 'react';

export default function InviteMember({ groupId }: { groupId: string }) {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    const res = await fetch(`/api/groups/${groupId}/members`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });

    const data = await res.json();

    if (res.ok) {
      setMessage({ type: 'success', text: `✅ 已成功加入 ${data.name}！請重新整理頁面查看。` });
      setEmail('');
    } else {
      setMessage({ type: 'error', text: `❌ ${data.error}` });
    }

    setLoading(false);
  };

  return (
    <div className="border-t border-gray-100 pt-3">
      <p className="text-xs text-gray-500 mb-2">邀請家人加入（需先註冊帳號）</p>
      <form onSubmit={handleInvite} className="flex gap-2">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          placeholder="輸入家人的 Email"
          className="flex-1 rounded-lg border border-gray-300 px-3 py-1.5 text-xs focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
        />
        <button
          type="submit"
          disabled={loading}
          className="rounded-lg bg-green-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-green-700 disabled:opacity-60 transition-colors"
        >
          {loading ? '加入中…' : '邀請'}
        </button>
      </form>
      {message && (
        <p className={`mt-2 text-xs ${message.type === 'success' ? 'text-green-600' : 'text-red-500'}`}>
          {message.text}
        </p>
      )}
    </div>
  );
}