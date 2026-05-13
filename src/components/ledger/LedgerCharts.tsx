'use client';

import {
  PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer,
  LineChart, Line, XAxis, YAxis, CartesianGrid,
} from 'recharts';
import { CATEGORY_META } from '@/lib/ledger';

interface CategoryData {
  category: string;
  total: number;
}

interface DailyData {
  date: string;
  total: number;
}

interface Props {
  categoryData: CategoryData[];
  dailyData: DailyData[];
}

export default function LedgerCharts({ categoryData, dailyData }: Props) {
  const pieData = categoryData.map((d) => ({
    name: CATEGORY_META[d.category]?.label ?? d.category,
    value: d.total,
    color: CATEGORY_META[d.category]?.color ?? '#6b7280',
  }));

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* 圓餅圖 */}
      <div className="rounded-xl border bg-card p-5">
        <h3 className="text-sm font-semibold text-foreground mb-4">類別分析</h3>
        {pieData.length === 0 ? (
          <div className="flex items-center justify-center h-48 text-muted-foreground text-sm">
            尚無資料
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                innerRadius={55}
                outerRadius={90}
                paddingAngle={3}
                dataKey="value"
              >
                {pieData.map((entry, index) => (
                  <Cell key={index} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                formatter={(value) =>
                  `$${Number(value).toLocaleString('zh-TW', { minimumFractionDigits: 0 })}`
                }
              />
              <Legend
                formatter={(value) => (
                  <span className="text-xs text-foreground">{value}</span>
                )}
              />
            </PieChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* 折線圖 */}
      <div className="rounded-xl border bg-card p-5">
        <h3 className="text-sm font-semibold text-foreground mb-4">每日支出趨勢</h3>
        {dailyData.length === 0 ? (
          <div className="flex items-center justify-center h-48 text-muted-foreground text-sm">
            尚無資料
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={dailyData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                tickFormatter={(v) => v.slice(5)} // MM-DD
              />
              <YAxis
                tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                tickFormatter={(v) => `$${v}`}
              />
              <Tooltip
                formatter={(value) =>
                  [`$${Number(value).toLocaleString('zh-TW')}`, '支出']
                }
                labelFormatter={(label) => label}
              />
              <Line
                type="monotone"
                dataKey="total"
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                dot={{ fill: 'hsl(var(--primary))', r: 3 }}
                activeDot={{ r: 5 }}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
