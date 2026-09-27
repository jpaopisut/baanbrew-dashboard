import { useEffect, useMemo, useState } from "react";
import Papa from "papaparse";
import {
  ResponsiveContainer, LineChart, Line, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from "recharts";
import {
  parseSales, computeKpis, dailyRevenue, revenueByBranch, ordersByHour,
  formatBaht, formatNumber, formatThaiDate,
} from "./lib/metrics.js";

const BRANCH_COLORS = ["#92400e", "#b45309", "#d97706", "#65a30d", "#0f766e"];
const compactBaht = (n) => (n >= 1e6 ? `฿${(n / 1e6).toFixed(1)}M` : n >= 1e3 ? `฿${Math.round(n / 1e3)}k` : `฿${n}`);

export default function App() {
  const [sales, setSales] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    Papa.parse("/sales.csv", {
      download: true,
      header: true,
      skipEmptyLines: true,
      complete: (res) => setSales(parseSales(res.data)),
      error: (err) => setError(err.message),
    });
  }, []);

  const view = useMemo(() => {
    if (!sales) return null;
    return {
      kpis: computeKpis(sales),
      daily: dailyRevenue(sales),
      branches: revenueByBranch(sales),
      hourly: ordersByHour(sales),
    };
  }, [sales]);

  if (error) return <Shell><p className="text-red-700">โหลดข้อมูลไม่สำเร็จ: {error}</p></Shell>;
  if (!view) return <Shell><p className="text-stone-500">กำลังโหลดข้อมูล…</p></Shell>;

  const { kpis, daily, branches, hourly } = view;
  const range = `${formatThaiDate(daily[0].date)} – ${formatThaiDate(daily[daily.length - 1].date)}`;

  return (
    <Shell subtitle={`ข้อมูล ${range}`}>
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <Kpi label="ยอดขายรวม" value={formatBaht(kpis.totalRevenue)} />
        <Kpi label="จำนวนบิล" value={formatNumber(kpis.orderCount)} />
        <Kpi label="ยอดเฉลี่ยต่อบิล" value={formatBaht(kpis.avgOrderValue, 2)} />
        <Kpi label="ลูกค้าสมาชิก (ไม่ซ้ำ)" value={formatNumber(kpis.memberCount)} />
      </section>

      <Card title="ยอดขายรายวัน" note="เส้นจาง = รายวัน · เส้นเข้ม = ค่าเฉลี่ย 7 วัน">
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={daily} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid stroke="#e7e5e4" vertical={false} />
            <XAxis dataKey="date" tickFormatter={formatThaiDate} minTickGap={40} tick={{ fontSize: 12 }} />
            <YAxis tickFormatter={compactBaht} width={56} tick={{ fontSize: 12 }} />
            <Tooltip labelFormatter={formatThaiDate} formatter={(v) => formatBaht(v)} />
            <Line type="monotone" dataKey="revenue" name="รายวัน" stroke="#d6a77a" strokeOpacity={0.45} strokeWidth={1} dot={false} />
            <Line type="monotone" dataKey="ma7" name="เฉลี่ย 7 วัน" stroke="#78350f" strokeWidth={2.5} dot={false} connectNulls />
          </LineChart>
        </ResponsiveContainer>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="ยอดขายแยกสาขา" note="เรียงจากมากไปน้อย">
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={branches} layout="vertical" margin={{ top: 0, right: 16, left: 8, bottom: 0 }}>
              <CartesianGrid stroke="#e7e5e4" horizontal={false} />
              <XAxis type="number" tickFormatter={compactBaht} tick={{ fontSize: 12 }} />
              <YAxis type="category" dataKey="branch" width={84} tick={{ fontSize: 13 }} />
              <Tooltip formatter={(v) => formatBaht(v)} />
              <Bar dataKey="revenue" name="ยอดขาย" fill="#92400e" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card title="จำนวนบิลตามชั่วโมงของวัน" note="การบ้าน · แยกตามสาขา">
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={hourly.data} margin={{ top: 0, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid stroke="#e7e5e4" vertical={false} />
              <XAxis dataKey="hour" tick={{ fontSize: 12 }} />
              <YAxis tickFormatter={formatNumber} width={48} tick={{ fontSize: 12 }} />
              <Tooltip formatter={(v) => formatNumber(v)} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              {hourly.branches.map((b, i) => (
                <Bar key={b} dataKey={b} stackId="h" fill={BRANCH_COLORS[i % BRANCH_COLORS.length]} />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>
    </Shell>
  );
}

function Shell({ subtitle, children }) {
  return (
    <main className="min-h-screen bg-stone-50 text-stone-900 px-4 py-6 sm:p-8">
      <div className="mx-auto max-w-6xl space-y-4 sm:space-y-6">
        <header>
          <h1 className="text-2xl sm:text-3xl font-bold">บ้านบรู Dashboard</h1>
          {subtitle && <p className="mt-1 text-stone-500">{subtitle}</p>}
        </header>
        {children}
      </div>
    </main>
  );
}

function Kpi({ label, value }) {
  return (
    <div className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-stone-200">
      <p className="text-xs sm:text-sm text-stone-500">{label}</p>
      <p className="mt-1 text-xl sm:text-2xl font-semibold tabular-nums">{value}</p>
    </div>
  );
}

function Card({ title, note, children }) {
  return (
    <section className="rounded-xl bg-white p-4 sm:p-5 shadow-sm ring-1 ring-stone-200">
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-x-3">
        <h2 className="font-semibold">{title}</h2>
        {note && <p className="text-xs text-stone-500">{note}</p>}
      </div>
      {children}
    </section>
  );
}
