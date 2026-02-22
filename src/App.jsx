import { useState, useRef } from "react";

const SME_CRITERIA = {
  "製造業・建設業・運輸業": { capital: 30000, employees: 300 },
  "卸売業": { capital: 10000, employees: 100 },
  "サービス業": { capital: 5000, employees: 100 },
  "小売業": { capital: 5000, employees: 50 },
  "その他の業種（農業・漁業・林業等）": { capital: 30000, employees: 300 },
};

const SUBSIDY_RATES = {
  sme: { expenseRate: 0.75, wagePerHour: 1000 },
  large: { expenseRate: 0.60, wagePerHour: 500 },
};

const EXPENSE_LIMITS = {
  sme: { tier1: 300000, tier2: 400000, tier3: 500000 },
  large: { tier1: 200000, tier2: 250000, tier3: 300000 },
};

function getExpenseLimit(size, totalHours) {
  const limits = EXPENSE_LIMITS[size];
  if (totalHours >= 200) return limits.tier3;
  if (totalHours >= 100) return limits.tier2;
  return limits.tier1;
}

function formatYen(num) {
  return new Intl.NumberFormat("ja-JP").format(Math.floor(num)) + "円";
}

const ELIGIBILITY_CHECKS = [
  { id: "e1", text: "雇用保険適用事業所である", critical: true },
  { id: "e2", text: "受講対象者は全員雇用保険被保険者である", critical: true },
  { id: "e3", text: "訓練時間は10時間以上を予定している", critical: true },
  { id: "e4", text: "OFF-JT（業務と区別した訓練）として実施する", critical: true },
  { id: "e5", text: "事業展開（新規事業・DX・GX等）に関連する訓練である", critical: true },
  { id: "e6", text: "事業展開は訓練開始日から3年以内に実施予定、または6ヶ月以内に実施済み", critical: true },
  { id: "e7", text: "職業能力開発推進者を選任している（または選任予定）", critical: false },
  { id: "e8", text: "事業内職業能力開発計画を策定している（または策定予定）", critical: false },
  { id: "e9", text: "過去に同助成金で離職率50%以上が2回以上発生していない", critical: true },
  { id: "e10", text: "訓練経費は全額事業主が負担する（受講者負担なし）", critical: true },
  { id: "e11", text: "訓練期間中、受講者に賃金を適正に支払う", critical: true },
  { id: "e12", text: "受講者は訓練時間の80%以上を受講できる見込みがある", critical: false },
];

const TASK_LIST = [
  {
    phase: "Step 0：事前準備",
    tasks: [
      "職業能力開発推進者の選任（未選任の場合）",
      "事業内職業能力開発計画の策定",
      "上記計画を自社の労働者へ周知",
    ],
  },
  {
    phase: "Step 1：計画届の提出（訓練開始6ヶ月前〜1ヶ月前）",
    tasks: [
      "職業訓練実施計画届（様式第1-1号）の作成",
      "事業展開等実施計画（様式第1-3号）の作成",
      "対象労働者一覧（様式第3-1号）の作成",
      "事前確認書（様式第11号）の作成",
      "訓練カリキュラム・受講案内等の準備",
      "【事業内訓練の場合】OFF-JT講師要件確認書（様式第10号）の作成",
      "【事業外訓練の場合】教育訓練機関との契約書・受講案内・申込書の写し準備",
      "管轄労働局へ計画届を提出",
    ],
  },
  {
    phase: "Step 2：訓練実施",
    tasks: [
      "計画に基づき訓練を実施",
      "受講者の出席・受講状況を記録",
      "訓練経費の全額を支払い（支給申請までに完了）",
    ],
  },
  {
    phase: "Step 3：支給申請（訓練終了翌日から2ヶ月以内）",
    tasks: [
      "支給申請書（様式第4-2号）の作成",
      "賃金助成の内訳（様式第5号）の作成",
      "経費助成の内訳（様式第6-2号）の作成",
      "OFF-JT実施状況報告書（様式第8-1号）の作成",
      "受講者の雇用契約書または労働条件通知書の写し",
      "受講者の賃金台帳または給与明細書の写し",
      "受講者の出勤簿またはタイムカードの写し",
      "【事業外訓練の場合】支給申請承諾書（様式第12号）",
      "訓練経費の請求書・領収書または振込通知書の写し",
      "管轄労働局へ支給申請書を提出",
    ],
  },
];

