'use client';

import { useState } from 'react';

export default function InviteFamilyMember() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    const res = await fetch('/api/family/invite', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });

    const data = await res.json();

    if (res.ok) {
      setMessage({ type: 'success', text: `✅ 已成功邀請 ${data.name} 加入家庭！請重新整理頁面。` });
      setEmail('');
    } else {
      setMessage({ type: 'error', text: `❌ ${data.error}` });
    }

    setLoading(false);
  };

  return (
    <div>
      <p className="text-xs text-gray-500 mb-2">邀請家人加入（需先註冊帳號）</p>
      <form onSubmit={handleInvite} className="flex gap-2">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          placeholder="輸入家人的 Email"
          className="flex-1 rounded-lg border border-gray-300 px-3 py-1.5 text-xs focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
        <button
          type="submit"
          disabled={loading}
          className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-60 transition-colors"
        >
          {loading ? '邀請中…' : '邀請'}
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