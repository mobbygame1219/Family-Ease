'use client';

import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const categoryLabel: Record<string, string> = {
  FOOD: '🍕 餐飲',
  TRANSPORT: '🚗 交通',
  ACCOMMODATION: '🏨 住宿',
  ENTERTAINMENT: '🎮 娛樂',
  UTILITIES: '💡 水電',
  SHOPPING: '🛍️ 購物',
  HEALTH: '🏥 醫療',
  OTHER: '📦 其他',
};

const COLORS = [
  '#22c55e', '#3b82f6', '#f59e0b', '#ef4444',
  '#8b5cf6', '#06b6d4', '#f97316', '#6b7280',
];

interface Props {
  data: { category: string; _sum: { amount: number | null } }[];
}

export default function ExpenseChart({ data }: Props) {
  const chartData = data.map((d) => ({
    name: categoryLabel[d.category] ?? d.category,
    value: d._sum.amount ?? 0,
  }));

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6">
      <ResponsiveContainer width="100%" height={300}>
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={110}
            paddingAngle={3}
            dataKey="value"
          >
            {chartData.map((_, index) => (
              <Cell key={index} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip
            formatter={(value: number) =>
              `$${value.toLocaleString('zh-TW', { minimumFractionDigits: 0 })}`
            }
          />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}