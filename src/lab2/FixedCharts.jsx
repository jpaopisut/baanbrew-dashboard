// Lab 2.2 · กราฟที่ซ่อมแล้ว
// แต่ละกราฟเป็น component ชื่อ FixedChart1 … FixedChart5 ที่รับ props { rows, products }
// หลักการร่วม: สีหลักสีเดียว, แกนเริ่มที่ 0, ตัวเลขมี ฿ และจุลภาค,
// ข้อความสรุปเหนือกราฟคำนวณจากข้อมูลจริงทุกครั้ง (ไม่พิมพ์ตัวเลขตายตัว)
import { useMemo } from "react";
import {
  ResponsiveContainer, BarChart, Bar, LineChart, Line, XAxis, YAxis,
  CartesianGrid, Tooltip, LabelList, Cell,
} from "recharts";
import {
  revenueByProduct, monthlyRevenue, branchPerformance, weeklyRevenue, daysInMonth, thaiMonth,
} from "./lab2Metrics.js";
import { fmtBaht, fmtShortBaht, COFFEE, thaiDate } from "../lib/lab2Shared.js";

const MUTED = "#C9B8AC"; // สีเดียวกันแต่จาง ใช้กับข้อมูลที่ "ไม่ครบ" หรือไม่ใช่จุดเด่น
const pct = (x) => `${(x * 100).toFixed(1)}%`;

/** กล่องมาตรฐาน: ข้อความสรุป 1 บรรทัด + กราฟเต็มพื้นที่ที่เหลือ */
function Frame({ summary, children }) {
  return (
    <div className="flex h-full flex-col">
      <p className="mb-2 text-sm font-medium text-stone-800">{summary}</p>
      <div className="min-h-0 flex-1">
        <ResponsiveContainer width="100%" height="100%">{children}</ResponsiveContainer>
      </div>
    </div>
  );
}

/**
 * กราฟ 1: เมนูไหนทำเงินมากที่สุด
 * pie 40 ชิ้นเทียบขนาดด้วยตาไม่ได้ และต้องจำสีกับ legend → ใช้แท่งแนวนอน Top 10 เรียงมากไปน้อย
 * ชื่อเมนูอยู่ติดแท่งเลย ไม่ต้องใช้สีแยกเมนู
 */
export function FixedChart1({ rows, products }) {
  const all = useMemo(() => revenueByProduct(rows, products), [rows, products]);
  const top = all.slice(0, 10);
  const topShare = top.reduce((s, d) => s + d.share, 0);
  return (
    <Frame
      summary={`${top[0].name} ทำเงินสูงสุด ${fmtBaht(top[0].revenue)} (${pct(top[0].share)}) · 10 เมนูแรกรวม ${pct(topShare)} ของยอดขายทั้งหมด`}
    >
      <BarChart data={top} layout="vertical" margin={{ top: 0, right: 110, left: 0, bottom: 0 }}>
        <XAxis type="number" hide domain={[0, "dataMax"]} />
        <YAxis type="category" dataKey="name" width={140} tick={{ fontSize: 12 }} interval={0} />
        <Tooltip formatter={(v) => [fmtBaht(v), "ยอดขาย"]} />
        <Bar dataKey="revenue" isAnimationActive={false} radius={[0, 4, 4, 0]}>
          {top.map((d, i) => <Cell key={d.id} fill={i === 0 ? COFFEE : MUTED} />)}
          <LabelList dataKey="revenue" position="right"
                     formatter={(v) => `${fmtBaht(v)} · ${pct(v / all.reduce((s, d) => s + d.revenue, 0))}`}
                     style={{ fontSize: 11, fill: "#44403c" }} />
        </Bar>
      </BarChart>
    </Frame>
  );
}

/**
 * กราฟ 2: สาขาต่าง ๆ ขายได้ต่างกันแค่ไหน
 * แกนเดิมเริ่มที่ 500,000 ทำให้ความต่างดูเกินจริง + สีรุ้ง + เรียงตามตัวอักษร
 * → แกนเริ่มที่ 0, สีเดียว, เรียงมากไปน้อย, มีตัวเลขบนแท่ง
 */
