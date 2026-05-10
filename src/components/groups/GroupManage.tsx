'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface Member {
  id: string;
  userId: string;
  role: string;
  user: { id: string; name: string; email: string };
}

interface GroupManageProps {
  groupId: string;
  members: Member[];
  currentUserId: string;
  isCreator: boolean;
}

export default function GroupManage({
  groupId,
  members,
  currentUserId,
  isCreator,
}: GroupManageProps) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const [error, setError] = useState('');

  const handleRemoveMember = async (userId: string, name: string) => {
    const isSelf = userId === currentUserId;
    const msg = isSelf
      ? `確定要離開「${members[0]?.user.name}」群組嗎？`
      : `確定要移除「${name}」嗎？`;

    if (!confirm(msg)) return;

    setLoading(userId);
    setError('');

    const res = await fetch(`/api/groups/${groupId}/members/${userId}`, {
      method: 'DELETE',
    });

    const data = await res.json();

    if (!res.ok) {
      setError(data.error ?? '操作失敗');
      setLoading(null);
      return;
    }

    if (isSelf) {
      router.push('/groups');
    } else {
      window.location.reload();
    }
  };

  const handleDeleteGroup = async () => {
    setLoading('delete');
    setError('');

    const res = await fetch(`/api/groups/${groupId}`, {
      method: 'DELETE',
    });

    const data = await res.json();

    if (!res.ok) {
      setError(data.error ?? '刪除失敗');
      setLoading(null);
      setShowConfirmDelete(false);
      return;
    }

    router.push('/groups');
  };

  const isAdmin = members.find((m) => m.userId === currentUserId)?.role === 'ADMIN';

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 mt-4">
      <h3 className="text-sm font-semibold text-gray-700 mb-3">管理成員</h3>

      {error && (
        <div className="rounded-lg bg-red-50 p-2 text-xs text-red-600 mb-3">{error}</div>
      )}

      <div className="space-y-2 mb-4">
        {members.map((m) => {
          const isSelf = m.userId === currentUserId;
          const canRemove = isSelf || isAdmin;

          return (
            <div key={m.id} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-green-100 text-xs font-semibold text-green-700">
                  {m.user.name?.charAt(0)}
                </div>
                <div>
                  <div className="text-sm font-medium text-gray-900">
                    {m.user.name}
                    {isSelf && <span className="ml-1 text-xs text-gray-400">（你）</span>}
                    {m.role === 'ADMIN' && (
                      <span className="ml-1 text-xs text-green-600">管理員</span>
                    )}
                  </div>
                </div>
              </div>
              {canRemove && (
                <button
                  onClick={() => handleRemoveMember(m.userId, m.user.name)}
                  disabled={loading === m.userId}
                  className={`text-xs px-2 py-1 rounded-lg transition-colors ${
                    isSelf
                      ? 'text-gray-500 border border-gray-200 hover:bg-gray-50'
                      : 'text-red-500 border border-red-200 hover:bg-red-50'
                  } disabled:opacity-60`}
                >
                  {loading === m.userId ? '處理中…' : isSelf ? '離開群組' : '移除'}
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* 刪除群組（只有創建者可以） */}
      {isCreator && (
        <div className="border-t border-gray-100 pt-3">
          {!showConfirmDelete ? (
            <button
              onClick={() => setShowConfirmDelete(true)}
              className="text-xs text-red-400 hover:text-red-600 transition-colors"
            >
              🗑️ 刪除這個群組
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500">確定要刪除整個群組？此操作無法復原！</span>
              <button
                onClick={handleDeleteGroup}
                disabled={loading === 'delete'}
                className="text-xs text-red-500 font-medium hover:underline disabled:opacity-60"
              >
                {loading === 'delete' ? '刪除中…' : '確定刪除'}
              </button>
              <button
                onClick={() => setShowConfirmDelete(false)}
                className="text-xs text-gray-400 hover:underline"
              >
                取消
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}