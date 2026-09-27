// Logic คำนวณทั้งหมดของ Dashboard อยู่ในไฟล์นี้
// หลักสำคัญ: 1 แถว = 1 รายการสินค้า, 1 บิล = order_id ที่ไม่ซ้ำ, ยอดขาย = qty × unit_price

const THAI_MONTHS = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];

// แปลงแถวดิบจาก PapaParse: qty / unit_price เป็น Number, customer_id ว่างเป็น null
// และดึงวันที่/ชั่วโมงจากสตริงตรง ๆ (ไม่ผ่าน new Date เพื่อไม่ให้เลื่อนไปเป็นเวลา UTC)
export function parseSales(rows) {
  return rows
    .filter((r) => r.order_id)
    .map((r) => {
      const qty = Number(r.qty);
      const unitPrice = Number(r.unit_price);
      return {
        orderId: r.order_id,
        date: r.datetime.slice(0, 10), // "2025-04-01"
        hour: Number(r.datetime.slice(11, 13)), // 18
        branch: r.branch,
        customerId: r.customer_id?.trim() || null,
        revenue: qty * unitPrice,
      };
    });
}

// KPI 4 ตัว
export function computeKpis(sales) {
  let totalRevenue = 0;
  const orderIds = new Set();
  const memberIds = new Set();

  for (const s of sales) {
    totalRevenue += s.revenue;
    orderIds.add(s.orderId);
    if (s.customerId) memberIds.add(s.customerId);
  }

  const orderCount = orderIds.size;
  return {
    totalRevenue,
    orderCount,
    avgOrderValue: orderCount ? totalRevenue / orderCount : 0,
    memberCount: memberIds.size,
  };
}

// ยอดขายรายวัน + ค่าเฉลี่ยเคลื่อนที่ 7 วัน (วันนั้น + 6 วันก่อนหน้า)
// วันที่ไม่มีการขายจะถูกเติมเป็น 0 เพื่อให้ค่าเฉลี่ย 7 วันนับตามปฏิทินจริง
export function dailyRevenue(sales) {
  const byDate = new Map();
  for (const s of sales) byDate.set(s.date, (byDate.get(s.date) ?? 0) + s.revenue);
  if (byDate.size === 0) return [];

  const dates = [...byDate.keys()].sort();
  const days = [];
  for (let d = dates[0]; d <= dates[dates.length - 1]; d = nextDate(d)) {
    days.push({ date: d, revenue: byDate.get(d) ?? 0 });
  }

  let windowSum = 0;
  return days.map((day, i) => {
    windowSum += day.revenue;
    if (i >= 7) windowSum -= days[i - 7].revenue;
    return { ...day, ma7: i >= 6 ? windowSum / 7 : null };
  });
}

// ยอดขายรวมแยกสาขา เรียงจากมากไปน้อย
export function revenueByBranch(sales) {
  const byBranch = new Map();
  for (const s of sales) byBranch.set(s.branch, (byBranch.get(s.branch) ?? 0) + s.revenue);
  return [...byBranch]
    .map(([branch, revenue]) => ({ branch, revenue }))
    .sort((a, b) => b.revenue - a.revenue);
}

// (การบ้าน) จำนวนบิลตามชั่วโมงของวัน แยกสาขา
// นับ order_id ไม่ซ้ำต่อชั่วโมง ไม่ใช่นับแถว
export function ordersByHour(sales) {
  const branches = [...new Set(sales.map((s) => s.branch))];
  const hours = new Map(); // hour -> Map(branch -> Set(orderId))
  for (const s of sales) {
    if (!hours.has(s.hour)) hours.set(s.hour, new Map());
    const perBranch = hours.get(s.hour);
    if (!perBranch.has(s.branch)) perBranch.set(s.branch, new Set());
    perBranch.get(s.branch).add(s.orderId);
  }
  const data = [...hours.keys()].sort((a, b) => a - b).map((hour) => {
    const row = { hour: `${String(hour).padStart(2, "0")}:00`, total: 0 };
    for (const b of branches) {
      row[b] = hours.get(hour).get(b)?.size ?? 0;
      row.total += row[b];
    }
    return row;
  });
  return { data, branches };
}

// ---------- การจัดรูปแบบตัวเลข / วันที่ ----------

export const formatBaht = (n, decimals = 0) =>
  `฿${n.toLocaleString("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}`;
export const formatNumber = (n) => Math.round(n).toLocaleString("en-US");

// "2025-04-01" -> "1 เม.ย. 68" (ปี พ.ศ. 2 หลัก)
export function formatThaiDate(iso) {
  const [y, m, d] = iso.split("-").map(Number);
  return `${d} ${THAI_MONTHS[m - 1]} ${String(y + 543).slice(-2)}`;
}

function nextDate(iso) {
  const [y, m, d] = iso.split("-").map(Number);
  const next = new Date(Date.UTC(y, m - 1, d + 1));
  return next.toISOString().slice(0, 10); // ใช้ UTC ทั้งไปและกลับ จึงไม่เลื่อนวัน
}
