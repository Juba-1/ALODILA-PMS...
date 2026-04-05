/**
 * ══════════════════════════════════════════════════════════════
 *  AL ODILA REAL ESTATE — نظام إدارة الأملاك v3.0 Production
 *  Powered by: Groq AI (llama-3.3-70b) + Supabase PostgreSQL
 * ══════════════════════════════════════════════════════════════
 */

import { useState, useMemo, useRef, useEffect, useCallback } from "react";
import { createClient } from "@supabase/supabase-js";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, CartesianGrid, Legend, LineChart, Line, AreaChart, Area
} from "recharts";
import * as XLSX from "xlsx";

// ─── Supabase Client ───────────────────────────────────────────
const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

// ─── Groq AI Call (via Vercel Edge Function) ───────────────────
const callGroq = async (messages, systemPrompt, jsonMode = false) => {
  const res = await fetch("/api/ai", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ messages, systemPrompt, jsonMode }),
  });
  const data = await res.json();
  return data.reply;
};

// ─── Design Tokens ─────────────────────────────────────────────
const C = {
  pri: "#0a1628", priL: "#152444", priLL: "#1e3a6e",
  gold: "#c9a44c", goldL: "#e0c06e", goldD: "#a07830",
  goldGrad: "linear-gradient(135deg, #a07830, #c9a44c, #e0c06e)",
  succ: "#16a34a", succBg: "#dcfce7",
  warn: "#d97706", warnBg: "#fef3c7",
  dang: "#dc2626", dangBg: "#fee2e2",
  info: "#0ea5e9", infoBg: "#e0f2fe",
  bg: "#edf1f7", card: "#ffffff",
  txt: "#0f172a", txtL: "#64748b", txtXL: "#94a3b8",
  brd: "#e2e8f0", brdL: "#f1f5f9",
  aiGrad: "linear-gradient(135deg, #0a1628, #1e3a6e)",
};

const sColor = (s) => ({ ساري:C.succ,نشط:C.succ,مؤجرة:C.succ,مدفوع:C.succ,مكتمل:C.succ,شاغرة:C.info,جديد:C.info,منتهي:C.txtL,"قيد التنفيذ":C.warn,معلق:C.warn,متأخر:C.dang,ملغي:C.dang }[s]||C.txtL);
const sBg   = (s) => ({ ساري:C.succBg,نشط:C.succBg,مؤجرة:C.succBg,مدفوع:C.succBg,مكتمل:C.succBg,شاغرة:C.infoBg,جديد:C.infoBg,منتهي:"#f1f5f9","قيد التنفيذ":C.warnBg,معلق:C.warnBg,متأخر:C.dangBg,ملغي:C.dangBg }[s]||"#f1f5f9");
const badge = (s) => ({ display:"inline-block",padding:"3px 11px",borderRadius:20,fontSize:11,fontWeight:700,color:sColor(s),background:sBg(s) });

// ─── Al Odila Logo SVG ─────────────────────────────────────────
const Logo = ({ size = 40, showText = false }) => (
  <svg width={size} height={size} viewBox="0 0 120 120">
    <defs>
      <linearGradient id="goldG" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#a07830"/>
        <stop offset="50%" stopColor="#c9a44c"/>
        <stop offset="100%" stopColor="#e0c06e"/>
      </linearGradient>
      <filter id="glow">
        <feGaussianBlur stdDeviation="1.5" result="blur"/>
        <feComposite in="SourceGraphic" in2="blur" operator="over"/>
      </filter>
    </defs>
    <circle cx="60" cy="60" r="58" fill="#0a1628" stroke="url(#goldG)" strokeWidth="2"/>
    {/* arch */}
    <path d="M22 80 Q60 18 98 80" fill="none" stroke="url(#goldG)" strokeWidth="4" strokeLinecap="round" filter="url(#glow)"/>
    {/* left pillar */}
    <rect x="30" y="56" width="8" height="24" rx="1" fill="url(#goldG)"/>
    {/* main tower */}
    <rect x="52" y="24" width="16" height="56" rx="2" fill="url(#goldG)"/>
    {/* tower top */}
    <polygon points="60,12 52,28 68,28" fill="url(#goldG)"/>
    {/* right pillar */}
    <rect x="82" y="56" width="8" height="24" rx="1" fill="url(#goldG)"/>
    {/* base line */}
    <rect x="22" y="80" width="76" height="3" rx="1.5" fill="url(#goldG)"/>
    {/* text */}
    <text x="60" y="96" textAnchor="middle" fill="url(#goldG)" fontSize="10" fontWeight="900" fontFamily="'Trebuchet MS',Arial" letterSpacing="3">AL ODILA</text>
    <text x="60" y="107" textAnchor="middle" fill="url(#goldG)" fontSize="5.5" fontFamily="'Trebuchet MS',Arial" letterSpacing="2.5">REAL ESTATE</text>
  </svg>
);

// ─── Shared Styles ─────────────────────────────────────────────
const card  = { background:C.card, borderRadius:14, boxShadow:"0 2px 16px rgba(0,0,0,0.07)", padding:22 };
const inp   = { width:"100%", padding:"11px 14px", border:`2px solid ${C.brd}`, borderRadius:10, fontSize:14, fontFamily:"inherit", outline:"none", boxSizing:"border-box", direction:"rtl", background:"#fff" };
const lbl   = { display:"block", marginBottom:6, fontWeight:600, fontSize:13, color:C.txt };
const th    = { padding:"12px 14px", textAlign:"right", fontWeight:700, fontSize:12, color:C.txtL, borderBottom:`2px solid ${C.brd}`, whiteSpace:"nowrap", background:C.brdL };
const td    = { padding:"12px 14px", fontSize:13, color:C.txt, borderBottom:`1px solid ${C.brdL}` };
const btnG  = { background:C.goldGrad, color:C.pri, border:"none", padding:"10px 22px", borderRadius:10, fontWeight:700, cursor:"pointer", fontSize:13, display:"inline-flex", alignItems:"center", gap:7, fontFamily:"inherit" };
const btnS  = { background:C.brdL, color:C.txt, border:"none", padding:"6px 12px", borderRadius:8, cursor:"pointer", fontSize:12, fontWeight:600, fontFamily:"inherit" };

// ─── Supabase DB Layer ─────────────────────────────────────────
const db = {
  get:    (t) => supabase.from(t).select("*").order("id"),
  insert: (t, d) => supabase.from(t).insert(d).select().single(),
  update: (t, id, d) => supabase.from(t).update(d).eq("id", id).select().single(),
  delete: (t, id) => supabase.from(t).delete().eq("id", id),
};

// ─── useTable Hook ─────────────────────────────────────────────
function useTable(tableName, initialData = []) {
  const [rows, setRows]     = useState(initialData);
  const [loading, setLoading] = useState(true);
  const [error, setError]   = useState(null);

  useEffect(() => {
    db.get(tableName).then(({ data, error: err }) => {
      if (!err && data?.length) setRows(data);
      else if (err) setError(err.message);
      setLoading(false);
    });
    // Realtime subscription
    const channel = supabase.channel(`rt_${tableName}`)
      .on("postgres_changes", { event: "*", schema: "public", table: tableName }, (payload) => {
        if (payload.eventType === "INSERT") setRows(r => [...r, payload.new]);
        if (payload.eventType === "UPDATE") setRows(r => r.map(x => x.id === payload.new.id ? payload.new : x));
        if (payload.eventType === "DELETE") setRows(r => r.filter(x => x.id !== payload.old.id));
      }).subscribe();
    return () => supabase.removeChannel(channel);
  }, [tableName]);

  const upsert = async (item) => {
    if (item.id) {
      const { data } = await db.update(tableName, item.id, item);
      if (data) setRows(r => r.map(x => x.id === item.id ? data : x));
    } else {
      const { data } = await db.insert(tableName, item);
      if (data) setRows(r => [...r, data]);
    }
  };

  const remove = async (id) => {
    await db.delete(tableName, id);
    setRows(r => r.filter(x => x.id !== id));
  };

  return { rows, setRows, loading, error, upsert, remove };
}