function TabButton({ active, onClick, children, icon }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: "12px 20px",
        border: "none",
        borderBottom: active ? "3px solid #1a56db" : "3px solid transparent",
        background: active ? "rgba(26, 86, 219, 0.06)" : "transparent",
        color: active ? "#1a56db" : "#64748b",
        fontWeight: active ? 700 : 500,
        fontSize: "14px",
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        gap: "6px",
        transition: "all 0.2s",
        fontFamily: "inherit",
      }}
    >
      <span style={{ fontSize: "16px" }}>{icon}</span>
      {children}
    </button>
  );
}

function InputGroup({ label, children, hint }) {
  return (
    <div style={{ marginBottom: "16px" }}>
      <label
        style={{
          display: "block",
          fontSize: "13px",
          fontWeight: 600,
          color: "#374151",
          marginBottom: "6px",
        }}
      >
        {label}
      </label>
      {children}
      {hint && (
        <p style={{ fontSize: "11px", color: "#9ca3af", marginTop: "4px" }}>
          {hint}
        </p>
      )}
    </div>
  );
}

function NumberInput({ value, onChange, placeholder, suffix, min = 0 }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
      <input
        type="number"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        min={min}
        style={{
          flex: 1,
          padding: "10px 12px",
          border: "1.5px solid #d1d5db",
          borderRadius: "8px",
          fontSize: "15px",
          fontFamily: "'DM Mono', monospace",
          outline: "none",
          transition: "border 0.2s",
          background: "#fff",
        }}
        onFocus={(e) => (e.target.style.borderColor = "#1a56db")}
        onBlur={(e) => (e.target.style.borderColor = "#d1d5db")}
      />
      {suffix && (
        <span style={{ fontSize: "13px", color: "#6b7280", whiteSpace: "nowrap" }}>
          {suffix}
        </span>
      )}
    </div>
  );
}

