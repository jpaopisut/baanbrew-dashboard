import { useEffect, useState } from "react";
import Papa from "papaparse";
import Lab1Dashboard from "./Lab1Dashboard.jsx";
import Lab2Page from "./lab2/Lab2Page.jsx";
import CustomersPage from "./customers/CustomersPage.jsx";
import { prepareRows } from "./lib/lab2Shared.js";
import { prepareCustomers } from "./customers/customerMetrics.js";

// โหลด CSV จาก public/ แบบ path relative (BASE_URL) เพื่อให้ deploy ใต้ sub-path ได้
const loadCsv = (name) =>
  new Promise((resolve, reject) =>
    Papa.parse(`${import.meta.env.BASE_URL}${name}`, {
      download: true, header: true, skipEmptyLines: true,
      complete: (res) => resolve(res.data),
      error: (err) => reject(err),
    })
  );

const TABS = [
  { id: "overview", label: "ภาพรวม" },
  { id: "customers", label: "ลูกค้า" },
  { id: "lab2", label: "Lab 2.2 · ซ่อมกราฟ" },
];

export default function App() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [tab, setTab] = useState(() => TABS.find((t) => `#${t.id}` === location.hash)?.id ?? "overview");

  useEffect(() => {
    Promise.all([loadCsv("sales.csv"), loadCsv("products.csv"), loadCsv("customers_clean.csv")])
      .then(([sales, products, customers]) => setData({
        rawSales: sales,
        rows: prepareRows(sales),
        products,
        customers: prepareCustomers(customers),
      }))
      .catch((e) => setError(e.message ?? String(e)));
  }, []);

  const choose = (id) => { setTab(id); history.replaceState(null, "", id === "overview" ? "#" : `#${id}`); };

  return (
    <main className="min-h-screen bg-stone-50 text-stone-900">
      <nav className="sticky top-0 z-10 border-b border-stone-200 bg-stone-50/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl gap-1 overflow-x-auto px-4 py-2 sm:px-8">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => choose(t.id)}
              className={`shrink-0 rounded-lg px-4 py-2 text-sm font-medium ${
                tab === t.id ? "bg-stone-900 text-white" : "text-stone-600 hover:bg-stone-200"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </nav>
      <div className="mx-auto max-w-6xl px-4 py-6 sm:p-8">
        {error && <p className="text-red-700">โหลดข้อมูลไม่สำเร็จ: {error}</p>}
        {!error && !data && <p className="text-stone-500">กำลังโหลดข้อมูล…</p>}
        {data && tab === "overview" && <Lab1Dashboard rawSales={data.rawSales} />}
        {data && tab === "customers" && <CustomersPage customers={data.customers} rows={data.rows} />}
        {data && tab === "lab2" && <Lab2Page rows={data.rows} products={data.products} />}
      </div>
    </main>
  );
}
