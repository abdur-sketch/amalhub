"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

type Program = {
  id: number;
  title: string;
  category: string;
  description: string;
  target: number;
  collected: number;
  donors: number;
  icon: string;
  tone: string;
};

type Transaction = {
  id: string;
  name: string;
  programId: number;
  amount: number;
  method: string;
  date: string;
  status: "Berhasil";
};

const INITIAL_PROGRAMS: Program[] = [
  {
    id: 1,
    title: "Paket Pangan untuk Keluarga",
    category: "Kemanusiaan",
    description: "Hadirkan bahan pangan bergizi untuk keluarga prasejahtera di pelosok Jawa Barat.",
    target: 100000000,
    collected: 68450000,
    donors: 438,
    icon: "♨",
    tone: "mint",
  },
  {
    id: 2,
    title: "Beasiswa Anak Hebat",
    category: "Pendidikan",
    description: "Bantu anak-anak terus belajar melalui beasiswa sekolah selama satu tahun penuh.",
    target: 75000000,
    collected: 45900000,
    donors: 286,
    icon: "✦",
    tone: "sun",
  },
  {
    id: 3,
    title: "Air Bersih untuk Desa",
    category: "Lingkungan",
    description: "Bangun sumur dan instalasi air bersih yang layak bagi tiga desa terdampak kekeringan.",
    target: 150000000,
    collected: 92750000,
    donors: 521,
    icon: "≈",
    tone: "sky",
  },
];

const INITIAL_TRANSACTIONS: Transaction[] = [
  { id: "DN-1048", name: "Hamba Allah", programId: 1, amount: 250000, method: "QRIS", date: "Hari ini, 09.42", status: "Berhasil" },
  { id: "DN-1047", name: "Rizky Ananda", programId: 3, amount: 500000, method: "Transfer Bank", date: "Hari ini, 08.15", status: "Berhasil" },
  { id: "DN-1046", name: "Siti Rahma", programId: 2, amount: 100000, method: "E-Wallet", date: "Kemarin, 20.34", status: "Berhasil" },
];

const money = (value: number) => new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  maximumFractionDigits: 0,
}).format(value);

const compactMoney = (value: number) => {
  if (value >= 1_000_000_000) return `Rp${(value / 1_000_000_000).toFixed(1).replace(".0", "")} M`;
  if (value >= 1_000_000) return `Rp${(value / 1_000_000).toFixed(1).replace(".0", "")} jt`;
  return money(value).replace(/\s/g, "");
};