function SelectInput({ value, onChange, options }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      style={{
        width: "100%",
        padding: "10px 12px",
        border: "1.5px solid #d1d5db",
        borderRadius: "8px",
        fontSize: "14px",
        outline: "none",
        background: "#fff",
        cursor: "pointer",
        fontFamily: "inherit",
      }}
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

function ResultCard({ label, value, sub, accent }) {
  return (
    <div
      style={{
        background: accent ? "linear-gradient(135deg, #1a56db, #3b82f6)" : "#f8fafc",
        border: accent ? "none" : "1.5px solid #e2e8f0",
        borderRadius: "12px",
        padding: "18px",
        textAlign: "center",
      }}
    >
      <div
        style={{
          fontSize: "12px",
          fontWeight: 600,
          color: accent ? "rgba(255,255,255,0.8)" : "#64748b",
          marginBottom: "6px",
          letterSpacing: "0.5px",
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontSize: "22px",
          fontWeight: 800,
          color: accent ? "#fff" : "#1e293b",
          fontFamily: "'DM Mono', monospace",
        }}
      >
        {value}
      </div>
      {sub && (
        <div
          style={{
            fontSize: "11px",
            color: accent ? "rgba(255,255,255,0.7)" : "#94a3b8",
            marginTop: "4px",
          }}
        >
          {sub}
        </div>
      )}
    </div>
  );
}

export default function App() {
  const [tab, setTab] = useState("calc");
  const [industry, setIndustry] = useState("製造業・建設業・運輸業");
  const [capital, setCapital] = useState("");
  const [employees, setEmployees] = useState("");
  const [trainees, setTrainees] = useState("");
  const [days, setDays] = useState("4");
  const [hoursPerDay, setHoursPerDay] = useState("7");
  const [costPerPerson, setCostPerPerson] = useState("");
  const [checks, setChecks] = useState({});
  const [taskChecks, setTaskChecks] = useState({});
  const printRef = useRef(null);

  // Determine company size
  const criteria = SME_CRITERIA[industry];
  const capitalNum = parseFloat(capital) || 0;
  const employeesNum = parseInt(employees) || 0;
  const isSME =
    capitalNum <= criteria.capital || employeesNum <= criteria.employees;
  const sizeKey = isSME ? "sme" : "large";
  const sizeLabel = isSME ? "中小企業" : "大企業";

  // Calculate
  const traineesNum = parseInt(trainees) || 0;
  const daysNum = parseInt(days) || 0;
  const hoursNum = parseFloat(hoursPerDay) || 0;
  const totalHours = daysNum * hoursNum;
  const costPerPersonNum = parseFloat(costPerPerson) || 0;
  const totalCost = costPerPersonNum * traineesNum;

  const rates = SUBSIDY_RATES[sizeKey];
  const expenseLimit = getExpenseLimit(sizeKey, totalHours);

  const expensePerPerson = Math.min(costPerPersonNum * rates.expenseRate, expenseLimit);
  const totalExpenseSubsidy = expensePerPerson * traineesNum;
  const wageSubsidyPerPerson = totalHours * rates.wagePerHour;
  const totalWageSubsidy = wageSubsidyPerPerson * traineesNum;
  const totalSubsidy = Math.min(totalExpenseSubsidy + totalWageSubsidy, 100000000);
  const netCost = totalCost - totalExpenseSubsidy;

  const isValid = totalHours >= 10 && traineesNum > 0 && costPerPersonNum > 0;

  const toggleCheck = (id) => {
    setChecks((prev) => ({ ...prev, [id]: !prev[id] }));
  };
  const toggleTask = (key) => {
    setTaskChecks((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const allCriticalPassed = ELIGIBILITY_CHECKS.filter((c) => c.critical).every(
    (c) => checks[c.id]
  );

  const handlePDF = () => {
    const w = window.open("", "_blank");
    const checklistHTML = ELIGIBILITY_CHECKS.map(
      (c) =>
        `<tr><td style="padding:6px 10px;border:1px solid #ddd;">${checks[c.id] ? "✅" : "⬜"}</td><td style="padding:6px 10px;border:1px solid #ddd;">${c.text}</td><td style="padding:6px 10px;border:1px solid #ddd;color:${c.critical ? "#dc2626" : "#2563eb"}">${c.critical ? "必須" : "推奨"}</td></tr>`
    ).join("");

    const taskHTML = TASK_LIST.map(
      (phase) =>
        `<h3 style="margin:16px 0 8px;color:#1a56db;">${phase.phase}</h3>` +
        phase.tasks
          .map(
            (t, i) => {
              const key = `${phase.phase}-${i}`;
              return `<div style="padding:4px 0;"><span>${taskChecks[key] ? "✅" : "⬜"}</span> ${t}</div>`;
            }
          )
          .join("")
    ).join("");

    w.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>助成金シミュレーション結果</title>
<style>
  body{font-family:'Hiragino Sans','Yu Gothic',sans-serif;max-width:800px;margin:0 auto;padding:40px 30px;color:#1e293b;font-size:13px;}
  h1{font-size:20px;color:#1a56db;border-bottom:2px solid #1a56db;padding-bottom:8px;}
  h2{font-size:16px;margin-top:28px;color:#334155;border-left:4px solid #1a56db;padding-left:10px;}
  table{border-collapse:collapse;width:100%;margin:10px 0;}
  th{background:#f1f5f9;padding:8px 10px;border:1px solid #ddd;text-align:left;font-size:12px;}
  td{padding:8px 10px;border:1px solid #ddd;font-size:12px;}
  .highlight{background:#eff6ff;padding:16px;border-radius:8px;margin:12px 0;}
  .note{font-size:11px;color:#64748b;margin-top:20px;padding-top:10px;border-top:1px solid #e5e7eb;}
  @media print{body{padding:20px;}}
</style></head><body>
<h1>人材開発支援助成金（事業展開等リスキリング支援コース）<br>シミュレーション結果</h1>
<p style="color:#64748b;font-size:12px;">作成日：${new Date().toLocaleDateString("ja-JP")}</p>

<h2>企業情報・訓練概要</h2>
<table>
<tr><th>業種</th><td>${industry}</td></tr>
<tr><th>資本金</th><td>${capital ? formatYen(capitalNum * 10000) : "未入力"}</td></tr>
<tr><th>従業員数</th><td>${employeesNum || "未入力"}名</td></tr>
<tr><th>企業規模判定</th><td style="font-weight:bold;color:${isSME ? "#059669" : "#2563eb"}">${sizeLabel}</td></tr>
<tr><th>受講予定者数</th><td>${traineesNum}名</td></tr>
<tr><th>訓練日数</th><td>${daysNum}日間</td></tr>
<tr><th>1日あたり訓練時間</th><td>${hoursNum}時間</td></tr>
<tr><th>総訓練時間</th><td>${totalHours}時間</td></tr>
<tr><th>1人あたり訓練経費</th><td>${formatYen(costPerPersonNum)}</td></tr>
</table>

<h2>助成金シミュレーション</h2>
<div class="highlight">
<table>
<tr><th>項目</th><th>金額</th><th>備考</th></tr>
<tr><td>訓練経費合計</td><td style="text-align:right;font-weight:bold;">${formatYen(totalCost)}</td><td>${formatYen(costPerPersonNum)} × ${traineesNum}名</td></tr>
<tr><td>経費助成</td><td style="text-align:right;font-weight:bold;">${formatYen(totalExpenseSubsidy)}</td><td>助成率${rates.expenseRate * 100}%（上限: ${formatYen(expenseLimit)}/人）</td></tr>
<tr><td>賃金助成</td><td style="text-align:right;font-weight:bold;">${formatYen(totalWageSubsidy)}</td><td>${formatYen(rates.wagePerHour)}/時間 × ${totalHours}h × ${traineesNum}名</td></tr>
<tr style="background:#dbeafe;"><td style="font-weight:bold;">助成金合計</td><td style="text-align:right;font-weight:bold;color:#1a56db;font-size:15px;">${formatYen(totalSubsidy)}</td><td></td></tr>
<tr style="background:#f0fdf4;"><td style="font-weight:bold;">実質負担額A（経費助成のみ差引）</td><td style="text-align:right;font-weight:bold;color:#059669;font-size:15px;">${formatYen(netCost)}</td><td>1人あたり：${formatYen(Math.floor(netCost / traineesNum))}</td></tr>
<tr style="background:#e6fffa;"><td style="font-weight:bold;">実質負担額B（賃金助成も含む）</td><td style="text-align:right;font-weight:bold;color:#0d9488;font-size:15px;">${formatYen(Math.max(netCost - totalWageSubsidy, 0))}</td><td>1人あたり：${formatYen(Math.floor(Math.max(netCost - totalWageSubsidy, 0) / traineesNum))}</td></tr>
</table>
</div>
<p style="font-size:11px;color:#94a3b8;">※ 実質負担額A：訓練経費から経費助成を差し引いた額（直接的な研修コスト負担）<br>※ 実質負担額B：さらに賃金助成を差し引いた額（賃金助成は訓練中の人件費補填として別途受給）</p>

<h2>申請要件チェックリスト</h2>
<table>
<tr><th style="width:40px;">✓</th><th>要件</th><th style="width:60px;">区分</th></tr>
${checklistHTML}
</table>

<h2>準備タスクリスト</h2>
${taskHTML}

<div class="note">
<p>⚠️ 本シミュレーションは概算です。実際の助成金額は審査により変動する場合があります。</p>
<p>⚠️ 令和7年度（2025年4月〜2026年3月）の要項に基づいています。</p>
<p>⚠️ 詳細は管轄労働局にご確認ください。</p>
<p style="margin-top:8px;">作成：CX Value Lab株式会社</p>
</div>
</body></html>`);
    w.document.close();
    setTimeout(() => w.print(), 500);
  };

  return (
    <div
      style={{
        fontFamily: "'Noto Sans JP', 'Hiragino Sans', sans-serif",
        background: "#f0f4f8",
        minHeight: "100vh",
        padding: "0",
      }}
    >
      <link
        href="https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@400;500;600;700;800&family=DM+Mono:wght@400;500&display=swap"
        rel="stylesheet"
      />

      {/* Header */}
      <div
        style={{
          background: "linear-gradient(135deg, #0f172a 0%, #1e3a5f 100%)",
          padding: "24px 24px 16px",
          color: "#fff",
        }}
      >
        <div
          style={{
            fontSize: "10px",
            letterSpacing: "2px",
            textTransform: "uppercase",
            color: "rgba(255,255,255,0.5)",
            marginBottom: "6px",
          }}
        >
          人材開発支援助成金
        </div>
        <h1
          style={{
            fontSize: "18px",
            fontWeight: 800,
            margin: 0,
            lineHeight: 1.4,
          }}
        >
          事業展開等リスキリング支援コース
          <br />
          <span style={{ color: "#60a5fa", fontSize: "14px", fontWeight: 600 }}>
            助成金シミュレーター
          </span>
        </h1>
        <div
          style={{
            fontSize: "11px",
            color: "rgba(255,255,255,0.4)",
            marginTop: "8px",
          }}
        >
          令和7年度（2025.4〜2026.3）対応
        </div>
      </div>

      {/* Tabs */}
      <div
        style={{
          display: "flex",
          background: "#fff",
          borderBottom: "1px solid #e2e8f0",
          overflowX: "auto",
        }}
      >
        <TabButton
          active={tab === "calc"}
          onClick={() => setTab("calc")}
          icon="📊"
        >
          シミュレーション
        </TabButton>
        <TabButton
          active={tab === "check"}
          onClick={() => setTab("check")}
          icon="✅"
        >
          要件チェック
        </TabButton>
        <TabButton
          active={tab === "task"}
          onClick={() => setTab("task")}
          icon="📋"
        >
          タスクリスト
        </TabButton>
      </div>

      <div style={{ padding: "20px", maxWidth: "600px", margin: "0 auto" }}>
        {/* ===== CALC TAB ===== */}
        {tab === "calc" && (
          <div ref={printRef}>
            {/* Company Info */}
            <div
              style={{
                background: "#fff",
                borderRadius: "14px",
                padding: "20px",
                marginBottom: "16px",
                boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
              }}
            >
              <h2
                style={{
                  fontSize: "14px",
                  fontWeight: 700,
                  color: "#334155",
                  margin: "0 0 16px",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                }}
              >
                <span
                  style={{
                    background: "#eff6ff",
                    borderRadius: "6px",
                    padding: "4px 8px",
                    fontSize: "12px",
                  }}
                >
                  🏢
                </span>
                企業情報
              </h2>

              <InputGroup label="業種区分（企業規模判定用）">
                <SelectInput
                  value={industry}
                  onChange={setIndustry}
                  options={Object.keys(SME_CRITERIA).map((k) => ({
                    value: k,
                    label: k,
                  }))}
                />
              </InputGroup>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <InputGroup label="資本金" hint="万円単位で入力">
                  <NumberInput
                    value={capital}
                    onChange={setCapital}
                    placeholder="3000"
                    suffix="万円"
                  />
                </InputGroup>
                <InputGroup label="従業員数">
                  <NumberInput
                    value={employees}
                    onChange={setEmployees}
                    placeholder="50"
                    suffix="名"
                  />
                </InputGroup>
              </div>

              {(capital || employees) && (
                <div
                  style={{
                    background: isSME ? "#f0fdf4" : "#eff6ff",
                    border: `1.5px solid ${isSME ? "#86efac" : "#93c5fd"}`,
                    borderRadius: "8px",
                    padding: "10px 14px",
                    fontSize: "13px",
                    fontWeight: 600,
                    color: isSME ? "#166534" : "#1e40af",
                    textAlign: "center",
                  }}
                >
                  判定結果：{sizeLabel}
                  <span style={{ fontWeight: 400, fontSize: "11px", marginLeft: "8px" }}>
                    （経費助成率 {rates.expenseRate * 100}% / 賃金助成{" "}
                    {formatYen(rates.wagePerHour)}/h）
                  </span>
                </div>
              )}
            </div>

            {/* Training Info */}
            <div
              style={{
                background: "#fff",
                borderRadius: "14px",
                padding: "20px",
                marginBottom: "16px",
                boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
              }}
            >
              <h2
                style={{
                  fontSize: "14px",
                  fontWeight: 700,
                  color: "#334155",
                  margin: "0 0 16px",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                }}
              >
                <span
                  style={{
                    background: "#fef3c7",
                    borderRadius: "6px",
                    padding: "4px 8px",
                    fontSize: "12px",
                  }}
                >
                  📚
                </span>
                訓練情報
              </h2>

              <InputGroup label="受講者数">
                <NumberInput
                  value={trainees}
                  onChange={setTrainees}
                  placeholder="4"
                  suffix="名"
                  min={1}
                />
              </InputGroup>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <InputGroup label="訓練日数">
                  <NumberInput
                    value={days}
                    onChange={setDays}
                    placeholder="4"
                    suffix="日間"
                    min={1}
                  />
                </InputGroup>
                <InputGroup label="1日の訓練時間">
                  <NumberInput
                    value={hoursPerDay}
                    onChange={setHoursPerDay}
                    placeholder="7"
                    suffix="時間"
                    min={1}
                  />
                </InputGroup>
              </div>

              <div
                style={{
                  background: "#f8fafc",
                  borderRadius: "8px",
                  padding: "8px 12px",
                  fontSize: "12px",
                  color: "#64748b",
                  marginBottom: "12px",
                }}
              >
                総訓練時間：
                <strong style={{ color: totalHours >= 10 ? "#059669" : "#dc2626" }}>
                  {totalHours}時間
                </strong>
                {totalHours < 10 && totalHours > 0 && (
                  <span style={{ color: "#dc2626", marginLeft: "8px" }}>
                    ⚠️ 10時間以上必要
                  </span>
                )}
              </div>

              <InputGroup
                label="1人あたり研修費用"
                hint="AI研修の場合、1日約10,000円 × 日数 が目安"
              >
                <NumberInput
                  value={costPerPerson}
                  onChange={setCostPerPerson}
                  placeholder="40000"
                  suffix="円"
                />
              </InputGroup>
            </div>

            {/* Results */}
            {isValid && (
              <div
                style={{
                  background: "#fff",
                  borderRadius: "14px",
                  padding: "20px",
                  marginBottom: "16px",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
                }}
              >
                <h2
                  style={{
                    fontSize: "14px",
                    fontWeight: 700,
                    color: "#334155",
                    margin: "0 0 16px",
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                  }}
                >
                  <span
                    style={{
                      background: "#dcfce7",
                      borderRadius: "6px",
                      padding: "4px 8px",
                      fontSize: "12px",
                    }}
                  >
                    💰
                  </span>
                  シミュレーション結果
                </h2>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: "10px",
                    marginBottom: "12px",
                  }}
                >
                  <ResultCard
                    label="訓練経費合計"
                    value={formatYen(totalCost)}
                    sub={`${formatYen(costPerPersonNum)} × ${traineesNum}名`}
                  />
                  <ResultCard
                    label="経費助成"
                    value={formatYen(totalExpenseSubsidy)}
                    sub={`助成率${rates.expenseRate * 100}%`}
                  />
                  <ResultCard
                    label="賃金助成"
                    value={formatYen(totalWageSubsidy)}
                    sub={`${formatYen(rates.wagePerHour)}/h × ${totalHours}h × ${traineesNum}名`}
                  />
                  <ResultCard
                    label="助成金合計"
                    value={formatYen(totalSubsidy)}
                    accent
                  />
                </div>

                {/* 実質負担額A: 経費助成のみ差引 */}
                <div
                  style={{
                    background: "linear-gradient(135deg, #059669, #10b981)",
                    borderRadius: "12px",
                    padding: "18px",
                    textAlign: "center",
                    color: "#fff",
                    marginBottom: "10px",
                  }}
                >
                  <div
                    style={{
                      fontSize: "12px",
                      fontWeight: 600,
                      opacity: 0.8,
                      marginBottom: "4px",
                    }}
                  >
                    実質負担額A（訓練経費 − 経費助成）
                  </div>
                  <div
                    style={{
                      fontSize: "26px",
                      fontWeight: 800,
                      fontFamily: "'DM Mono', monospace",
                    }}
                  >
                    {formatYen(netCost)}
                  </div>
                  <div style={{ fontSize: "12px", opacity: 0.85, marginTop: "6px" }}>
                    👤 1人あたり：{formatYen(Math.floor(netCost / traineesNum))}
                  </div>
                </div>

                {/* 実質負担額B: 賃金助成も差引 */}
                <div
                  style={{
                    background: "linear-gradient(135deg, #0f766e, #0d9488)",
                    borderRadius: "12px",
                    padding: "18px",
                    textAlign: "center",
                    color: "#fff",
                  }}
                >
                  <div
                    style={{
                      fontSize: "12px",
                      fontWeight: 600,
                      opacity: 0.8,
                      marginBottom: "4px",
                    }}
                  >
                    実質負担額B（賃金助成も含めた場合）
                  </div>
                  <div
                    style={{
                      fontSize: "26px",
                      fontWeight: 800,
                      fontFamily: "'DM Mono', monospace",
                    }}
                  >
                    {formatYen(Math.max(netCost - totalWageSubsidy, 0))}
                  </div>
                  <div style={{ fontSize: "12px", opacity: 0.85, marginTop: "6px" }}>
                    👤 1人あたり：{formatYen(Math.floor(Math.max(netCost - totalWageSubsidy, 0) / traineesNum))}
                  </div>
                  <div style={{ fontSize: "10px", opacity: 0.6, marginTop: "6px", lineHeight: 1.5 }}>
                    ※ 賃金助成（{formatYen(totalWageSubsidy)}）は訓練中の人件費補填として別途受給されます
                  </div>
                </div>

                {expensePerPerson < costPerPersonNum * rates.expenseRate && (
                  <div
                    style={{
                      background: "#fef3c7",
                      borderRadius: "8px",
                      padding: "10px 14px",
                      fontSize: "12px",
                      color: "#92400e",
                      marginTop: "12px",
                    }}
                  >
                    ⚠️ 1人あたり経費助成限度額（{formatYen(expenseLimit)}
                    ）に達しているため、助成率どおりの満額にはなりません。
                  </div>
                )}
              </div>
            )}

            {/* PDF Button */}
            <button
              onClick={handlePDF}
              disabled={!isValid}
              style={{
                width: "100%",
                padding: "14px",
                background: isValid
                  ? "linear-gradient(135deg, #1a56db, #3b82f6)"
                  : "#cbd5e1",
                color: "#fff",
                border: "none",
                borderRadius: "12px",
                fontSize: "14px",
                fontWeight: 700,
                cursor: isValid ? "pointer" : "not-allowed",
                fontFamily: "inherit",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px",
              }}
            >
              🖨️ PDF出力（印刷）
            </button>
          </div>
        )}

        {/* ===== CHECK TAB ===== */}
        {tab === "check" && (
          <div>
            <div
              style={{
                background: "#fff",
                borderRadius: "14px",
                padding: "20px",
                boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
              }}
            >
              <h2
                style={{
                  fontSize: "14px",
                  fontWeight: 700,
                  color: "#334155",
                  margin: "0 0 6px",
                }}
              >
                申請要件チェックリスト
              </h2>
              <p style={{ fontSize: "12px", color: "#94a3b8", margin: "0 0 16px" }}>
                必須項目が全てクリアされていることを確認してください
              </p>

              {ELIGIBILITY_CHECKS.map((c) => (
                <div
                  key={c.id}
                  onClick={() => toggleCheck(c.id)}
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: "10px",
                    padding: "12px",
                    borderRadius: "8px",
                    marginBottom: "6px",
                    background: checks[c.id] ? "#f0fdf4" : "#fafafa",
                    border: `1px solid ${checks[c.id] ? "#bbf7d0" : "#f1f5f9"}`,
                    cursor: "pointer",
                    transition: "all 0.15s",
                  }}
                >
                  <div
                    style={{
                      width: "22px",
                      height: "22px",
                      borderRadius: "6px",
                      border: checks[c.id]
                        ? "2px solid #22c55e"
                        : "2px solid #d1d5db",
                      background: checks[c.id] ? "#22c55e" : "#fff",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                      marginTop: "1px",
                      fontSize: "12px",
                      color: "#fff",
                    }}
                  >
                    {checks[c.id] && "✓"}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div
                      style={{
                        fontSize: "13px",
                        color: "#334155",
                        lineHeight: 1.5,
                      }}
                    >
                      {c.text}
                    </div>
                    <span
                      style={{
                        fontSize: "10px",
                        fontWeight: 700,
                        color: c.critical ? "#dc2626" : "#2563eb",
                        background: c.critical ? "#fef2f2" : "#eff6ff",
                        padding: "2px 6px",
                        borderRadius: "4px",
                        marginTop: "4px",
                        display: "inline-block",
                      }}
                    >
                      {c.critical ? "必須" : "推奨"}
                    </span>
                  </div>
                </div>
              ))}

              <div
                style={{
                  marginTop: "16px",
                  padding: "14px",
                  borderRadius: "10px",
                  background: allCriticalPassed
                    ? "linear-gradient(135deg, #059669, #10b981)"
                    : "#fef2f2",
                  color: allCriticalPassed ? "#fff" : "#991b1b",
                  textAlign: "center",
                  fontSize: "14px",
                  fontWeight: 700,
                }}
              >
                {allCriticalPassed
                  ? "✅ 必須要件を全てクリアしています"
                  : `⚠️ 未チェックの必須要件が${ELIGIBILITY_CHECKS.filter((c) => c.critical && !checks[c.id]).length}件あります`}
              </div>
            </div>
          </div>
        )}

        {/* ===== TASK TAB ===== */}
        {tab === "task" && (
          <div>
            {TASK_LIST.map((phase) => (
              <div
                key={phase.phase}
                style={{
                  background: "#fff",
                  borderRadius: "14px",
                  padding: "18px",
                  marginBottom: "14px",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
                }}
              >
                <h3
                  style={{
                    fontSize: "13px",
                    fontWeight: 700,
                    color: "#1a56db",
                    margin: "0 0 12px",
                    borderLeft: "3px solid #1a56db",
                    paddingLeft: "10px",
                  }}
                >
                  {phase.phase}
                </h3>
                {phase.tasks.map((t, i) => {
                  const key = `${phase.phase}-${i}`;
                  return (
                    <div
                      key={key}
                      onClick={() => toggleTask(key)}
                      style={{
                        display: "flex",
                        alignItems: "flex-start",
                        gap: "10px",
                        padding: "8px 10px",
                        borderRadius: "6px",
                        marginBottom: "4px",
                        cursor: "pointer",
                        background: taskChecks[key] ? "#f0fdf4" : "transparent",
                        transition: "all 0.15s",
                      }}
                    >
                      <div
                        style={{
                          width: "18px",
                          height: "18px",
                          borderRadius: "4px",
                          border: taskChecks[key]
                            ? "2px solid #22c55e"
                            : "2px solid #d1d5db",
                          background: taskChecks[key] ? "#22c55e" : "#fff",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          flexShrink: 0,
                          marginTop: "2px",
                          fontSize: "10px",
                          color: "#fff",
                        }}
                      >
                        {taskChecks[key] && "✓"}
                      </div>
                      <div
                        style={{
                          fontSize: "13px",
                          color: taskChecks[key] ? "#6b7280" : "#334155",
                          textDecoration: taskChecks[key]
                            ? "line-through"
                            : "none",
                          lineHeight: 1.5,
                        }}
                      >
                        {t}
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}

            <button
              onClick={handlePDF}
              style={{
                width: "100%",
                padding: "14px",
                background: "linear-gradient(135deg, #1a56db, #3b82f6)",
                color: "#fff",
                border: "none",
                borderRadius: "12px",
                fontSize: "14px",
                fontWeight: 700,
                cursor: "pointer",
                fontFamily: "inherit",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px",
              }}
            >
              🖨️ 全体をPDF出力
            </button>
          </div>
        )}

        {/* Footer Note */}
        <div
          style={{
            marginTop: "20px",
            padding: "14px",
            background: "#fff8e1",
            borderRadius: "10px",
            border: "1px solid #fde68a",
            fontSize: "11px",
            color: "#92400e",
            lineHeight: 1.7,
          }}
        >
          ⚠️ 本シミュレーションは概算です。実際の支給額は労働局の審査により異なります。
          <br />
          ⚠️ 令和7年度（2025年4月〜2026年3月届出分）の要項に基づいています。
          <br />
          ⚠️ 詳細は管轄の都道府県労働局にお問い合わせください。
        </div>
      </div>
    </div>
  );
}