// ═══════════════════════════════════════════════════════════════
// SEED DATA (used only if Supabase tables are empty)
// ═══════════════════════════════════════════════════════════════
const SEED = {
  properties: [
    {id:1,name:"برج العضيلة السكني",type:"سكني",location:"الرياض - حي النرجس",total_units:24,year:2020,status:"نشط",value:8500000},
    {id:2,name:"مجمع العضيلة التجاري",type:"تجاري",location:"الرياض - حي العليا",total_units:16,year:2019,status:"نشط",value:12000000},
    {id:3,name:"فلل العضيلة السكنية",type:"سكني",location:"الرياض - حي الملقا",total_units:8,year:2022,status:"نشط",value:6800000},
    {id:4,name:"مركز العضيلة للأعمال",type:"تجاري",location:"الرياض - طريق الملك فهد",total_units:30,year:2021,status:"نشط",value:18000000},
    {id:5,name:"أبراج العضيلة ريزيدنس",type:"سكني",location:"الرياض - حي الياسمين",total_units:40,year:2023,status:"نشط",value:22000000},
  ],
  units: [
    {id:1,property_id:1,number:"A-101",type:"شقة",floor:1,area:120,annual_rent:35000,status:"مؤجرة"},
    {id:2,property_id:1,number:"A-102",type:"شقة",floor:1,area:95,annual_rent:28000,status:"مؤجرة"},
    {id:3,property_id:1,number:"A-201",type:"شقة",floor:2,area:150,annual_rent:42000,status:"شاغرة"},
    {id:4,property_id:1,number:"A-202",type:"شقة",floor:2,area:110,annual_rent:32000,status:"مؤجرة"},
    {id:5,property_id:2,number:"B-01",type:"مكتب",floor:0,area:80,annual_rent:55000,status:"مؤجرة"},
    {id:6,property_id:2,number:"B-02",type:"معرض",floor:0,area:200,annual_rent:120000,status:"مؤجرة"},
    {id:7,property_id:2,number:"B-03",type:"مكتب",floor:1,area:60,annual_rent:40000,status:"شاغرة"},
    {id:8,property_id:3,number:"V-01",type:"فيلا",floor:0,area:350,annual_rent:85000,status:"مؤجرة"},
    {id:9,property_id:3,number:"V-02",type:"فيلا",floor:0,area:400,annual_rent:95000,status:"مؤجرة"},
    {id:10,property_id:3,number:"V-03",type:"فيلا",floor:0,area:320,annual_rent:78000,status:"شاغرة"},
    {id:11,property_id:4,number:"C-101",type:"مكتب",floor:1,area:45,annual_rent:30000,status:"مؤجرة"},
    {id:12,property_id:4,number:"C-G01",type:"محل",floor:0,area:50,annual_rent:65000,status:"مؤجرة"},
    {id:13,property_id:5,number:"R-101",type:"شقة",floor:1,area:180,annual_rent:55000,status:"مؤجرة"},
    {id:14,property_id:5,number:"R-501",type:"شقة",floor:5,area:250,annual_rent:75000,status:"شاغرة"},
  ],
  tenants: [
    {id:1,name:"أحمد محمد العتيبي",id_number:"1055667788",phone:"0551234567",email:"ahmed@email.com",nationality:"سعودي",type:"فرد"},
    {id:2,name:"شركة التقنية المتقدمة",id_number:"7001234567",phone:"0112345678",email:"info@techco.sa",nationality:"سعودي",type:"شركة"},
    {id:3,name:"خالد عبدالله الشمري",id_number:"1088776655",phone:"0559876543",email:"khaled@email.com",nationality:"سعودي",type:"فرد"},
    {id:4,name:"مؤسسة الأفق للتجارة",id_number:"7009876543",phone:"0112223344",email:"info@horizon.sa",nationality:"سعودي",type:"مؤسسة"},
    {id:5,name:"سعود فهد القحطاني",id_number:"1033445566",phone:"0543216789",email:"saud@email.com",nationality:"سعودي",type:"فرد"},
  ],
  contracts: [
    {id:1,tenant_id:1,unit_id:1,property_id:1,start_date:"2024-01-01",end_date:"2024-12-31",annual_rent:35000,payment_cycle:"ربع سنوي",status:"ساري",ejar_number:"EJ-2024-001"},
    {id:2,tenant_id:2,unit_id:5,property_id:2,start_date:"2024-03-01",end_date:"2025-02-28",annual_rent:55000,payment_cycle:"نصف سنوي",status:"ساري",ejar_number:"EJ-2024-002"},
    {id:3,tenant_id:4,unit_id:6,property_id:2,start_date:"2024-01-15",end_date:"2025-01-14",annual_rent:120000,payment_cycle:"ربع سنوي",status:"ساري",ejar_number:"EJ-2024-003"},
    {id:4,tenant_id:5,unit_id:8,property_id:3,start_date:"2024-04-01",end_date:"2025-03-31",annual_rent:85000,payment_cycle:"سنوي",status:"ساري",ejar_number:"EJ-2024-004"},
    {id:5,tenant_id:3,unit_id:2,property_id:1,start_date:"2023-06-01",end_date:"2024-05-31",annual_rent:28000,payment_cycle:"شهري",status:"منتهي",ejar_number:"EJ-2023-015"},
  ],
  payments: [
    {id:1,contract_id:1,amount:8750,date:"2024-01-05",method:"تحويل بنكي",status:"مدفوع",type:"إيجار",note:"الربع الأول"},
    {id:2,contract_id:1,amount:8750,date:"2024-04-03",method:"تحويل بنكي",status:"مدفوع",type:"إيجار",note:"الربع الثاني"},
    {id:3,contract_id:1,amount:8750,date:"2024-10-01",method:"",status:"معلق",type:"إيجار",note:"الربع الرابع"},
    {id:4,contract_id:2,amount:27500,date:"2024-03-01",method:"شيك",status:"مدفوع",type:"إيجار",note:"النصف الأول"},
    {id:5,contract_id:2,amount:27500,date:"2024-09-01",method:"",status:"متأخر",type:"إيجار",note:"النصف الثاني"},
    {id:6,contract_id:3,amount:30000,date:"2024-01-15",method:"تحويل بنكي",status:"مدفوع",type:"إيجار",note:"الربع الأول"},
    {id:7,contract_id:4,amount:85000,date:"2024-04-01",method:"تحويل بنكي",status:"مدفوع",type:"إيجار",note:"الإيجار السنوي"},
  ],
  maintenance: [
    {id:1,unit_id:1,property_id:1,category:"سباكة",description:"تسريب مياه في الحمام",priority:"عالية",status:"قيد التنفيذ",date:"2024-06-15",cost:800},
    {id:2,unit_id:5,property_id:2,category:"كهرباء",description:"عطل في الإضاءة",priority:"متوسطة",status:"مكتمل",date:"2024-06-10",cost:450},
    {id:3,unit_id:8,property_id:3,category:"تكييف",description:"صيانة دورية",priority:"منخفضة",status:"جديد",date:"2024-06-20",cost:0},
  ],
  expenses: [
    {id:1,property_id:1,category:"أمن وحراسة",amount:3600,date:"2024-02-01",description:"رسوم خدمة الأمن",status:"مدفوع"},
    {id:2,property_id:2,category:"تأمين",amount:8000,date:"2024-01-01",description:"تأمين سنوي",status:"مدفوع"},
    {id:3,property_id:2,category:"مياه وكهرباء",amount:4500,date:"2024-03-01",description:"فواتير المشتركة",status:"مدفوع"},
    {id:4,property_id:3,category:"نظافة",amount:2000,date:"2024-02-15",description:"خدمة التنظيف",status:"مدفوع"},
  ],
};

