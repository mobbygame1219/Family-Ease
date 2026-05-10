import { formatDistanceToNow } from 'date-fns';
import { zhTW } from 'date-fns/locale';

interface Activity {
  id: string;
  type: string;
  message: string;
  createdAt: Date;
  user: { id: string; name: string };
  group: { id: string; name: string };
}

const typeIcon: Record<string, string> = {
  EXPENSE_ADDED: '🧾',
  EXPENSE_DELETED: '🗑️',
  SETTLEMENT: '✅',
  MEMBER_JOINED: '👋',
};

export default function ActivityFeed({ activities }: { activities: Activity[] }) {
  if (activities.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-gray-300 p-8 text-center">
        <p className="text-gray-400 text-sm">還沒有任何動態</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white divide-y divide-gray-100">
      {activities.map((a) => (
        <div key={a.id} className="flex items-start gap-3 p-4">
          <div className="text-xl flex-shrink-0 mt-0.5">
            {typeIcon[a.type] ?? '📌'}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm text-gray-900">
              <span className="font-medium">{a.user.name}</span>
              {' '}{a.message}
            </div>
            <div className="text-xs text-gray-400 mt-0.5">
              {a.group.name} · {formatDistanceToNow(new Date(a.createdAt), { locale: zhTW, addSuffix: true })}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}