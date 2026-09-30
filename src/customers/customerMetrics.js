// ฟังก์ชันคำนวณของแท็บ "ลูกค้า" · ข้อมูลมาจาก public/customers_clean.csv
// (ผลลัพธ์จากการบ้านที่ 2: profiling + cleaning ใน Colab ตัด phone / nickname ออกแล้วตาม PDPA)

export const AGE_ORDER = ["ต่ำกว่า 18", "18-24", "25-34", "35-44", "45-54", "55+"];
export const GENDER_ORDER = ["หญิง", "ชาย", "ไม่ระบุ"];
export const DATA_END = "2026-09-20";

/** แปลงแถวดิบจาก CSV (ทุกค่าเป็นข้อความ) เป็นชนิดที่ใช้คำนวณได้ */
export function prepareCustomers(rows) {
  return rows
    .filter((r) => r.customer_id)
    .map((r) => ({
      ...r,
      orders: Number(r.orders),
      revenue: Number(r.revenue),
      hasPurchase: r.has_purchase === "True",
      isMinor: r.is_minor === "True",
      recency: r.recency_days === "" ? null : Number(r.recency_days),
    }));
}

/** KPI ของสมาชิก: ใช้ sales rows เพื่อหาสัดส่วนยอดขายที่มาจากสมาชิก */
export function customerKpis(customers, salesRows) {
  const total = customers.length;
  const buyers = customers.filter((c) => c.hasPurchase);
  const memberRevenue = buyers.reduce((s, c) => s + c.revenue, 0);
  const allRevenue = salesRows.reduce((s, r) => s + r.revenue, 0);
  const memberOrders = buyers.reduce((s, c) => s + c.orders, 0);
  return {
    total,
    buyers: buyers.length,
    activation: buyers.length / total,
    revenuePerBuyer: memberRevenue / buyers.length,
    ordersPerBuyer: memberOrders / buyers.length,
    memberShare: memberRevenue / allRevenue,
    minors: customers.filter((c) => c.isMinor).length,
  };
}

/** สมาชิกใหม่ต่อเดือน พร้อม flag เดือนที่ข้อมูลไม่ครบ (เดือนของ DATA_END) */
export function newMembersByMonth(customers) {
  const map = new Map();
  for (const c of customers) map.set(c.join_month, (map.get(c.join_month) ?? 0) + 1);
  const endMonth = DATA_END.slice(0, 7);
  return [...map.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, members]) => ({ month, members, partial: month === endMonth }));
}

/** นับตามคอลัมน์หมวดหมู่ เรียงตามลำดับที่กำหนด */
export function countBy(customers, key, order) {
  const map = new Map(order.map((k) => [k, 0]));
  for (const c of customers) map.set(c[key], (map.get(c[key]) ?? 0) + 1);
  return [...map.entries()].map(([name, count]) => ({ name, count, share: count / customers.length }));
}

/** การกระจายจำนวนครั้งที่ซื้อ (0 = สมัครแล้วไม่เคยซื้อ) */
export function orderFrequency(customers) {
  const bins = [
    { name: "ไม่เคยซื้อ", test: (n) => n === 0 },
    { name: "1 ครั้ง", test: (n) => n === 1 },
    { name: "2–3 ครั้ง", test: (n) => n >= 2 && n <= 3 },
    { name: "4–9 ครั้ง", test: (n) => n >= 4 && n <= 9 },
    { name: "10+ ครั้ง", test: (n) => n >= 10 },
  ];
  return bins.map((b) => {
    const count = customers.filter((c) => b.test(c.orders)).length;
    return { name: b.name, count, share: count / customers.length };
  });
}

/** สถานะลูกค้าตามวันที่ซื้อล่าสุด (Recency) นับถึงวันสุดท้ายของข้อมูล */
export function recencySegments(customers) {
  const segs = [
    { name: "Active (≤ 30 วัน)", test: (c) => c.recency !== null && c.recency <= 30 },
    { name: "เริ่มห่าง (31–90 วัน)", test: (c) => c.recency !== null && c.recency > 30 && c.recency <= 90 },
    { name: "หายไป (> 90 วัน)", test: (c) => c.recency !== null && c.recency > 90 },
    { name: "ไม่เคยซื้อ", test: (c) => c.recency === null },
  ];
  return segs.map((s) => {
    const count = customers.filter(s.test).length;
    return { name: s.name, count, share: count / customers.length };
  });
}

/** สมาชิกต่อสาขาประจำ แยกคนที่เคยซื้อ / ไม่เคยซื้อ และอัตราการเปลี่ยนเป็นผู้ซื้อ */
export function membersByBranch(customers) {
  const map = new Map();
  for (const c of customers) {
    const cur = map.get(c.home_branch) ?? { branch: c.home_branch, buyers: 0, never: 0 };
    c.hasPurchase ? cur.buyers++ : cur.never++;
    map.set(c.home_branch, cur);
  }
  return [...map.values()]
    .map((b) => ({ ...b, total: b.buyers + b.never, activation: b.buyers / (b.buyers + b.never) }))
    .sort((a, b) => b.total - a.total);
}

export const fmtPct = (x) => `${(x * 100).toFixed(1)}%`;