// ═══════════════════════════════════════════════════════════════
//  MAIN APP
// ═══════════════════════════════════════════════════════════════
export default function App() {
  const [page, setPage]     = useState("dashboard");
  const [modal, setModal]   = useState(null);
  const [form, setForm]     = useState({});
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [confirm, setConfirm] = useState(null);
  const [sideOpen, setSideOpen] = useState(true);
  const [notifOpen, setNotifOpen] = useState(false);
  const [reportTab, setReportTab] = useState("rentroll");

  // AI State
  const [aiOpen, setAiOpen]     = useState(false);
  const [aiTab, setAiTab]       = useState("chat");
  const [aiMsgs, setAiMsgs]     = useState([
    { role:"assistant", content:"مرحباً! أنا مساعدك الذكي في العضيلة للتطوير العقاري 🏢\n\nيمكنني مساعدتك في تحليل بيانات محفظتك العقارية، استيراد ملفات Excel، وإنشاء تقارير ذكية. كيف يمكنني خدمتك؟" }
  ]);
  const [aiInput, setAiInput]   = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [excelText, setExcelText] = useState("");
  const [excelResult, setExcelResult] = useState(null);
  const [excelLoading, setExcelLoading] = useState(false);
  const aiEndRef = useRef(null);
  const fileInputRef = useRef(null);

  // DB Tables (Supabase Realtime)
  const props   = useTable("properties",  SEED.properties);
  const units   = useTable("units",       SEED.units);
  const tenants = useTable("tenants",     SEED.tenants);
  const conts   = useTable("contracts",   SEED.contracts);
  const pays    = useTable("payments",    SEED.payments);
  const maints  = useTable("maintenance", SEED.maintenance);
  const exps    = useTable("expenses",    SEED.expenses);

  // Scroll AI to bottom
  useEffect(() => { aiEndRef.current?.scrollIntoView({ behavior:"smooth" }); }, [aiMsgs]);

  // ─── Helpers ────────────────────────────────────────────────
  const fmt    = (n) => Number(n||0).toLocaleString("ar-SA");
  const pName  = (id) => props.rows.find(p => p.id === +id)?.name || "—";
  const tName  = (id) => tenants.rows.find(t => t.id === +id)?.name || "—";
  const uLabel = (id) => { const u = units.rows.find(u => u.id === +id); return u ? `${u.number} — ${pName(u.property_id)}` : "—"; };
  const go     = (p) => { setPage(p); setSearch(""); setFilter("all"); setNotifOpen(false); };

  // ─── Stats ──────────────────────────────────────────────────
  const S = useMemo(() => {
    const occupied  = units.rows.filter(u => u.status === "مؤجرة").length;
    const vacant    = units.rows.filter(u => u.status === "شاغرة").length;
    const occRate   = units.rows.length ? Math.round((occupied / units.rows.length) * 100) : 0;
    const totalRev  = pays.rows.filter(p => p.status === "مدفوع").reduce((s,p) => s + +p.amount, 0);
    const pendingAmt = pays.rows.filter(p => p.status === "معلق" || p.status === "متأخر").reduce((s,p) => s + +p.amount, 0);
    const totalExp  = exps.rows.filter(e => e.status === "مدفوع").reduce((s,e) => s + +e.amount, 0);
    const noi       = totalRev - totalExp;
    const expRev    = conts.rows.filter(c => c.status === "ساري").reduce((s,c) => s + +c.annual_rent, 0);
    const totalVal  = props.rows.reduce((s,p) => s + +(p.value||0), 0);
    const grossYield = totalVal ? ((expRev / totalVal) * 100).toFixed(1) : 0;
    const capRate   = totalVal ? ((noi / totalVal) * 100).toFixed(2) : 0;
    const collectRate = (totalRev + pendingAmt) ? Math.round((totalRev / (totalRev + pendingAmt)) * 100) : 0;
    return { occupied, vacant, total: units.rows.length, occRate, totalRev, pendingAmt, totalExp, noi, expRev, totalVal, grossYield, capRate, collectRate,
      activeContracts: conts.rows.filter(c => c.status === "ساري").length,
      overdue: pays.rows.filter(p => p.status === "متأخر"),
      pendingMaint: maints.rows.filter(m => m.status !== "مكتمل").length,
    };
  }, [units.rows, pays.rows, exps.rows, conts.rows, props.rows, maints.rows]);

  // ─── Notifications ──────────────────────────────────────────
  const notifications = useMemo(() => {
    const n = [];
    conts.rows.filter(c => c.status === "ساري").forEach(c => {
      const diff = Math.ceil((new Date(c.end_date) - new Date()) / 864e5);
      const t = tenants.rows.find(t => t.id === c.tenant_id);
      if (diff <= 0) n.push({ type:"dang", msg:`عقد ${t?.name||""} منتهي!`, date:c.end_date, page:"contracts" });
      else if (diff <= 60) n.push({ type:"warn", msg:`عقد ${t?.name||""} ينتهي خلال ${diff} يوم`, date:c.end_date, page:"contracts" });
    });
    pays.rows.filter(p => p.status === "متأخر").forEach(p => {
      const c = conts.rows.find(c => c.id === p.contract_id);
      const t = c ? tenants.rows.find(t => t.id === c.tenant_id) : null;
      n.push({ type:"dang", msg:`دفعة متأخرة: ${fmt(p.amount)} ر.س — ${t?.name||""}`, date:p.date, page:"payments" });
    });
    maints.rows.filter(m => m.priority === "عالية" && m.status !== "مكتمل").forEach(m =>
      n.push({ type:"warn", msg:`صيانة عاجلة: ${m.description?.substring(0,35)}`, date:m.date, page:"maintenance" })
    );
    return n;
  }, [conts.rows, pays.rows, maints.rows, tenants.rows]);

  // ─── CRUD ───────────────────────────────────────────────────
  const tableMap = { property:"properties", unit:"units", tenant:"tenants", contract:"contracts", payment:"payments", maintenance:"maintenance", expense:"expenses" };
  const rowsMap  = { property:props, unit:units, tenant:tenants, contract:conts, payment:pays, maintenance:maints, expense:exps };

  const saveItem = async () => {
    const tbl = tableMap[modal];
    const hook = rowsMap[modal];
    await hook.upsert(form);
    setModal(null); setForm({});
  };

  const doDelete = async () => {
    const tbl = tableMap[confirm.type];
    const hook = rowsMap[confirm.type];
    await hook.remove(confirm.id);
    setConfirm(null);
  };

  const edit = (type, item) => { setModal(type); setForm({ ...item }); };
  const add  = (type, defs = {}) => { setModal(type); setForm(defs); };
  const del  = (type, id, name) => setConfirm({ type, id, name });

  // ─── AI System Prompt ────────────────────────────────────────
  const systemPrompt = useMemo(() => `أنت مساعد ذكاء اصطناعي متخصص في إدارة الأملاك والتطوير العقاري لشركة العضيلة للتطوير العقاري في المملكة العربية السعودية.

## بيانات المحفظة الحالية:
- العقارات: ${props.rows.length} عقار بقيمة إجمالية ${fmt(S.totalVal)} ر.س
- الوحدات: ${S.total} وحدة — ${S.occupied} مؤجرة (${S.occRate}%) — ${S.vacant} شاغرة
- العقود السارية: ${S.activeContracts}
- الإيرادات المحصّلة: ${fmt(S.totalRev)} ر.س
- NOI: ${fmt(S.noi)} ر.س
- العائد الإجمالي: ${S.grossYield}%
- Cap Rate: ${S.capRate}%
- معدل التحصيل: ${S.collectRate}%
- مبالغ متأخرة: ${fmt(S.pendingAmt)} ر.س
- طلبات صيانة مفتوحة: ${S.pendingMaint}

## العقارات:
${props.rows.map(p => `- ${p.name}: ${p.type}, ${p.location}, قيمة ${fmt(p.value)} ر.س`).join("\n")}

## قواعد الإجابة:
- أجب دائماً بالعربية الفصحى
- استخدم بيانات المحفظة الفعلية أعلاه عند الإجابة
- كن دقيقاً في الأرقام والحسابات
- قدم توصيات عملية ومبنية على البيانات
- تخصصك: إدارة الأملاك، التقييم العقاري، قانون الإيجار السعودي (نظام إيجار)`, [props.rows, S]);

  // ─── Ask AI ──────────────────────────────────────────────────
  const askAI = async (msg) => {
    if (!msg.trim() || aiLoading) return;
    const userMsg = { role:"user", content:msg };
    setAiMsgs(prev => [...prev, userMsg]);
    setAiInput("");
    setAiLoading(true);
    try {
      const history = [...aiMsgs, userMsg]
        .filter(m => m.role !== "system")
        .slice(-10) // keep last 10 messages for context
        .map(m => ({ role: m.role, content: m.content }));
      const reply = await callGroq(history, systemPrompt);
      setAiMsgs(prev => [...prev, { role:"assistant", content:reply }]);
    } catch {
      setAiMsgs(prev => [...prev, { role:"assistant", content:"عذراً، حدث خطأ. يرجى المحاولة مرة أخرى." }]);
    }
    setAiLoading(false);
  };

  // ─── Excel AI Import ─────────────────────────────────────────
  const handleExcelFile = (e) => {
    const file = e.target.files[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const wb = XLSX.read(ev.target.result, { type:"binary" });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const csv = XLSX.utils.sheet_to_csv(ws);
      setExcelText(csv.substring(0, 3000)); // limit size
    };
    reader.readAsBinaryString(file);
    e.target.value = "";
  };

  const analyzeExcel = async () => {
    if (!excelText.trim()) return;
    setExcelLoading(true);
    setExcelResult(null);
    try {
      const prompt = `أنت محلل بيانات عقارية. حلّل هذه البيانات من ملف Excel:

${excelText}

المهمة:
1. حدد نوع البيانات (وحدات / مستأجرين / عقود / مدفوعات / عقارات)
2. عيّن كل عمود بشكل صحيح للحقول المناسبة
3. نظّف الأخطاء الإملائية والتنسيق
4. أصلح الأرقام والتواريخ
5. ميّز أي بيانات مشكوك فيها

أرجع JSON فقط بهذا الشكل بالضبط:
{
  "type": "units|tenants|contracts|payments|properties",
  "detected_columns": {"العمود الأصلي": "حقل_النظام"},
  "count": 0,
  "data": [],
  "warnings": ["تحذير 1"],
  "errors": [],
  "summary": "ملخص نصي للتحليل"
}`;
      const reply = await callGroq([{ role:"user", content:prompt }], "أنت محلل بيانات عقارية دقيق. أرجع JSON فقط.");
      // Extract JSON from reply
      const jsonMatch = reply.match(/\{[\s\S]*\}/);
      const parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : { error:"لم يتمكن AI من تحليل البيانات", raw:reply };
      setExcelResult(parsed);
    } catch (err) {
      setExcelResult({ error:"خطأ في التحليل: " + err.message });
    }
    setExcelLoading(false);
  };

  const importExcelData = async () => {
    if (!excelResult?.data?.length) return;
    const type = excelResult.type;
    const hook = { units, tenants, contracts, payments:pays, properties:props }[type];
    if (!hook) return;
    for (const item of excelResult.data) {
      await hook.upsert(item);
    }
    setExcelResult({ ...excelResult, imported: true });
  };

  // ─── CSV Export ──────────────────────────────────────────────
  const exportCSV = (data, name) => {
    if (!data.length) return;
    const headers = Object.keys(data[0]);
    const rows = data.map(r => headers.map(h => `"${String(r[h]||"").replace(/"/g,'""')}"`).join(","));
    const csv = [headers.join(","), ...rows].join("\n");
    const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob(["\ufeff"+csv], {type:"text/csv;charset=utf-8"}));
    a.download = `${name}.csv`; a.click();
  };

  // ══════════════════════════════════════════════════════════════
  //  PAGE RENDERERS
  // ══════════════════════════════════════════════════════════════

  // ── Dashboard ─────────────────────────────────────────────────
  const renderDashboard = () => {
    const kpis = [
      {l:"العقارات",v:props.rows.length,icon:"🏢",g:"linear-gradient(135deg,#0a1628,#1e3a6e)"},
      {l:"نسبة الإشغال",v:`${S.occRate}%`,icon:"📊",g:"linear-gradient(135deg,#155e75,#0ea5e9)"},
      {l:"العقود السارية",v:S.activeContracts,icon:"📋",g:"linear-gradient(135deg,#92400e,#d97706)"},
      {l:"الإيرادات المحصّلة",v:`${fmt(S.totalRev)} ر.س`,icon:"💰",g:"linear-gradient(135deg,#14532d,#16a34a)"},
      {l:"صافي الدخل NOI",v:`${fmt(S.noi)} ر.س`,icon:"📈",g:"linear-gradient(135deg,#1e1b4b,#4338ca)"},
      {l:"العائد الإجمالي",v:`${S.grossYield}%`,icon:"🎯",g:"linear-gradient(135deg,#4a044e,#a21caf)"},
      {l:"مبالغ متأخرة",v:`${fmt(S.pendingAmt)} ر.س`,icon:"⚠️",g:"linear-gradient(135deg,#7c2d12,#dc2626)"},
      {l:"صيانة مفتوحة",v:S.pendingMaint,icon:"🔧",g:"linear-gradient(135deg,#451a03,#d97706)"},
    ];
    const monthData = [
      {m:"يناير",rev:45000,exp:8000},{m:"فبراير",rev:52000,exp:9200},{m:"مارس",rev:48000,exp:7500},
      {m:"أبريل",rev:61000,exp:10000},{m:"مايو",rev:55000,exp:8800},{m:"يونيو",rev:67000,exp:11000},
    ];
    const pie = props.rows.map((p,i) => ({ name:p.name.split(" ").slice(0,2).join(" "), value:units.rows.filter(u => u.property_id === p.id && u.status === "مؤجرة").length }));
    const COLORS = ["#c9a44c","#1e3a6e","#16a34a","#0ea5e9","#dc2626"];
    return (
      <div>
        <div style={{marginBottom:20}}>
          <h2 style={{margin:0,fontSize:22,color:C.txt}}>مرحباً بك 👋</h2>
          <p style={{margin:"3px 0 0",color:C.txtL,fontSize:13}}>شركة العضيلة للتطوير العقاري — نظرة شاملة على المحفظة</p>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(205px,1fr))",gap:14,marginBottom:22}}>
          {kpis.map((k,i) => (
            <div key={i} style={{background:k.g,borderRadius:14,padding:"18px 18px",color:"#fff",position:"relative",overflow:"hidden"}}>
              <div style={{position:"absolute",top:-10,left:-10,fontSize:56,opacity:.1}}>{k.icon}</div>
              <div style={{fontSize:12,opacity:.85,fontWeight:600,marginBottom:6}}>{k.l}</div>
              <div style={{fontSize:20,fontWeight:800}}>{k.v}</div>
            </div>
          ))}
        </div>
        <div style={{display:"grid",gridTemplateColumns:"2fr 1fr",gap:16,marginBottom:16}}>
          <div style={card}>
            <h3 style={{margin:"0 0 14px",fontSize:15,color:C.txt}}>📊 الإيرادات والمصروفات (2024)</h3>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={monthData} margin={{top:5,right:10,left:0,bottom:5}}>
                <CartesianGrid strokeDasharray="3 3" stroke={C.brdL}/>
                <XAxis dataKey="m" tick={{fontSize:11,fill:C.txtL}}/>
                <YAxis tick={{fontSize:10,fill:C.txtL}}/>
                <Tooltip formatter={v=>`${fmt(v)} ر.س`}/>
                <Legend/>
                <Bar dataKey="rev" name="إيرادات" fill={C.gold} radius={[4,4,0,0]}/>
                <Bar dataKey="exp" name="مصروفات" fill={C.dang} radius={[4,4,0,0]}/>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div style={card}>
            <h3 style={{margin:"0 0 12px",fontSize:15,color:C.txt}}>🏠 الوحدات المؤجرة</h3>
            <ResponsiveContainer width="100%" height={160}>
              <PieChart>
                <Pie data={pie} cx="50%" cy="50%" innerRadius={38} outerRadius={60} dataKey="value" paddingAngle={3}>
                  {pie.map((_,i) => <Cell key={i} fill={COLORS[i%5]}/>)}
                </Pie>
                <Tooltip formatter={v=>`${v} وحدة`}/>
              </PieChart>
            </ResponsiveContainer>
            <div style={{display:"flex",gap:8,flexWrap:"wrap",justifyContent:"center",marginTop:6}}>
              {pie.map((p,i) => (
                <div key={i} style={{display:"flex",alignItems:"center",gap:4,fontSize:10}}>
                  <div style={{width:8,height:8,borderRadius:"50%",background:COLORS[i%5]}}/>
                  <span style={{color:C.txtL}}>{p.name} ({p.value})</span>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16}}>
          <div style={card}>
            <h3 style={{margin:"0 0 14px",fontSize:15,color:C.txt}}>🎯 مؤشرات الأداء الرئيسية</h3>
            {[
              {l:"صافي الدخل التشغيلي (NOI)",v:`${fmt(S.noi)} ر.س`,c:S.noi>=0?C.succ:C.dang},
              {l:"العائد الإجمالي (Gross Yield)",v:`${S.grossYield}%`,c:C.info},
              {l:"معدل الرسملة (Cap Rate)",v:`${S.capRate}%`,c:C.gold},
              {l:"معدل التحصيل",v:`${S.collectRate}%`,c:S.collectRate>85?C.succ:C.warn},
              {l:"نسبة الإشغال",v:`${S.occRate}%`,c:S.occRate>80?C.succ:S.occRate>60?C.warn:C.dang},
              {l:"القيمة السوقية الإجمالية",v:`${fmt(S.totalVal)} ر.س`,c:C.priLL},
            ].map((r,i) => (
              <div key={i} style={{display:"flex",justifyContent:"space-between",padding:"9px 0",borderBottom:`1px solid ${C.brdL}`}}>
                <span style={{fontSize:13,color:C.txtL}}>{r.l}</span>
                <span style={{fontSize:14,fontWeight:800,color:r.c}}>{r.v}</span>
              </div>
            ))}
          </div>
          <div style={card}>
            <h3 style={{margin:"0 0 14px",fontSize:15,color:C.txt}}>🔔 التنبيهات ({notifications.length})</h3>
            <div style={{maxHeight:240,overflowY:"auto"}}>
              {notifications.length === 0 && <p style={{color:C.txtL,textAlign:"center",padding:20}}>✅ لا توجد تنبيهات</p>}
              {notifications.map((n,i) => (
                <div key={i} onClick={() => go(n.page)} style={{display:"flex",gap:8,padding:"8px 0",borderBottom:`1px solid ${C.brdL}`,cursor:"pointer"}}>
                  <div style={{width:7,height:7,borderRadius:"50%",background:n.type==="dang"?C.dang:C.warn,marginTop:5,flexShrink:0}}/>
                  <div><div style={{fontSize:12,color:C.txt}}>{n.msg}</div>
                  <div style={{fontSize:10,color:C.txtL}}>{n.date}</div></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  };

  // ── Generic Table Page ─────────────────────────────────────────
  const TablePage = ({ title, icon, hook, cols, addDefaults, type, filterOptions, extraButtons }) => {
    const list = hook.rows.filter(r => {
      const matchFilter = filter === "all" || Object.values(r).some(v => String(v) === filter);
      const matchSearch = !search || Object.values(r).some(v => String(v).includes(search));
      return matchFilter && matchSearch;
    });
    return (
      <div>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:18,flexWrap:"wrap",gap:10}}>
          <div><h2 style={{margin:0,fontSize:21,color:C.txt}}>{icon} {title}</h2>
          <p style={{margin:"3px 0 0",color:C.txtL,fontSize:13}}>إجمالي: {hook.rows.length} سجل</p></div>
          <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
            {extraButtons}
            <button style={btnG} onClick={() => exportCSV(hook.rows, title)}>⬇️ تصدير</button>
            <button style={btnG} onClick={() => add(type, addDefaults)}>➕ إضافة</button>
          </div>
        </div>
        {filterOptions && (
          <div style={{display:"flex",gap:10,marginBottom:16,flexWrap:"wrap"}}>
            <input placeholder="🔍 بحث..." value={search} onChange={e => setSearch(e.target.value)} style={{...inp,width:240,padding:"9px 14px"}}/>
            {filterOptions.map(f => (
              <button key={f.v} onClick={() => setFilter(f.v)} style={{...btnS,background:filter===f.v?C.pri:C.brdL,color:filter===f.v?"#fff":C.txt}}>{f.l}</button>
            ))}
          </div>
        )}
        {hook.loading && <div style={{...card,textAlign:"center",padding:40,color:C.txtL}}>⏳ جاري التحميل من Supabase...</div>}
        {hook.error && <div style={{...card,textAlign:"center",padding:40,color:C.dang}}>❌ خطأ: {hook.error}</div>}
        {!hook.loading && (
          <div style={{...card,padding:0,overflow:"hidden"}}>
            <div style={{overflowX:"auto"}}>
              <table style={{width:"100%",borderCollapse:"collapse"}}>
                <thead><tr>{cols.map(c => <th key={c.k} style={th}>{c.h}</th>)}<th style={th}>إجراءات</th></tr></thead>
                <tbody>
                  {list.map(row => (
                    <tr key={row.id} onMouseEnter={e => e.currentTarget.style.background=C.brdL} onMouseLeave={e => e.currentTarget.style.background="transparent"}>
                      {cols.map(c => (
                        <td key={c.k} style={{...td, ...c.style}}>
                          {c.render ? c.render(row) : c.badge ? <span style={badge(row[c.k])}>{row[c.k]}</span> : (c.fmt ? `${fmt(row[c.k])} ر.س` : row[c.k] || "—")}
                        </td>
                      ))}
                      <td style={td}><div style={{display:"flex",gap:5}}>
                        <button style={btnS} onClick={() => edit(type, row)}>✏️</button>
                        <button style={{...btnS,color:C.dang}} onClick={() => del(type, row.id, row.name || row.number || `#${row.id}`)}>🗑️</button>
                      </div></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {list.length === 0 && <p style={{textAlign:"center",padding:40,color:C.txtL}}>لا توجد سجلات مطابقة</p>}
          </div>
        )}
      </div>
    );
  };

  // ── Reports ────────────────────────────────────────────────────
  const renderReports = () => {
    const rentRoll = units.rows.map(u => {
      const c = conts.rows.find(c => c.unit_id === u.id && c.status === "ساري");
      const t = c ? tenants.rows.find(t => t.id === c.tenant_id) : null;
      return { عقار:pName(u.property_id), وحدة:u.number, نوع:u.type, مساحة:`${u.area}م²`, إيجار_سنوي:u.annual_rent, مستأجر:t?.name||"شاغرة", نهاية_عقد:c?.end_date||"—", حالة:u.status };
    });
    const noiByCat = props.rows.map(p => {
      const rev = units.rows.filter(u => u.property_id === p.id && u.status === "مؤجرة").reduce((s,u) => s + +u.annual_rent, 0);
      const exp = exps.rows.filter(e => e.property_id === p.id && e.status === "مدفوع").reduce((s,e) => s + +e.amount, 0);
      return { name:p.name.split(" ").slice(0,2).join(" "), rev, exp, noi:rev-exp };
    });
    const tabs = [{k:"rentroll",l:"📄 كشف الإيجارات"},{k:"noi",l:"💹 NOI"},{k:"vacancy",l:"🔓 الشواغر"}];
    return (
      <div>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:18}}>
          <h2 style={{margin:0,fontSize:21,color:C.txt}}>📈 التقارير والتحليلات</h2>
          <button style={btnG} onClick={() => exportCSV(rentRoll, "كشف_الإيجارات_العضيلة")}>⬇️ تصدير كشف الإيجارات</button>
        </div>
        <div style={{display:"flex",gap:8,marginBottom:18}}>
          {tabs.map(t => <button key={t.k} onClick={() => setReportTab(t.k)} style={{...btnS,background:reportTab===t.k?C.pri:C.brdL,color:reportTab===t.k?"#fff":C.txt,padding:"9px 16px",fontSize:13}}>{t.l}</button>)}
        </div>
        {reportTab === "rentroll" && (
          <div style={{...card,padding:0,overflow:"hidden"}}>
            <div style={{overflowX:"auto"}}>
              <table style={{width:"100%",borderCollapse:"collapse"}}>
                <thead><tr>{Object.keys(rentRoll[0]||{}).map(h => <th key={h} style={th}>{h}</th>)}</tr></thead>
                <tbody>
                  {rentRoll.map((r,i) => (
                    <tr key={i} style={{background:r["حالة"]==="شاغرة"?"#fff5f5":"transparent"}} onMouseEnter={e=>e.currentTarget.style.background=C.brdL} onMouseLeave={e=>e.currentTarget.style.background=r["حالة"]==="شاغرة"?"#fff5f5":"transparent"}>
                      {Object.entries(r).map(([k,v],j) => <td key={j} style={{...td,fontSize:12,fontWeight:k==="مستأجر"?700:400,color:k==="إيجار_سنوي"?C.succ:k==="حالة"?sColor(v):C.txt}}>{k==="إيجار_سنوي"?`${fmt(v)} ر.س`:v}</td>)}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
        {reportTab === "noi" && (
          <div style={card}>
            <h3 style={{margin:"0 0 16px",fontSize:15,color:C.txt}}>صافي الدخل التشغيلي حسب العقار</h3>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={noiByCat} margin={{top:5,right:10,left:15,bottom:5}}>
                <CartesianGrid strokeDasharray="3 3" stroke={C.brdL}/>
                <XAxis dataKey="name" tick={{fontSize:11,fill:C.txtL}}/>
                <YAxis tick={{fontSize:10,fill:C.txtL}}/>
                <Tooltip formatter={v=>`${fmt(v)} ر.س`}/>
                <Legend/>
                <Bar dataKey="rev" name="إيرادات" fill={C.gold} radius={[4,4,0,0]}/>
                <Bar dataKey="exp" name="مصروفات" fill={C.dang} radius={[4,4,0,0]}/>
                <Bar dataKey="noi" name="NOI" fill={C.succ} radius={[4,4,0,0]}/>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
        {reportTab === "vacancy" && (
          <div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(200px,1fr))",gap:14,marginBottom:20}}>
              {[{l:"وحدات شاغرة",v:S.vacant,c:C.dang},{l:"نسبة الشغور",v:`${100-S.occRate}%`,c:C.warn},{l:"خسارة إيجار",v:`${fmt(units.rows.filter(u=>u.status==="شاغرة").reduce((s,u)=>s+(+u.annual_rent),0))} ر.س`,c:C.dang}].map((s,i) => (
                <div key={i} style={{...card,textAlign:"center",padding:20}}>
                  <div style={{fontSize:22,fontWeight:800,color:s.c}}>{s.v}</div>
                  <div style={{fontSize:12,color:C.txtL,marginTop:4}}>{s.l}</div>
                </div>
              ))}
            </div>
            <div style={{...card,padding:0,overflow:"hidden"}}>
              <table style={{width:"100%",borderCollapse:"collapse"}}>
                <thead><tr>{["العقار","رقم الوحدة","النوع","الدور","المساحة","إيجار مقترح"].map(h => <th key={h} style={th}>{h}</th>)}</tr></thead>
                <tbody>
                  {units.rows.filter(u => u.status === "شاغرة").map(u => (
                    <tr key={u.id} onMouseEnter={e=>e.currentTarget.style.background=C.brdL} onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                      <td style={{...td,fontSize:12}}>{pName(u.property_id)}</td>
                      <td style={{...td,fontWeight:700}}>{u.number}</td>
                      <td style={td}>{u.type}</td>
                      <td style={td}>{u.floor}</td>
                      <td style={td}>{u.area} م²</td>
                      <td style={{...td,fontWeight:700,color:C.gold}}>{fmt(u.annual_rent)} ر.س</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {units.rows.filter(u => u.status === "شاغرة").length === 0 && <p style={{textAlign:"center",padding:40,color:C.succ,fontWeight:700}}>✅ جميع الوحدات مؤجرة!</p>}
            </div>
          </div>
        )}
      </div>
    );
  };

  // ══════════════════════════════════════════════════════════════
  //  MODAL FORMS
  // ══════════════════════════════════════════════════════════════
  const F = (label, key, type="text", opts=null, req=false) => (
    <div style={{marginBottom:14}}>
      <label style={lbl}>{label}{req && <span style={{color:C.dang}}> *</span>}</label>
      {opts ? (
        <select value={form[key]||""} onChange={e => setForm({...form,[key]:e.target.value})} style={inp}>
          <option value="">— اختر —</option>
          {opts.map(o => <option key={o.v??o} value={o.v??o}>{o.l??o}</option>)}
        </select>
      ) : <input type={type} value={form[key]||""} onChange={e => setForm({...form,[key]:e.target.value})} style={inp} required={req}/>}
    </div>
  );

  const modalForms = {
    property: (<div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"0 14px"}}>
      <div style={{gridColumn:"1/-1"}}>{F("اسم العقار","name","text",null,true)}</div>
      {F("النوع","type","text",["سكني","تجاري"],true)}
      {F("سنة البناء","year","number")}
      <div style={{gridColumn:"1/-1"}}>{F("الموقع","location","text",null,true)}</div>
      {F("القيمة السوقية (ر.س)","value","number")}
      {F("الحالة","status","text",["نشط","متوقف"])}
    </div>),
    unit: (<div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"0 14px"}}>
      {F("العقار","property_id","text",props.rows.map(p=>({v:p.id,l:p.name})),true)}
      {F("رقم الوحدة","number","text",null,true)}
      {F("النوع","type","text",["شقة","مكتب","معرض","محل","فيلا","استوديو"])}
      {F("الدور","floor","number")}
      {F("المساحة (م²)","area","number")}
      {F("الإيجار السنوي (ر.س)","annual_rent","number")}
      {F("الحالة","status","text",["شاغرة","مؤجرة","صيانة"])}
    </div>),
    tenant: (<div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"0 14px"}}>
      <div style={{gridColumn:"1/-1"}}>{F("الاسم الكامل","name","text",null,true)}</div>
      {F("رقم الهوية / السجل","id_number")}
      {F("رقم الجوال","phone","tel")}
      {F("البريد الإلكتروني","email","email")}
      {F("الجنسية","nationality","text",["سعودي","مقيم"])}
      {F("النوع","type","text",["فرد","شركة","مؤسسة","جهة حكومية"])}
    </div>),
    contract: (<div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"0 14px"}}>
      {F("المستأجر","tenant_id","text",tenants.rows.map(t=>({v:t.id,l:t.name})),true)}
      {F("الوحدة","unit_id","text",units.rows.map(u=>({v:u.id,l:`${u.number} — ${pName(u.property_id)}`})),true)}
      {F("تاريخ البداية","start_date","date",null,true)}
      {F("تاريخ النهاية","end_date","date",null,true)}
      {F("الإيجار السنوي (ر.س)","annual_rent","number",null,true)}
      {F("دورة السداد","payment_cycle","text",["شهري","ربع سنوي","نصف سنوي","سنوي"])}
      {F("رقم إيجار","ejar_number")}
      {F("الحالة","status","text",["ساري","منتهي","ملغي"])}
    </div>),
    payment: (<div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"0 14px"}}>
      {F("العقد","contract_id","text",conts.rows.map(c=>({v:c.id,l:`${c.ejar_number} — ${tName(c.tenant_id)}`})),true)}
      {F("المبلغ (ر.س)","amount","number",null,true)}
      {F("التاريخ","date","date")}
      {F("طريقة الدفع","method","text",["تحويل بنكي","سداد","شيك","نقدي","مدى"])}
      {F("النوع","type","text",["إيجار","عربون","صيانة","غرامة","تأمين"])}
      {F("الحالة","status","text",["مدفوع","معلق","متأخر"])}
      <div style={{gridColumn:"1/-1"}}>{F("ملاحظات","note")}</div>
    </div>),
    maintenance: (<div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"0 14px"}}>
      {F("العقار","property_id","text",props.rows.map(p=>({v:p.id,l:p.name})))}
      {F("الوحدة","unit_id","text",units.rows.map(u=>({v:u.id,l:`${u.number} — ${pName(u.property_id)}`})),true)}
      {F("الفئة","category","text",["سباكة","كهرباء","تكييف","دهانات","عام"])}
      {F("الأولوية","priority","text",["منخفضة","متوسطة","عالية","طارئة"])}
      {F("الحالة","status","text",["جديد","قيد التنفيذ","مكتمل"])}
      {F("التاريخ","date","date")}
      {F("التكلفة (ر.س)","cost","number")}
      <div style={{gridColumn:"1/-1"}}>{F("وصف المشكلة","description","text",null,true)}</div>
    </div>),
    expense: (<div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"0 14px"}}>
      {F("العقار","property_id","text",props.rows.map(p=>({v:p.id,l:p.name})),true)}
      {F("الفئة","category","text",["صيانة عامة","أمن وحراسة","تأمين","مياه وكهرباء","نظافة","إدارة","أخرى"])}
      {F("المبلغ (ر.س)","amount","number",null,true)}
      {F("التاريخ","date","date")}
      {F("الحالة","status","text",["مدفوع","معلق"])}
      <div style={{gridColumn:"1/-1"}}>{F("الوصف","description","text",null,true)}</div>
    </div>),
  };

  const modalTitles = { property:"بيانات العقار", unit:"بيانات الوحدة", tenant:"بيانات المستأجر", contract:"بيانات العقد", payment:"تسجيل دفعة", maintenance:"طلب صيانة", expense:"مصروف تشغيلي" };

  // ══════════════════════════════════════════════════════════════
  //  NAVIGATION
  // ══════════════════════════════════════════════════════════════
  const menu = [
    {k:"dashboard",icon:"📊",l:"لوحة التحكم"},
    {k:"properties",icon:"🏢",l:"العقارات"},
    {k:"units",icon:"🏠",l:"الوحدات"},
    {k:"tenants",icon:"👥",l:"المستأجرين"},
    {k:"contracts",icon:"📋",l:"العقود"},
    {k:"payments",icon:"💰",l:"المالية"},
    {k:"expenses",icon:"📉",l:"المصروفات"},
    {k:"maintenance",icon:"🔧",l:"الصيانة"},
    {k:"reports",icon:"📈",l:"التقارير"},
  ];

  const renderPage = () => {
    if (page === "dashboard")   return renderDashboard();
    if (page === "reports")     return renderReports();
    if (page === "properties")  return <TablePage title="إدارة العقارات" icon="🏢" hook={props} type="property" addDefaults={{type:"سكني",status:"نشط",value:0}} filterOptions={[{v:"all",l:"الكل"},{v:"سكني",l:"سكني"},{v:"تجاري",l:"تجاري"}]} cols={[{k:"name",h:"الاسم",style:{fontWeight:700}},{k:"type",h:"النوع"},{k:"location",h:"الموقع"},{k:"year",h:"السنة"},{k:"value",h:"القيمة",fmt:true},{k:"status",h:"الحالة",badge:true}]}/>;
    if (page === "units")       return <TablePage title="إدارة الوحدات" icon="🏠" hook={units} type="unit" addDefaults={{status:"شاغرة",type:"شقة",floor:1}} filterOptions={[{v:"all",l:"الكل"},{v:"مؤجرة",l:"مؤجرة"},{v:"شاغرة",l:"شاغرة"}]} cols={[{k:"number",h:"رقم الوحدة",style:{fontWeight:700}},{k:"property_id",h:"العقار",render:r=>pName(r.property_id)},{k:"type",h:"النوع"},{k:"floor",h:"الدور"},{k:"area",h:"المساحة",render:r=>`${r.area}م²`},{k:"annual_rent",h:"الإيجار السنوي",fmt:true},{k:"status",h:"الحالة",badge:true}]}/>;
    if (page === "tenants")     return <TablePage title="إدارة المستأجرين" icon="👥" hook={tenants} type="tenant" addDefaults={{nationality:"سعودي",type:"فرد"}} cols={[{k:"name",h:"الاسم",style:{fontWeight:700}},{k:"id_number",h:"الهوية"},{k:"phone",h:"الجوال"},{k:"email",h:"البريد"},{k:"type",h:"النوع"},{k:"nationality",h:"الجنسية"}]}/>;
    if (page === "contracts")   return <TablePage title="إدارة العقود" icon="📋" hook={conts} type="contract" addDefaults={{status:"ساري",payment_cycle:"ربع سنوي",annual_rent:0}} filterOptions={[{v:"all",l:"الكل"},{v:"ساري",l:"ساري"},{v:"منتهي",l:"منتهي"}]} cols={[{k:"ejar_number",h:"رقم إيجار",style:{fontWeight:700,color:C.priLL,fontSize:12}},{k:"tenant_id",h:"المستأجر",render:r=>tName(r.tenant_id)},{k:"unit_id",h:"الوحدة",render:r=>uLabel(r.unit_id)},{k:"start_date",h:"البداية"},{k:"end_date",h:"النهاية"},{k:"annual_rent",h:"الإيجار",fmt:true},{k:"payment_cycle",h:"الدورة"},{k:"status",h:"الحالة",badge:true}]}/>;
    if (page === "payments")    return <TablePage title="الإدارة المالية" icon="💰" hook={pays} type="payment" addDefaults={{status:"مدفوع",type:"إيجار",method:"تحويل بنكي",date:new Date().toISOString().split("T")[0],amount:0}} filterOptions={[{v:"all",l:"الكل"},{v:"مدفوع",l:"مدفوع"},{v:"معلق",l:"معلق"},{v:"متأخر",l:"متأخر"}]} cols={[{k:"contract_id",h:"المستأجر",render:r=>{const c=conts.rows.find(c=>c.id===r.contract_id);return c?tName(c.tenant_id):"—"}},{k:"amount",h:"المبلغ",fmt:true},{k:"date",h:"التاريخ"},{k:"method",h:"الطريقة"},{k:"type",h:"النوع"},{k:"note",h:"ملاحظات",style:{fontSize:11}},{k:"status",h:"الحالة",badge:true}]}/>;
    if (page === "expenses")    return <TablePage title="المصروفات التشغيلية" icon="📉" hook={exps} type="expense" addDefaults={{status:"مدفوع",date:new Date().toISOString().split("T")[0],amount:0}} filterOptions={[{v:"all",l:"الكل"},{v:"مدفوع",l:"مدفوع"},{v:"معلق",l:"معلق"}]} cols={[{k:"property_id",h:"العقار",render:r=>pName(r.property_id)},{k:"category",h:"الفئة"},{k:"amount",h:"المبلغ",fmt:true},{k:"date",h:"التاريخ"},{k:"description",h:"الوصف"},{k:"status",h:"الحالة",badge:true}]}/>;
    if (page === "maintenance") return <TablePage title="إدارة الصيانة" icon="🔧" hook={maints} type="maintenance" addDefaults={{status:"جديد",priority:"متوسطة",date:new Date().toISOString().split("T")[0],cost:0}} filterOptions={[{v:"all",l:"الكل"},{v:"جديد",l:"جديد"},{v:"قيد التنفيذ",l:"قيد التنفيذ"},{v:"مكتمل",l:"مكتمل"}]} cols={[{k:"unit_id",h:"الوحدة",render:r=>uLabel(r.unit_id)},{k:"category",h:"الفئة"},{k:"description",h:"الوصف",style:{fontSize:12}},{k:"priority",h:"الأولوية",render:r=><span style={{color:r.priority==="عالية"?C.dang:r.priority==="متوسطة"?C.warn:C.info,fontWeight:700}}>{r.priority}</span>},{k:"cost",h:"التكلفة",fmt:true},{k:"date",h:"التاريخ"},{k:"status",h:"الحالة",badge:true}]}/>;
    return null;
  };

  // ══════════════════════════════════════════════════════════════
  //  MAIN RENDER
  // ══════════════════════════════════════════════════════════════
  return (
    <div dir="rtl" style={{display:"flex",height:"100vh",background:C.bg,fontFamily:"'Segoe UI',Tahoma,Arial,sans-serif",overflow:"hidden",color:C.txt,fontSize:14}}>

      {/* ── Sidebar ─────────────────────────────────────────── */}
      <div style={{width:sideOpen?245:64,background:C.aiGrad,transition:"width .3s",flexShrink:0,display:"flex",flexDirection:"column",overflow:"hidden"}}>
        {/* Logo */}
        <div style={{padding:"18px 14px",borderBottom:"1px solid rgba(255,255,255,.1)",display:"flex",alignItems:"center",gap:10}}>
          <div style={{flexShrink:0}}><Logo size={38}/></div>
          {sideOpen && <div>
            <div style={{background:C.goldGrad,WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",fontWeight:900,fontSize:14,letterSpacing:1}}>AL ODILA</div>
            <div style={{color:"rgba(255,255,255,.5)",fontSize:10,letterSpacing:2}}>REAL ESTATE</div>
          </div>}
        </div>
        {/* Nav */}
        <nav style={{flex:1,padding:"10px 7px",overflowY:"auto"}}>
          {menu.map(m => (
            <button key={m.k} onClick={() => go(m.k)} style={{width:"100%",display:"flex",alignItems:"center",gap:10,padding:"10px 10px",borderRadius:9,border:"none",cursor:"pointer",background:page===m.k?"rgba(201,164,76,.18)":"transparent",color:page===m.k?C.gold:"rgba(255,255,255,.72)",fontWeight:page===m.k?700:500,fontSize:13,fontFamily:"inherit",marginBottom:3,textAlign:"right",whiteSpace:"nowrap",borderRight:page===m.k?`3px solid ${C.gold}`:"3px solid transparent",transition:"all .15s"}}>
              <span style={{fontSize:17,flexShrink:0}}>{m.icon}</span>
              {sideOpen && m.l}
            </button>
          ))}
        </nav>
        {/* AI Quick Access */}
        {sideOpen && (
          <button onClick={() => setAiOpen(true)} style={{margin:"8px 10px",padding:"10px 12px",borderRadius:10,border:`1px solid rgba(201,164,76,.3)`,background:"rgba(201,164,76,.1)",color:C.gold,cursor:"pointer",fontFamily:"inherit",fontSize:13,fontWeight:700,display:"flex",alignItems:"center",gap:8}}>
            <span>🤖</span> مساعد الذكاء الاصطناعي
          </button>
        )}
        <button onClick={() => setSideOpen(!sideOpen)} style={{margin:"8px 7px",padding:10,borderRadius:9,border:"none",background:"rgba(255,255,255,.07)",color:"rgba(255,255,255,.6)",cursor:"pointer",fontSize:16,fontFamily:"inherit"}}>
          {sideOpen?"◄":"►"}
        </button>
      </div>

      {/* ── Main Area ────────────────────────────────────────── */}
      <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden"}}>
        {/* Header */}
        <div style={{background:C.card,borderBottom:`1px solid ${C.brd}`,padding:"0 22px",height:58,display:"flex",alignItems:"center",justifyContent:"space-between",flexShrink:0,boxShadow:"0 1px 10px rgba(0,0,0,0.05)"}}>
          <div style={{fontSize:15,fontWeight:700,color:C.txt}}>{menu.find(m=>m.k===page)?.icon} {menu.find(m=>m.k===page)?.l}</div>
          <div style={{display:"flex",alignItems:"center",gap:10}}>
            <div style={{position:"relative"}}>
              <button onClick={() => setNotifOpen(!notifOpen)} style={{background:C.brdL,border:"none",borderRadius:9,width:38,height:38,cursor:"pointer",fontSize:17,display:"flex",alignItems:"center",justifyContent:"center",position:"relative"}}>
                🔔
                {notifications.length > 0 && <span style={{position:"absolute",top:3,left:3,width:16,height:16,borderRadius:"50%",background:C.dang,color:"#fff",fontSize:9,fontWeight:700,display:"flex",alignItems:"center",justifyContent:"center"}}>{notifications.length}</span>}
              </button>
              {notifOpen && (
                <div style={{position:"absolute",top:46,left:0,width:310,background:C.card,borderRadius:14,boxShadow:"0 8px 30px rgba(0,0,0,.15)",border:`1px solid ${C.brd}`,zIndex:600,maxHeight:380,overflowY:"auto"}}>
                  <div style={{padding:"12px 16px",borderBottom:`1px solid ${C.brd}`,fontWeight:700,fontSize:13}}>التنبيهات ({notifications.length})</div>
                  {notifications.map((n,i) => (
                    <div key={i} onClick={() => go(n.page)} style={{padding:"10px 14px",borderBottom:`1px solid ${C.brdL}`,cursor:"pointer",display:"flex",gap:8}}>
                      <div style={{width:7,height:7,borderRadius:"50%",background:n.type==="dang"?C.dang:C.warn,marginTop:5,flexShrink:0}}/>
                      <div><div style={{fontSize:12,color:C.txt}}>{n.msg}</div><div style={{fontSize:10,color:C.txtL,marginTop:2}}>{n.date}</div></div>
                    </div>
                  ))}
                  {notifications.length===0&&<p style={{padding:20,color:C.txtL,textAlign:"center"}}>✅ لا توجد تنبيهات</p>}
                </div>
              )}
            </div>
            <div style={{width:34,height:34,borderRadius:"50%",background:C.aiGrad,display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer"}} onClick={() => setAiOpen(true)}>
              <Logo size={30}/>
            </div>
          </div>
        </div>

        {/* Content */}
        <div style={{flex:1,overflowY:"auto",padding:22}}>
          {renderPage()}
        </div>
      </div>

      {/* ══ AI ASSISTANT PANEL ══════════════════════════════════ */}
      {aiOpen && (
        <div style={{position:"fixed",inset:0,background:"rgba(10,22,40,.7)",zIndex:900,display:"flex",alignItems:"center",justifyContent:"center",padding:20}} onClick={() => setAiOpen(false)}>
          <div style={{background:C.card,borderRadius:20,boxShadow:"0 30px 80px rgba(0,0,0,.3)",width:"100%",maxWidth:680,height:"88vh",display:"flex",flexDirection:"column",overflow:"hidden"}} onClick={e => e.stopPropagation()}>

            {/* AI Header */}
            <div style={{background:C.aiGrad,padding:"16px 20px",display:"flex",alignItems:"center",gap:12,flexShrink:0}}>
              <Logo size={36}/>
              <div style={{flex:1}}>
                <div style={{background:C.goldGrad,WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",fontWeight:900,fontSize:15,letterSpacing:1}}>مساعد العضيلة الذكي</div>
                <div style={{color:"rgba(255,255,255,.6)",fontSize:11}}>مدعوم بـ Groq AI — llama-3.3-70b-versatile</div>
              </div>
              {/* Tabs */}
              <div style={{display:"flex",gap:6}}>
                {[{k:"chat",l:"💬 محادثة"},{k:"excel",l:"📊 استيراد Excel"}].map(t => (
                  <button key={t.k} onClick={() => setAiTab(t.k)} style={{padding:"6px 14px",borderRadius:8,border:"none",background:aiTab===t.k?"rgba(201,164,76,.3)":"rgba(255,255,255,.07)",color:aiTab===t.k?C.gold:"rgba(255,255,255,.7)",cursor:"pointer",fontSize:12,fontFamily:"inherit",fontWeight:aiTab===t.k?700:400}}>{t.l}</button>
                ))}
              </div>
              <button onClick={() => setAiOpen(false)} style={{background:"rgba(255,255,255,.1)",border:"none",borderRadius:8,width:30,height:30,cursor:"pointer",color:"rgba(255,255,255,.7)",fontSize:18,display:"flex",alignItems:"center",justifyContent:"center"}}>×</button>
            </div>

            {/* ── Chat Tab ── */}
            {aiTab === "chat" && (
              <>
                <div style={{flex:1,overflowY:"auto",padding:"16px 20px"}}>
                  {aiMsgs.map((m,i) => (
                    <div key={i} style={{display:"flex",gap:10,marginBottom:16,flexDirection:m.role==="user"?"row-reverse":"row"}}>
                      <div style={{width:32,height:32,borderRadius:"50%",background:m.role==="user"?`linear-gradient(135deg,${C.gold},${C.goldL})`:C.aiGrad,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,fontSize:m.role==="user"?14:10}}>
                        {m.role==="user"?"م":<Logo size={28}/>}
                      </div>
                      <div style={{maxWidth:"80%",background:m.role==="user"?`linear-gradient(135deg,${C.gold},${C.goldL})`:"#f8fafc",borderRadius:m.role==="user"?"14px 4px 14px 14px":"4px 14px 14px 14px",padding:"12px 16px",boxShadow:"0 2px 8px rgba(0,0,0,.08)"}}>
                        <div style={{fontSize:13,lineHeight:1.7,color:m.role==="user"?C.pri:C.txt,whiteSpace:"pre-wrap"}}>{m.content}</div>
                      </div>
                    </div>
                  ))}
                  {aiLoading && (
                    <div style={{display:"flex",gap:10,marginBottom:16}}>
                      <div style={{width:32,height:32,borderRadius:"50%",background:C.aiGrad,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}><Logo size={28}/></div>
                      <div style={{background:"#f8fafc",borderRadius:"4px 14px 14px 14px",padding:"14px 16px",boxShadow:"0 2px 8px rgba(0,0,0,.08)"}}>
                        <div style={{display:"flex",gap:5,alignItems:"center"}}>
                          {[0,1,2].map(i => <div key={i} style={{width:8,height:8,borderRadius:"50%",background:C.gold,animation:"pulse 1.2s infinite",animationDelay:`${i*0.2}s`}}/>)}
                          <style>{`@keyframes pulse { 0%,100%{opacity:.3;transform:scale(.7)} 50%{opacity:1;transform:scale(1)} }`}</style>
                        </div>
                      </div>
                    </div>
                  )}
                  <div ref={aiEndRef}/>
                </div>
                {/* Quick suggestions */}
                <div style={{padding:"8px 20px",display:"flex",gap:8,overflowX:"auto",flexShrink:0,borderTop:`1px solid ${C.brdL}`}}>
                  {["ما نسبة الإشغال الحالية؟","من المستأجرون المتأخرون؟","أعطني تقرير NOI","ما أفضل أداء عقار؟","اعرض الوحدات الشاغرة"].map(q => (
                    <button key={q} onClick={() => askAI(q)} style={{...btnS,whiteSpace:"nowrap",border:`1px solid ${C.brd}`,borderRadius:20,padding:"6px 14px"}}>{q}</button>
                  ))}
                </div>
                {/* Input */}
                <div style={{padding:"12px 20px",borderTop:`1px solid ${C.brd}`,display:"flex",gap:10,flexShrink:0}}>
                  <input value={aiInput} onChange={e => setAiInput(e.target.value)} onKeyDown={e => e.key==="Enter"&&!e.shiftKey&&askAI(aiInput)} placeholder="اسألني أي شيء عن محفظتك العقارية..." style={{...inp,flex:1,borderRadius:25,padding:"10px 18px"}} disabled={aiLoading}/>
                  <button onClick={() => askAI(aiInput)} disabled={aiLoading || !aiInput.trim()} style={{...btnG,borderRadius:25,padding:"10px 20px",opacity:(!aiInput.trim()||aiLoading)?.6:1}}>
                    {aiLoading ? "⏳" : "إرسال ←"}
                  </button>
                </div>
              </>
            )}

            {/* ── Excel Import Tab ── */}
            {aiTab === "excel" && (
              <div style={{flex:1,overflowY:"auto",padding:"20px"}}>
                <div style={{...card,marginBottom:16,borderRight:`4px solid ${C.gold}`}}>
                  <h4 style={{margin:"0 0 10px",color:C.txt}}>📊 كيف يعمل الاستيراد الذكي</h4>
                  <p style={{color:C.txtL,fontSize:13,lineHeight:1.7,margin:0}}>
                    الذكاء الاصطناعي يحلل ملف Excel أو CSV الخاص بك تلقائياً، يتعرف على الأعمدة ويطابقها مع نظام العضيلة، ويصلح أي أخطاء في البيانات قبل الاستيراد.
                  </p>
                </div>

                {/* Upload */}
                <div style={{border:`2px dashed ${C.gold}`,borderRadius:12,padding:"24px 20px",textAlign:"center",marginBottom:16,cursor:"pointer",background:"rgba(201,164,76,.04)"}} onClick={() => fileInputRef.current?.click()}>
                  <div style={{fontSize:36,marginBottom:8}}>📂</div>
                  <div style={{fontWeight:700,color:C.txt,marginBottom:4}}>انقر لرفع ملف Excel أو CSV</div>
                  <div style={{fontSize:12,color:C.txtL}}>أو الصق البيانات مباشرة في المربع أدناه</div>
                  <input ref={fileInputRef} type="file" accept=".xlsx,.xls,.csv" style={{display:"none"}} onChange={handleExcelFile}/>
                </div>

                <textarea value={excelText} onChange={e => setExcelText(e.target.value)} placeholder="أو الصق بيانات CSV/Excel هنا مباشرة...&#10;مثال:&#10;رقم الوحدة,العقار,الإيجار,الحالة&#10;A-101,برج العضيلة,35000,مؤجرة" style={{...inp,height:140,resize:"vertical",fontFamily:"monospace",fontSize:12}} dir="auto"/>

                <button onClick={analyzeExcel} disabled={excelLoading || !excelText.trim()} style={{...btnG,width:"100%",justifyContent:"center",marginTop:12,padding:"12px",fontSize:14,opacity:(!excelText.trim()||excelLoading)?".6":"1"}}>
                  {excelLoading ? "⏳ جاري التحليل بالذكاء الاصطناعي..." : "🤖 تحليل البيانات تلقائياً"}
                </button>

                {excelResult && !excelResult.imported && (
                  <div style={{...card,marginTop:16,borderRight:`4px solid ${excelResult.error?C.dang:C.succ}`}}>
                    {excelResult.error ? (
                      <div><h4 style={{color:C.dang,margin:"0 0 8px"}}>❌ خطأ في التحليل</h4><p style={{fontSize:12,color:C.txtL}}>{excelResult.error}</p></div>
                    ) : (
                      <>
                        <h4 style={{margin:"0 0 12px",color:C.succ}}>✅ تم التحليل — {excelResult.count} سجل ({excelResult.type})</h4>
                        {excelResult.summary && <p style={{fontSize:13,color:C.txtL,margin:"0 0 12px"}}>{excelResult.summary}</p>}
                        {excelResult.warnings?.length > 0 && (
                          <div style={{background:C.warnBg,borderRadius:8,padding:"10px 14px",marginBottom:12}}>
                            {excelResult.warnings.map((w,i) => <div key={i} style={{fontSize:12,color:C.warn}}>⚠️ {w}</div>)}
                          </div>
                        )}
                        {excelResult.errors?.length > 0 && (
                          <div style={{background:C.dangBg,borderRadius:8,padding:"10px 14px",marginBottom:12}}>
                            {excelResult.errors.map((e,i) => <div key={i} style={{fontSize:12,color:C.dang}}>❌ {e}</div>)}
                          </div>
                        )}
                        <div style={{maxHeight:160,overflowY:"auto",marginBottom:12,fontSize:12,fontFamily:"monospace",background:"#f8fafc",borderRadius:8,padding:10}}>
                          {JSON.stringify(excelResult.data?.slice(0,3), null, 2)}
                          {excelResult.data?.length > 3 && <div style={{color:C.txtL,marginTop:4}}>...و {excelResult.data.length - 3} سجل إضافي</div>}
                        </div>
                        <button onClick={importExcelData} style={{...btnG,width:"100%",justifyContent:"center",padding:"11px"}}>
                          ✅ استيراد {excelResult.count} سجل إلى النظام
                        </button>
                      </>
                    )}
                  </div>
                )}
                {excelResult?.imported && (
                  <div style={{...card,marginTop:16,borderRight:`4px solid ${C.succ}`,textAlign:"center",padding:24}}>
                    <div style={{fontSize:36,marginBottom:8}}>🎉</div>
                    <h4 style={{color:C.succ,margin:"0 0 6px"}}>تم الاستيراد بنجاح!</h4>
                    <p style={{color:C.txtL,fontSize:13}}>تم إضافة {excelResult.count} سجل إلى قاعدة بيانات Supabase</p>
                    <button onClick={() => { setExcelResult(null); setExcelText(""); }} style={btnS}>استيراد ملف آخر</button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Modal (Add/Edit) ─────────────────────────────────── */}
      {modal && (
        <div style={{position:"fixed",inset:0,background:"rgba(10,22,40,.6)",zIndex:1000,display:"flex",alignItems:"center",justifyContent:"center",padding:20}} onClick={() => { setModal(null); setForm({}); }}>
          <div style={{background:C.card,borderRadius:18,boxShadow:"0 24px 60px rgba(0,0,0,.22)",width:"100%",maxWidth:640,maxHeight:"90vh",overflow:"auto",direction:"rtl"}} onClick={e => e.stopPropagation()}>
            <div style={{padding:"18px 22px",borderBottom:`1px solid ${C.brd}`,display:"flex",justifyContent:"space-between",alignItems:"center",position:"sticky",top:0,background:C.card,zIndex:1}}>
              <h3 style={{margin:0,fontSize:17,color:C.txt}}>{form.id?"✏️ تعديل":"➕ إضافة"} {modalTitles[modal]}</h3>
              <button onClick={() => { setModal(null); setForm({}); }} style={{background:"none",border:"none",fontSize:22,cursor:"pointer",color:C.txtL}}>×</button>
            </div>
            <div style={{padding:"18px 22px"}}>{modalForms[modal]}</div>
            <div style={{padding:"14px 22px",borderTop:`1px solid ${C.brd}`,display:"flex",gap:10,justifyContent:"flex-end",background:C.brdL,borderRadius:"0 0 18px 18px"}}>
              <button style={{...btnG,background:"transparent",color:C.txt,border:`2px solid ${C.brd}`}} onClick={() => { setModal(null); setForm({}); }}>إلغاء</button>
              <button style={btnG} onClick={saveItem}>{form.id?"💾 حفظ التعديلات":"✅ إضافة"}</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Confirm Delete ──────────────────────────────────── */}
      {confirm && (
        <div style={{position:"fixed",inset:0,background:"rgba(10,22,40,.6)",zIndex:1100,display:"flex",alignItems:"center",justifyContent:"center",padding:20}}>
          <div style={{background:C.card,borderRadius:16,maxWidth:380,width:"100%",padding:28,textAlign:"center",boxShadow:"0 20px 50px rgba(0,0,0,.2)"}}>
            <div style={{fontSize:40,marginBottom:12}}>⚠️</div>
            <h3 style={{margin:"0 0 10px",color:C.txt}}>تأكيد الحذف</h3>
            <p style={{color:C.txtL,fontSize:14,marginBottom:22}}>هل أنت متأكد من حذف <b style={{color:C.dang}}>"{confirm.name}"</b>؟ هذا الإجراء لا يمكن التراجع عنه.</p>
            <div style={{display:"flex",gap:10,justifyContent:"center"}}>
              <button style={{...btnG,background:"transparent",border:`2px solid ${C.brd}`,color:C.txt}} onClick={() => setConfirm(null)}>إلغاء</button>
              <button style={{...btnG,background:"linear-gradient(135deg,#b91c1c,#dc2626)",color:"#fff"}} onClick={doDelete}>🗑️ نعم، احذف</button>
            </div>
          </div>
        </div>
      )}

      {/* Backdrop to close panels */}
      {notifOpen && <div style={{position:"fixed",inset:0,zIndex:599}} onClick={() => setNotifOpen(false)}/>}
    </div>
  );
}
