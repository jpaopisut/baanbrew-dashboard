import { useMemo } from "react";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, LabelList, Cell, Legend,
} from "recharts";
import KpiCard from "../components/KpiCard.jsx";
import { thaiMonth } from "../lab2/lab2Metrics.js";
import { COFFEE, fmtBaht, fmtNum } from "../lib/lab2Shared.js";
import {
  AGE_ORDER, GENDER_ORDER, customerKpis, newMembersByMonth, countBy, orderFrequency,
  recencySegments, membersByBranch, fmtPct,
} from "./customerMetrics.js";

const MUTED = "#C9B8AC";

/** การ์ดกราฟ: หัวข้อ + ข้อความสรุปที่คำนวณจากข้อมูลจริง + กราฟ */
function ChartCard({ title, summary, height = "h-72", children, className = "" }) {
  return (
    <section className={`rounded-xl bg-white p-5 ring-1 ring-stone-200 ${className}`}>
      <h2 className="text-lg font-semibold">{title}</h2>
      <p className="mb-3 text-sm text-stone-600">{summary}</p>
      <div className={height}>
        <ResponsiveContainer width="100%" height="100%">{children}</ResponsiveContainer>
      </div>
    </section>
  );
}

const countTooltip = (v, _n, { payload }) => [`${fmtNum(v)} คน (${fmtPct(payload.share)})`, "สมาชิก"];

