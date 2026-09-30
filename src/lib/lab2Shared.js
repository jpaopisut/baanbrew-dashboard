// ตัวช่วยที่หน้า Lab 2.2 และหน้า "ลูกค้า" ใช้ร่วมกัน
// แยกจาก metrics.js ของ Lab 1 เพื่อไม่ให้กระทบ Dashboard เดิม
export { dailyRevenue } from "./metrics.js";

export const COFFEE = "#6B3E26";

/** แปลงแถวดิบจาก CSV เป็นตัวเลข (รูปแบบที่ src/lab2 และ src/customers ใช้) */
export function prepareRows(rows) {
  return rows
    .filter((r) => r.order_id)
    .map((r) => {
      const qty = Number(r.qty);
      const unitPrice = Number(r.unit_price);
      return {
        ...r,
        qty,
        unitPrice,
        revenue: qty * unitPrice,
        // ใช้ 10 ตัวอักษรแรกของ ISO string (เวลาไทย) ไม่ผ่าน new Date เพื่อไม่ให้วันเลื่อนเป็น UTC
        date: r.datetime.slice(0, 10),
        hour: Number(r.datetime.slice(11, 13)),
      };
    });
}

export const thaiDate = (iso) =>
  new Date(iso + "T00:00:00").toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "2-digit" });

export const fmtBaht = (n) => "฿" + n.toLocaleString("th-TH", { maximumFractionDigits: 0 });
export const fmtNum = (n) => n.toLocaleString("th-TH");
export const fmtShortBaht = (n) =>
  n >= 1_000_000 ? `฿${(n / 1_000_000).toFixed(1)} ล.` : n >= 1000 ? `฿${(n / 1000).toFixed(0)}k` : `฿${n}`;
