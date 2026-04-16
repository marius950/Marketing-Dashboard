'use client';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { DailyData } from '@/lib/types';

interface SpendChartProps {
  data: DailyData[];
  dataKey?: string;
  color?: string;
  title: string;
  yLabel?: string;
}

const fmt = (v: number) => v >= 1000 ? `${(v / 1000).toFixed(1)}k` : v.toFixed(0);

export default function SpendChart({ data, dataKey = 'spend', color = '#156949', title, yLabel }: SpendChartProps) {
  return (
    <div style={{
      background: '#fff', borderRadius: 12, padding: '20px 24px',
      border: '1px solid var(--effi-border)',
      boxShadow: '0 1px 4px rgba(0,0,0,.06)',
    }}>
      <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 16, color: 'var(--effi-black)' }}>
        {title}
      </div>
      <div style={{ height: 200 }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id={`grad-${dataKey}-${color.replace(/[^a-z0-9]/gi,'')}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor={color} stopOpacity={0.15} />
                <stop offset="95%" stopColor={color} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--effi-border)" />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 10, fill: 'var(--effi-neutral)' }}
              tickFormatter={v => v ? v.slice(5) : ''}
              interval="preserveStartEnd"
              axisLine={false} tickLine={false}
            />
            <YAxis
              tick={{ fontSize: 10, fill: 'var(--effi-neutral)' }}
              tickFormatter={v => yLabel ? `${fmt(v)}${yLabel}` : `\u20ac${fmt(v)}`}
              axisLine={false} tickLine={false} width={52}
            />
            <Tooltip
              contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid var(--effi-border)' }}
              formatter={(v: any) => [yLabel ? `${Number(v).toFixed(2)}${yLabel}` : `\u20ac${Number(v).toFixed(2)}`, dataKey]}
              labelFormatter={l => `\uD83D\uDCC5 ${l}`}
            />
            <Area
              type="monotone" dataKey={dataKey}
              stroke={color} strokeWidth={2}
              fill={`url(#grad-${dataKey}-${color.replace(/[^a-z0-9]/gi,'')})`}
              dot={false} activeDot={{ r: 4, fill: color }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