export default function Home() {
  const [view, setView] = useState<"home" | "admin">("home");
  const [programs, setPrograms] = useState<Program[]>(INITIAL_PROGRAMS);
  const [transactions, setTransactions] = useState<Transaction[]>(INITIAL_TRANSACTIONS);
  const [donationProgram, setDonationProgram] = useState<Program | null>(null);
  const [amount, setAmount] = useState(100000);
  const [method, setMethod] = useState("QRIS");
  const [donorName, setDonorName] = useState("");
  const [anonymous, setAnonymous] = useState(false);
  const [payment, setPayment] = useState<Transaction | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [mobileMenu, setMobileMenu] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const savedPrograms = localStorage.getItem("amalhub-programs");
      const savedTransactions = localStorage.getItem("amalhub-transactions");
      if (savedPrograms) setPrograms(JSON.parse(savedPrograms));
      if (savedTransactions) setTransactions(JSON.parse(savedTransactions));
    } finally {
      setHydrated(true);
    }
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem("amalhub-programs", JSON.stringify(programs));
    localStorage.setItem("amalhub-transactions", JSON.stringify(transactions));
  }, [programs, transactions, hydrated]);

  const stats = useMemo(() => ({
    total: programs.reduce((sum, item) => sum + item.collected, 0),
    donors: programs.reduce((sum, item) => sum + item.donors, 0),
    active: programs.length,
  }), [programs]);

  const goTo = (next: "home" | "admin") => {
    setView(next);
    setMobileMenu(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const openDonation = (program: Program) => {
    setDonationProgram(program);
    setPayment(null);
    setAmount(100000);
    setDonorName("");
    setAnonymous(false);
  };

  const submitDonation = (event: FormEvent) => {
    event.preventDefault();
    if (!donationProgram || amount < 10000) return;
    const tx: Transaction = {
      id: `DN-${Math.floor(1000 + Math.random() * 8999)}`,
      name: anonymous || !donorName.trim() ? "Hamba Allah" : donorName.trim(),
      programId: donationProgram.id,
      amount,
      method,
      date: "Baru saja",
      status: "Berhasil",
    };
    setTransactions((items) => [tx, ...items]);
    setPrograms((items) => items.map((item) => item.id === donationProgram.id
      ? { ...item, collected: item.collected + amount, donors: item.donors + 1 }
      : item));
    setPayment(tx);
  };

  const addProgram = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const target = Number(form.get("target"));
    if (!target) return;
    const tones = ["mint", "sun", "sky", "rose"];
    setPrograms((items) => [...items, {
      id: Date.now(),
      title: String(form.get("title")),
      category: String(form.get("category")),
      description: String(form.get("description")),
      target,
      collected: 0,
      donors: 0,
      icon: "✦",
      tone: tones[items.length % tones.length],
    }]);
    setShowAdd(false);
  };

  const removeProgram = (id: number) => {
    if (window.confirm("Hapus program ini? Data transaksi tetap tersimpan.")) {
      setPrograms((items) => items.filter((item) => item.id !== id));
    }
  };

  const currentProgramName = (id: number) => programs.find((item) => item.id === id)?.title || "Program dihapus";

  return (
    <main>
      <header className="site-header">
        <button className="brand" onClick={() => goTo("home")} aria-label="Ke beranda">
          <span className="brand-mark">a</span>
          <span>amal<span>hub</span></span>
        </button>
        <nav className={mobileMenu ? "nav-links open" : "nav-links"} aria-label="Navigasi utama">
          <button onClick={() => goTo("home")} className={view === "home" ? "active" : ""}>Beranda</button>
          <button onClick={() => { goTo("home"); setTimeout(() => document.getElementById("program")?.scrollIntoView({ behavior: "smooth" }), 50); }}>Program</button>
          <button onClick={() => { goTo("home"); setTimeout(() => document.getElementById("tentang")?.scrollIntoView({ behavior: "smooth" }), 50); }}>Tentang Kami</button>
          <button className="admin-link" onClick={() => goTo("admin")}>Dashboard Admin <span>→</span></button>
        </nav>
        <button className="menu-button" aria-label="Buka menu" onClick={() => setMobileMenu(!mobileMenu)}>{mobileMenu ? "×" : "☰"}</button>
      </header>

      {view === "home" ? (
        <>
          <section className="hero">
            <div className="hero-copy">
              <div className="eyebrow"><span>✦</span> Kebaikan dimulai dari sini</div>
              <h1>Berbagi hari ini,<br /><em>mengubah esok.</em></h1>
              <p>Bersama, kita hadirkan harapan lewat aksi nyata yang transparan, mudah, dan tepat sasaran.</p>
              <div className="hero-actions">
                <button className="primary" onClick={() => document.getElementById("program")?.scrollIntoView({ behavior: "smooth" })}>Mulai Berdonasi <span>↗</span></button>
                <button className="text-button" onClick={() => document.getElementById("tentang")?.scrollIntoView({ behavior: "smooth" })}>Kenali kami <span>↓</span></button>
              </div>
              <div className="trust-row">
                <div className="avatars"><span>RA</span><span>SR</span><span>+</span></div>
                <p><strong>{stats.donors.toLocaleString("id-ID")} orang baik</strong><br />telah berbagi bersama kami</p>
              </div>
            </div>
            <div className="hero-visual" aria-label="Ilustrasi tangan berbagi kebaikan">
              <div className="sun-disc"></div>
              <div className="orbit orbit-one"></div>
              <div className="orbit orbit-two"></div>
              <div className="heart">♥</div>
              <div className="hand hand-left"></div>
              <div className="hand hand-right"></div>
              <span className="spark s1">✦</span><span className="spark s2">✦</span><span className="spark s3">•</span>
              <div className="impact-card"><span className="mini-icon">✓</span><div><small>Dana tersalurkan</small><strong>{compactMoney(stats.total)}</strong></div></div>
            </div>
          </section>

          <section className="impact-strip" aria-label="Ringkasan dampak">
            <div><strong>{compactMoney(stats.total)}</strong><span>Dana terkumpul</span></div>
            <div><strong>{stats.donors.toLocaleString("id-ID")}+</strong><span>Donatur bergabung</span></div>
            <div><strong>{stats.active}</strong><span>Program berjalan</span></div>
            <p><span>✓</span> Setiap rupiah tercatat<br />dan dikelola secara transparan.</p>
          </section>

          <section className="program-section" id="program">
            <div className="section-heading">
              <div><span className="section-kicker">Program Pilihan</span><h2>Mari ambil bagian</h2></div>
              <p>Pilih langkah kebaikan yang paling dekat di hati. Bantuan sekecil apa pun berarti besar bagi mereka.</p>
            </div>
            <div className="program-grid">
              {programs.map((program) => {
                const progress = Math.min(100, Math.round(program.collected / program.target * 100));
                return (
                  <article className="program-card" key={program.id}>
                    <div className={`program-art ${program.tone}`}>
                      <span className="art-icon">{program.icon}</span>
                      <span className="category">{program.category}</span>
                      <div className="art-lines"><i></i><i></i><i></i></div>
                    </div>
                    <div className="program-body">
                      <h3>{program.title}</h3>
                      <p>{program.description}</p>
                      <div className="progress-meta"><span>Terkumpul</span><strong>{progress}%</strong></div>
                      <div className="progress"><span style={{ width: `${progress}%` }}></span></div>
                      <div className="money-row"><strong>{compactMoney(program.collected)}</strong><span>dari {compactMoney(program.target)}</span></div>
                      <button className="card-button" onClick={() => openDonation(program)}>Donasi sekarang <span>→</span></button>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>

          <section className="about-section" id="tentang">
            <div className="about-card">
              <div className="about-seal"><span>✓</span></div>
              <div><span className="section-kicker light">Tentang AmalHub</span><h2>Amanah dalam setiap langkah.</h2></div>
              <p>AmalHub membantu mempertemukan niat baik dengan kebutuhan nyata. Kami percaya transparansi adalah fondasi kepercayaan dan perubahan yang berkelanjutan.</p>
              <div className="promise"><span>01</span><p><strong>Transparan</strong>Laporan dana dapat dipantau.</p></div>
              <div className="promise"><span>02</span><p><strong>Tepat sasaran</strong>Program melalui verifikasi.</p></div>
            </div>
          </section>
        </>
      ) : (
        <section className="dashboard">
          <div className="dashboard-top">
            <div><span className="section-kicker">Dashboard Admin</span><h1>Selamat datang kembali.</h1><p>Pantau kebaikan yang terus bertumbuh hari ini.</p></div>
            <button className="primary" onClick={() => setShowAdd(true)}>＋ Tambah Program</button>
          </div>
          <div className="stats-grid">
            <article><span className="stat-icon green">↗</span><small>Total dana terkumpul</small><strong>{money(stats.total)}</strong><em>↑ 12,4% bulan ini</em></article>
            <article><span className="stat-icon yellow">♙</span><small>Total donatur</small><strong>{stats.donors.toLocaleString("id-ID")}</strong><em>↑ 84 donatur baru</em></article>
            <article><span className="stat-icon blue">✦</span><small>Program aktif</small><strong>{stats.active}</strong><em>Semua berjalan baik</em></article>
          </div>

          <div className="admin-grid">
            <section className="admin-panel programs-panel">
              <div className="panel-title"><div><h2>Program Donasi</h2><p>Kelola dan pantau progres program.</p></div><button onClick={() => setShowAdd(true)}>＋ Tambah</button></div>
              <div className="admin-program-list">
                {programs.map((program) => {
                  const progress = Math.min(100, Math.round(program.collected / program.target * 100));
                  return <article key={program.id}>
                    <div className={`program-thumb ${program.tone}`}>{program.icon}</div>
                    <div className="admin-program-info"><strong>{program.title}</strong><span>{program.category} · {program.donors} donatur</span><div className="progress"><span style={{ width: `${progress}%` }}></span></div><small>{compactMoney(program.collected)} dari {compactMoney(program.target)}</small></div>
                    <b>{progress}%</b>
                    <button className="delete-button" onClick={() => removeProgram(program.id)} aria-label={`Hapus ${program.title}`}>×</button>
                  </article>;
                })}
              </div>
            </section>

            <section className="admin-panel transactions-panel">
              <div className="panel-title"><div><h2>Transaksi Terbaru</h2><p>Donasi yang baru saja masuk.</p></div><span className="live"><i></i> Live</span></div>
              <div className="transaction-list">
                {transactions.slice(0, 6).map((tx) => <article key={tx.id}>
                  <div className="donor-initial">{tx.name.charAt(0)}</div>
                  <div><strong>{tx.name}</strong><span>{currentProgramName(tx.programId)}</span><small>{tx.date} · {tx.method}</small></div>
                  <p><strong>+{money(tx.amount)}</strong><span>✓ Berhasil</span></p>
                </article>)}
              </div>
            </section>
          </div>
          <button className="back-home" onClick={() => goTo("home")}>← Kembali ke halaman donatur</button>
        </section>
      )}

      <footer><button className="brand inverse" onClick={() => goTo("home")}><span className="brand-mark">a</span><span>amal<span>hub</span></span></button><p>Menyalurkan kebaikan, menumbuhkan harapan.</p><small>© 2026 AmalHub. Dibuat untuk kebaikan bersama.</small></footer>

      {donationProgram && (
        <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && setDonationProgram(null)}>
          <section className="modal" role="dialog" aria-modal="true" aria-label="Formulir donasi">
            <button className="modal-close" onClick={() => setDonationProgram(null)}>×</button>
            {!payment ? <>
              <span className="section-kicker">Langkah Kebaikan</span>
              <h2>Donasi untuk<br />{donationProgram.title}</h2>
              <form onSubmit={submitDonation}>
                <label>Nominal donasi</label>
                <div className="amount-input"><span>Rp</span><input type="number" min="10000" value={amount || ""} onChange={(e) => setAmount(Number(e.target.value))} required /></div>
                <div className="quick-amounts">{[50000, 100000, 250000, 500000].map((item) => <button type="button" className={amount === item ? "selected" : ""} onClick={() => setAmount(item)} key={item}>{compactMoney(item).replace("Rp", "")}</button>)}</div>
                <label>Nama donatur</label>
                <input className="field" value={donorName} onChange={(e) => setDonorName(e.target.value)} placeholder="Nama lengkap" disabled={anonymous} />
                <label className="check"><input type="checkbox" checked={anonymous} onChange={(e) => setAnonymous(e.target.checked)} /> Sembunyikan nama saya</label>
                <label>Metode pembayaran</label>
                <div className="payment-methods">{["QRIS", "Transfer Bank", "E-Wallet"].map((item) => <button type="button" key={item} onClick={() => setMethod(item)} className={method === item ? "selected" : ""}><span>{item === "QRIS" ? "▦" : item === "Transfer Bank" ? "▤" : "◉"}</span>{item}</button>)}</div>
                <button className="primary full" type="submit">Lanjutkan pembayaran <span>→</span></button>
              </form>
            </> : <div className="payment-success">
              <div className="success-mark">✓</div>
              <span className="section-kicker">Donasi tercatat</span>
              <h2>Terima kasih,<br />Orang Baik!</h2>
              <p>Selesaikan pembayaran sebesar <strong>{money(payment.amount)}</strong> melalui {payment.method}.</p>
              <div className="payment-instruction">
                {payment.method === "QRIS" ? <div className="fake-qr">▦</div> : <div className="account-number">{payment.method === "Transfer Bank" ? "7130 8810 245" : "0812 3456 7890"}</div>}
                <small>{payment.method === "QRIS" ? "Pindai kode melalui aplikasi pembayaran Anda" : "Salin nomor tujuan dan lakukan pembayaran"}</small>
                <span>ID Transaksi: {payment.id}</span>
              </div>
              <button className="primary full" onClick={() => setDonationProgram(null)}>Selesai</button>
            </div>}
          </section>
        </div>
      )}

      {showAdd && (
        <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && setShowAdd(false)}>
          <section className="modal compact" role="dialog" aria-modal="true" aria-label="Tambah program">
            <button className="modal-close" onClick={() => setShowAdd(false)}>×</button>
            <span className="section-kicker">Program Baru</span><h2>Mulai gerakan baik.</h2>
            <form onSubmit={addProgram}>
              <label>Nama program</label><input className="field" name="title" placeholder="Contoh: Bantuan Banjir" required />
              <label>Kategori</label><select className="field" name="category" defaultValue="Kemanusiaan"><option>Kemanusiaan</option><option>Pendidikan</option><option>Kesehatan</option><option>Lingkungan</option><option>Keagamaan</option></select>
              <label>Deskripsi singkat</label><textarea className="field" name="description" placeholder="Jelaskan tujuan program..." required />
              <label>Target dana</label><div className="amount-input"><span>Rp</span><input type="number" name="target" min="100000" placeholder="50000000" required /></div>
              <button className="primary full" type="submit">Simpan program <span>→</span></button>
            </form>
          </section>
        </div>
      )}
    </main>
  );
}