export function FixedChart2({ rows }) {
  const data = useMemo(() => branchPerformance(rows).sort((a, b) => b.revenue - a.revenue), [rows]);
  const hi = data[0], lo = data[data.length - 1];
  return (
    <Frame
      summary={`${hi.branch} ขายได้สูงสุด ${fmtBaht(hi.revenue)} เป็น ${(hi.revenue / lo.revenue).toFixed(1)} เท่าของ${lo.branch} (${fmtBaht(lo.revenue)}) ซึ่งเปิดมาแค่ ${lo.days} วัน`}
    >
      <BarChart data={data} layout="vertical" margin={{ top: 0, right: 90, left: 0, bottom: 0 }}>
        <CartesianGrid stroke="#eee" horizontal={false} />
        <XAxis type="number" domain={[0, "dataMax"]} tickFormatter={fmtShortBaht} tick={{ fontSize: 12 }} />
        <YAxis type="category" dataKey="branch" width={90} tick={{ fontSize: 13 }} />
        <Tooltip formatter={(v) => [fmtBaht(v), "ยอดขายรวม"]} />
        <Bar dataKey="revenue" fill={COFFEE} isAnimationActive={false} radius={[0, 4, 4, 0]}>
          <LabelList dataKey="revenue" position="right" formatter={fmtBaht} style={{ fontSize: 12, fill: "#44403c" }} />
        </Bar>
      </BarChart>
    </Frame>
  );
}

/**
 * กราฟ 3: ยอดขายโดยรวมโตขึ้นหรือลดลง
 * รายวัน 538 จุดมีสัญญาณรบกวน (วันหยุด/วันธรรมดา) บังแนวโน้ม → รวมเป็นรายสัปดาห์
 * (ตัดสัปดาห์ที่ไม่ครบ 7 วัน) เส้นบาง ไม่มีจุด วันที่ภาษาไทยแบบย่อ
 */
export function FixedChart3({ rows }) {
  const data = useMemo(() => weeklyRevenue(rows), [rows]);
  const avg = (arr) => arr.reduce((s, d) => s + d.revenue, 0) / arr.length;
  const first = avg(data.slice(0, 4)), last = avg(data.slice(-4));
  const growth = last / first - 1;
  return (
    <Frame
      summary={`ยอดขายต่อสัปดาห์${growth >= 0 ? "โตขึ้น" : "ลดลง"} ${pct(Math.abs(growth))}: เฉลี่ย 4 สัปดาห์แรก ${fmtBaht(first)} → 4 สัปดาห์ล่าสุด ${fmtBaht(last)}`}
    >
      <LineChart data={data} margin={{ top: 5, right: 15, left: 5, bottom: 0 }}>
        <CartesianGrid stroke="#eee" vertical={false} />
        <XAxis dataKey="week" tickFormatter={thaiDate} minTickGap={50} tick={{ fontSize: 12 }} />
        <YAxis domain={[0, "auto"]} tickFormatter={fmtShortBaht} width={55} tick={{ fontSize: 12 }} />
        <Tooltip labelFormatter={(w) => `สัปดาห์เริ่ม ${thaiDate(w)}`} formatter={(v) => [fmtBaht(v), "ยอดขาย"]} />
        <Line dataKey="revenue" stroke={COFFEE} strokeWidth={2} dot={false} isAnimationActive={false} />
      </LineChart>
    </Frame>
  );
}

/**
 * กราฟ 4: เดือนล่าสุดยอดตกจริงไหม
 * เดือนล่าสุดมีข้อมูลไม่ครบเดือน ยอดรวมจึงต่ำโดยธรรมชาติ → ใช้ "ยอดเฉลี่ยต่อวัน"
 * และทำแท่งเดือนที่ไม่ครบให้จางพร้อมบอกจำนวนวัน
 */
