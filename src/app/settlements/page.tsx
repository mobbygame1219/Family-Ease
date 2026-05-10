'use client';

import { useState, useEffect } from 'react';
import { formatCurrency } from '@/utils/balance';

interface Debt {
  fromId: string;
  fromName: string;
  toId: string;
  toName: string;
  amount: number;
  groupId: string;
  groupName: string;
}

export default function SettlementsPage() {
  const [debts, setDebts] = useState<Debt[]>([]);
  const [currentUserId, setCurrentUserId] = useState('');
  const [loading, setLoading] = useState(true);
  const [settling, setSettling] = useState<string | null>(null);
  const [customAmounts, setCustomAmounts] = useState<Record<string, string>>({});
  const [done, setDone] = useState<string[]>([]);

  useEffect(() => {
    fetch('/api/settlements')
      .then((r) => r.json())
      .then((data) => {
        setDebts(data.debts ?? []);
        setCurrentUserId(data.currentUserId ?? '');
        setLoading(false);
      });
  }, []);

const handleSettle = async (debt: Debt) => {
  const key = `${debt.fromId}-${debt.toId}-${debt.groupId}`;
  const inputAmount = parseFloat(customAmounts[key] || String(debt.amount));

  if (isNaN(inputAmount) || inputAmount <= 0) {
    alert('請輸入正確的金額');
    return;
  }

  if (inputAmount > debt.amount) {
    alert(`金額不能超過 ${formatCurrency(debt.amount)}`);
    return;
  }

  setSettling(key);

  await fetch('/api/settlements', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      payerId: debt.fromId,
      receiverId: debt.toId,
      amount: inputAmount,
      groupId: debt.groupId,
    }),
  });

  setDone((prev) => [...prev, key]);
  setSettling(null);
};

  const iOwe = debts.filter((d) => d.fromId === currentUserId);
  const owedToMe = debts.filter((d) => d.toId === currentUserId);

  if (loading) {
    return (
      <div className="p-6 max-w-3xl mx-auto">
        <div className="text-gray-400 text-sm">載入中…</div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">結清帳款</h1>
        <p className="text-gray-500 text-sm mt-1">查看並結清與家人之間的帳款</p>
      </div>

      {debts.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 p-16 text-center">
          <div className="text-4xl mb-4">🎉</div>
          <p className="text-gray-500 font-medium mb-1">所有帳款都結清了！</p>
          <p className="text-gray-400 text-sm">目前沒有未結清的帳款</p>
        </div>
      ) : (
        <div className="space-y-6">

          {/* 我欠別人 */}
          {iOwe.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-red-500 uppercase tracking-wide mb-3">
                我需要付款
              </h2>
              <div className="rounded-xl border border-gray-200 bg-white divide-y divide-gray-100">
                {iOwe.map((debt) => {
                  const key = `${debt.fromId}-${debt.toId}-${debt.groupId}`;
                  const isDone = done.includes(key);
                  return (
                    <div key={key} className="flex items-center gap-4 p-4">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100 text-red-600 font-semibold text-sm flex-shrink-0">
                        {debt.toName.charAt(0)}
                      </div>
                      <div className="flex-1">
                        <div className="text-sm font-medium text-gray-900">
                          付給 <span className="text-red-600">{debt.toName}</span>
                        </div>
                        <div className="text-xs text-gray-400">{debt.groupName}</div>
                      </div>
                      <div className="text-right mr-4">
                        <div className="text-lg font-bold text-red-500">
                          {formatCurrency(debt.amount)}
                        </div>
                      </div>
                      {isDone ? (
  <div className="rounded-lg bg-gray-100 px-4 py-2 text-sm text-gray-400">
    ✓ 已結清
  </div>
) : (
  <div className="flex items-center gap-2">
    <div className="flex items-center gap-1">
      <span className="text-sm text-gray-500">$</span>
      <input
        type="number"
        value={customAmounts[key] ?? ''}
        onChange={(e) => setCustomAmounts((a) => ({ ...a, [key]: e.target.value }))}
        placeholder={String(Math.round(debt.amount))}
        min="1"
        max={debt.amount}
        className="w-24 rounded-lg border border-gray-300 px-2 py-1.5 text-sm text-right focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
      />
    </div>
    <button
      onClick={() => handleSettle(debt)}
      disabled={settling === key}
      className="rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-60 transition-colors whitespace-nowrap"
    >
      {settling === key ? '處理中…' : '標記結清'}
    </button>
  </div>
)}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* 別人欠我 */}
          {owedToMe.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-green-600 uppercase tracking-wide mb-3">
                別人欠我
              </h2>
              <div className="rounded-xl border border-gray-200 bg-white divide-y divide-gray-100">
                {owedToMe.map((debt) => {
                  const key = `${debt.fromId}-${debt.toId}-${debt.groupId}`;
                  const isDone = done.includes(key);
                  return (
                    <div key={key} className="flex items-center gap-4 p-4">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-100 text-green-600 font-semibold text-sm flex-shrink-0">
                        {debt.fromName.charAt(0)}
                      </div>
                      <div className="flex-1">
                        <div className="text-sm font-medium text-gray-900">
                          <span className="text-green-600">{debt.fromName}</span> 欠你
                        </div>
                        <div className="text-xs text-gray-400">{debt.groupName}</div>
                      </div>
                      <div className="text-right mr-4">
                        <div className="text-lg font-bold text-green-600">
                          {formatCurrency(debt.amount)}
                        </div>
                      </div>
                      {isDone ? (
  <div className="rounded-lg bg-gray-100 px-4 py-2 text-sm text-gray-400">
    ✓ 已結清
  </div>
) : (
  <div className="flex items-center gap-2">
    <div className="flex items-center gap-1">
      <span className="text-sm text-gray-500">$</span>
      <input
        type="number"
        value={customAmounts[key] ?? ''}
        onChange={(e) => setCustomAmounts((a) => ({ ...a, [key]: e.target.value }))}
        placeholder={String(Math.round(debt.amount))}
        min="1"
        max={debt.amount}
        className="w-24 rounded-lg border border-gray-300 px-2 py-1.5 text-sm text-right focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
      />
    </div>
    <button
      onClick={() => handleSettle(debt)}
      disabled={settling === key}
      className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-60 transition-colors whitespace-nowrap"
    >
      {settling === key ? '處理中…' : '確認收款'}
    </button>
  </div>
)}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}