export default function CustomersPage({ customers, rows }) {
  const k = useMemo(() => customerKpis(customers, rows), [customers, rows]);
  const monthly = useMemo(() => newMembersByMonth(customers), [customers]);
  const ages = useMemo(() => countBy(customers, "age_group", AGE_ORDER), [customers]);
  const genders = useMemo(() => countBy(customers, "gender", GENDER_ORDER), [customers]);
  const freq = useMemo(() => orderFrequency(customers), [customers]);
  const recency = useMemo(() => recencySegments(customers), [customers]);
  const branches = useMemo(() => membersByBranch(customers), [customers]);

  // ข้อความสรุป: คำนวณทุกค่า ไม่พิมพ์ตัวเลขตายตัว
  const full = monthly.filter((m) => !m.partial);
  const avg = (arr) => arr.reduce((s, m) => s + m.members, 0) / arr.length;
  const first6 = avg(full.slice(0, 6)), last6 = avg(full.slice(-6));
  const partial = monthly.find((m) => m.partial);
  const topAge = [...ages].sort((a, b) => b.count - a.count)[0];
  const young = ages.filter((a) => ["18-24", "25-34"].includes(a.name)).reduce((s, a) => s + a.share, 0);
  const never = freq[0];
  const loyal = freq[freq.length - 1];
  const lapsed = recency.find((r) => r.name.startsWith("หายไป"));
  const lowAct = [...branches].sort((a, b) => a.activation - b.activation)[0];
  const women = genders.find((g) => g.name === "หญิง");

  return (
    <div>
      <header className="mb-6">
        <h1 className="text-3xl font-bold" style={{ color: COFFEE }}>บ้านบรู · ลูกค้าสมาชิก</h1>
        <p className="text-stone-500">
          สมาชิก {fmtNum(k.total)} คน · ข้อมูลจาก customers_clean.csv (ผ่าน profiling และทำความสะอาดใน Colab แล้ว)
        </p>
      </header>

      <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard label="สมาชิกทั้งหมด" value={fmtNum(k.total)} note={`ผู้เยาว์ (< 18) ${fmtNum(k.minors)} คน`} />
        <KpiCard label="เคยซื้อแล้ว" value={fmtPct(k.activation)} note={`${fmtNum(k.buyers)} คน · อีก ${fmtNum(k.total - k.buyers)} คนยังไม่เคยซื้อ`} />
        <KpiCard label="ยอดซื้อเฉลี่ยต่อสมาชิก" value={fmtBaht(k.revenuePerBuyer)} note={`เฉลี่ย ${k.ordersPerBuyer.toFixed(1)} บิล/คน (เฉพาะคนที่เคยซื้อ)`} />
        <KpiCard label="ยอดขายจากสมาชิก" value={fmtPct(k.memberShare)} note="ของยอดขายทั้งหมด ที่เหลือคือ walk-in" />
      </section>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <ChartCard
          className="lg:col-span-2"
          title="สมาชิกใหม่รายเดือน"
          summary={`สมัครเฉลี่ย ${last6.toFixed(0)} คน/เดือนใน 6 เดือนล่าสุด เพิ่มจาก ${first6.toFixed(0)} คน/เดือนใน 6 เดือนแรก (+${fmtPct(last6 / first6 - 1)})${partial ? ` · ${thaiMonth(partial.month)} ยังไม่ครบเดือน (แท่งจาง)` : ""}`}
        >
          <BarChart data={monthly} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
            <CartesianGrid stroke="#eee" vertical={false} />
            <XAxis dataKey="month" tickFormatter={thaiMonth} interval={1} tick={{ fontSize: 11 }} />
            <YAxis width={40} tick={{ fontSize: 12 }} />
            <Tooltip labelFormatter={thaiMonth} formatter={(v, _n, { payload }) => [`${fmtNum(v)} คน${payload.partial ? " (ข้อมูลไม่ครบเดือน)" : ""}`, "สมาชิกใหม่"]} />
            <Bar dataKey="members" isAnimationActive={false} radius={[3, 3, 0, 0]}>
              {monthly.map((m) => <Cell key={m.month} fill={m.partial ? MUTED : COFFEE} />)}
            </Bar>
          </BarChart>
        </ChartCard>

        <ChartCard
          title="ช่วงอายุ"
          summary={`กลุ่มใหญ่สุดคือ ${topAge.name} ปี (${fmtPct(topAge.share)}) · อายุ 18–34 รวม ${fmtPct(young)} · ผู้หญิง ${fmtPct(women.share)} ของสมาชิก`}
        >
          <BarChart data={ages} margin={{ top: 20, right: 10, left: 0, bottom: 0 }}>
            <CartesianGrid stroke="#eee" vertical={false} />
            <XAxis dataKey="name" tick={{ fontSize: 12 }} />
            <YAxis width={40} tick={{ fontSize: 12 }} />
            <Tooltip formatter={countTooltip} />
            <Bar dataKey="count" fill={COFFEE} isAnimationActive={false} radius={[3, 3, 0, 0]}>
              <LabelList dataKey="share" position="top" formatter={fmtPct} style={{ fontSize: 11, fill: "#44403c" }} />
            </Bar>
          </BarChart>
        </ChartCard>

        <ChartCard
          title="จำนวนครั้งที่ซื้อ"
          summary={`${fmtNum(never.count)} คน (${fmtPct(never.share)}) สมัครแล้วไม่เคยซื้อ ซึ่งเป็นกลุ่มเป้าหมายของคูปองซื้อครั้งแรก · ขาประจำ 10+ ครั้งมี ${fmtPct(loyal.share)}`}
        >
          <BarChart data={freq} margin={{ top: 20, right: 10, left: 0, bottom: 0 }}>
            <CartesianGrid stroke="#eee" vertical={false} />
            <XAxis dataKey="name" tick={{ fontSize: 12 }} />
            <YAxis width={40} tick={{ fontSize: 12 }} />
            <Tooltip formatter={countTooltip} />
            <Bar dataKey="count" isAnimationActive={false} radius={[3, 3, 0, 0]}>
              {freq.map((f, i) => <Cell key={f.name} fill={i === 0 ? MUTED : COFFEE} />)}
              <LabelList dataKey="count" position="top" formatter={fmtNum} style={{ fontSize: 11, fill: "#44403c" }} />
            </Bar>
          </BarChart>
        </ChartCard>

        <ChartCard
          title="สถานะลูกค้าตามการซื้อล่าสุด"
          summary={`นับถึง 20 ก.ย. 69: ${fmtNum(lapsed.count)} คน (${fmtPct(lapsed.share)}) ไม่ได้กลับมาซื้อเกิน 90 วัน ควรทำแคมเปญดึงกลับ`}
        >
          <BarChart data={recency} layout="vertical" margin={{ top: 0, right: 90, left: 0, bottom: 0 }}>
            <XAxis type="number" hide domain={[0, "dataMax"]} />
            <YAxis type="category" dataKey="name" width={140} tick={{ fontSize: 12 }} />
            <Tooltip formatter={countTooltip} />
            <Bar dataKey="count" isAnimationActive={false} radius={[0, 4, 4, 0]}>
              {recency.map((r) => <Cell key={r.name} fill={r === lapsed ? COFFEE : MUTED} />)}
              <LabelList dataKey="count" position="right"
                         content={({ x, y, width, height, index }) => (
                           <text x={x + width + 6} y={y + height / 2 + 4} fill="#44403c" fontSize={12}>
                             {fmtNum(recency[index].count)} · {fmtPct(recency[index].share)}
                           </text>
                         )} />
            </Bar>
          </BarChart>
        </ChartCard>

        <ChartCard
          title="สมาชิกต่อสาขาประจำ"
          summary={`${lowAct.branch} มีสัดส่วนสมาชิกที่เคยซื้อต่ำสุด (${fmtPct(lowAct.activation)}) · อารีย์เพิ่งเปิด 1 พ.ย. 68 สมาชิกจึงน้อยกว่า`}
        >
          <BarChart data={branches} layout="vertical" margin={{ top: 0, right: 60, left: 0, bottom: 0 }}>
            <CartesianGrid stroke="#eee" horizontal={false} />
            <XAxis type="number" tick={{ fontSize: 12 }} />
            <YAxis type="category" dataKey="branch" width={90} tick={{ fontSize: 13 }} />
            <Tooltip formatter={(v, name, { payload }) => [`${fmtNum(v)} คน`, name === "buyers" ? `เคยซื้อ (${fmtPct(payload.activation)})` : "ยังไม่เคยซื้อ"]} />
            <Legend formatter={(v) => (v === "buyers" ? "เคยซื้อ" : "ยังไม่เคยซื้อ")} wrapperStyle={{ fontSize: 12 }} />
            <Bar dataKey="buyers" stackId="a" fill={COFFEE} isAnimationActive={false} />
            <Bar dataKey="never" stackId="a" fill={MUTED} isAnimationActive={false} radius={[0, 4, 4, 0]}>
              <LabelList dataKey="total" position="right" formatter={fmtNum} style={{ fontSize: 12, fill: "#44403c" }} />
            </Bar>
          </BarChart>
        </ChartCard>
      </div>

      <p className="mt-6 text-xs text-stone-400">
        PDPA: หน้านี้ไม่แสดงและไม่ได้โหลดเบอร์โทรหรือชื่อเล่นของลูกค้า ตัดออกตั้งแต่ขั้นทำความสะอาดข้อมูลตามหลัก Data Minimization
      </p>
    </div>
  );
}