export function FixedChart4({ rows }) {
  const data = useMemo(
    () => monthlyRevenue(rows).map((m) => ({ ...m, full: daysInMonth(m.month), partial: m.days < daysInMonth(m.month) })),
    [rows]
  );
  const last = data[data.length - 1], prev = data[data.length - 2];
  const change = last.perDay / prev.perDay - 1;
  return (
    <Frame
      summary={`${thaiMonth(last.month)} มีข้อมูลแค่ ${last.days}/${last.full} วัน · ยอดเฉลี่ยต่อวัน ${fmtBaht(last.perDay)} ${change >= 0 ? "สูงกว่า" : "ต่ำกว่า"} ${thaiMonth(prev.month)} ${pct(Math.abs(change))} ${Math.abs(change) < 0.05 ? "ยอดไม่ได้ตกจริง" : ""}`}
    >
      <BarChart data={data} margin={{ top: 20, right: 10, left: 5, bottom: 0 }}>
        <CartesianGrid stroke="#eee" vertical={false} />
        <XAxis dataKey="month" tickFormatter={thaiMonth} interval={1} tick={{ fontSize: 11 }} />
        <YAxis tickFormatter={fmtShortBaht} width={55} tick={{ fontSize: 12 }} />
        <Tooltip
          labelFormatter={thaiMonth}
          formatter={(v, _n, { payload }) => [`${fmtBaht(v)} / วัน (ข้อมูล ${payload.days}/${payload.full} วัน · รวม ${fmtBaht(payload.revenue)})`, "ยอดเฉลี่ยต่อวัน"]}
        />
        <Bar dataKey="perDay" isAnimationActive={false} radius={[3, 3, 0, 0]}>
          {data.map((d) => <Cell key={d.month} fill={d.partial ? MUTED : COFFEE} />)}
          <LabelList dataKey="perDay" position="top"
                     content={({ x, y, width, index }) => data[index].partial ? (
                       <text x={x + width / 2} y={y - 6} textAnchor="middle" fill="#78716c" fontSize={11}>
                         {data[index].days}/{data[index].full} วัน
                       </text>
                     ) : null} />
        </Bar>
      </BarChart>
    </Frame>
  );
}

/**
 * กราฟ 5: ผู้จัดการสาขาไหนควรได้รับการพัฒนา
 * ยอดรวมไม่ยุติธรรม เพราะสาขาเปิดขายไม่เท่ากัน (อารีย์เพิ่งเปิด) → ใช้ "ยอดเฉลี่ยต่อวันที่เปิดขาย"
 * ไม่ใส่ป้าย "แย่ที่สุด" เพราะยังต้องดูปัจจัยอื่น เช่น ทำเลและประเภทสาขา
 */
export function FixedChart5({ rows }) {
  const data = useMemo(() => branchPerformance(rows).sort((a, b) => b.perDay - a.perDay), [rows]);
  const lo = data[data.length - 1];
  const byRevenue = [...data].sort((a, b) => a.revenue - b.revenue)[0];
  return (
    <Frame
      summary={`เทียบยอดเฉลี่ยต่อวัน: ${lo.branch} ต่ำสุด ${fmtBaht(lo.perDay)}/วัน · ${byRevenue.branch} ที่ยอดรวมต่ำสุดจริง ๆ ขายได้ ${fmtBaht(byRevenue.perDay)}/วัน (เปิด ${byRevenue.days} วัน)`}
    >
      <BarChart data={data} layout="vertical" margin={{ top: 0, right: 130, left: 0, bottom: 0 }}>
        <CartesianGrid stroke="#eee" horizontal={false} />
        <XAxis type="number" domain={[0, "dataMax"]} tickFormatter={fmtShortBaht} tick={{ fontSize: 12 }} />
        <YAxis type="category" dataKey="branch" width={90} tick={{ fontSize: 13 }} />
        <Tooltip formatter={(v, _n, { payload }) => [`${fmtBaht(v)} / วัน (เปิด ${payload.days} วัน · รวม ${fmtBaht(payload.revenue)})`, "ยอดเฉลี่ยต่อวัน"]} />
        <Bar dataKey="perDay" fill={COFFEE} isAnimationActive={false} radius={[0, 4, 4, 0]}>
          <LabelList dataKey="perDay" position="right"
                     content={({ x, y, width, height, index }) => (
                       <text x={x + width + 6} y={y + height / 2 + 4} fill="#44403c" fontSize={12}>
                         {fmtBaht(data[index].perDay)}/วัน · {data[index].days} วัน
                       </text>
                     )} />
        </Bar>
      </BarChart>
    </Frame>
  );
}
