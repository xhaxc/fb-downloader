import Head from 'next/head';
import { useState } from 'react';

export default function Home() {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  const handleFetch = async () => {
    if (!url.trim()) {
      setError('Masukkan URL video Facebook terlebih dahulu');
      return;
    }
    setError('');
    setResult(null);
    setLoading(true);

    try {
      const res = await fetch('/api/get-video', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: url.trim() }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Terjadi kesalahan');
      }

      setResult(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') handleFetch();
  };

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      setUrl(text);
    } catch {
      // Clipboard access denied — that's fine
    }
  };

  return (
    <>
      <Head>
        <title>FB Video Downloader — Download Video Facebook</title>
        <meta name="description" content="Download video Facebook dengan mudah. Pilih kualitas HD atau SD gratis tanpa aplikasi." />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <div className="bg-mesh min-h-screen">
        {/* ── NAVBAR ── */}
        <nav className="fixed top-0 left-0 right-0 z-50 px-6 py-4"
          style={{ background: 'rgba(10,10,15,0.8)', backdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <div className="max-w-5xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div style={{
                width: 36, height: 36, borderRadius: 10,
                background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18
              }}>▼</div>
              <span className="font-display font-bold text-lg gradient-text">FBDown</span>
            </div>
            <a
              href="https://github.com"
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: 'rgba(255,255,255,0.5)', fontSize: 14, fontFamily: 'DM Sans', textDecoration: 'none' }}
            >
              GitHub ↗
            </a>
          </div>
        </nav>

        {/* ── HERO ── */}
        <section className="pt-32 pb-16 px-4">
          <div className="max-w-3xl mx-auto text-center">
            {/* Badge */}
            <div className="animate-fade-up" style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.25)',
              borderRadius: 999, padding: '6px 16px', marginBottom: 24, fontSize: 13,
              color: '#93c5fd', fontWeight: 500
            }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#3b82f6', display: 'inline-block' }}></span>
              Gratis · Cepat · Tanpa Iklan
            </div>

            <h1 className="font-display animate-fade-up delay-1"
              style={{ fontSize: 'clamp(2rem, 6vw, 3.75rem)', fontWeight: 800, lineHeight: 1.15, marginBottom: 20 }}>
              Download Video<br />
              <span className="gradient-text">Facebook</span> Sekarang
            </h1>

            <p className="animate-fade-up delay-2"
              style={{ color: 'rgba(255,255,255,0.5)', fontSize: 17, lineHeight: 1.7, maxWidth: 520, margin: '0 auto 40px' }}>
              Paste URL video Facebook, pilih kualitas, langsung download. Tidak perlu login atau install aplikasi apapun.
            </p>

            {/* ── URL INPUT CARD ── */}
            <div className="glass-card animate-fade-up delay-3" style={{ padding: '28px', marginBottom: 24 }}>
              <div style={{ position: 'relative', marginBottom: 16 }}>
                <input
                  type="text"
                  className="url-input"
                  placeholder="https://www.facebook.com/watch?v=..."
                  value={url}
                  onChange={(e) => { setUrl(e.target.value); setError(''); }}
                  onKeyDown={handleKeyDown}
                />
                {url ? (
                  <button
                    onClick={() => { setUrl(''); setResult(null); setError(''); }}
                    style={{
                      position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)',
                      background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: 6,
                      color: 'rgba(255,255,255,0.6)', cursor: 'pointer', fontSize: 12, padding: '4px 8px'
                    }}
                  >✕</button>
                ) : (
                  <button
                    onClick={handlePaste}
                    style={{
                      position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                      background: 'rgba(59,130,246,0.15)', border: '1px solid rgba(59,130,246,0.3)',
                      borderRadius: 8, color: '#93c5fd', cursor: 'pointer', fontSize: 12,
                      fontWeight: 600, padding: '5px 12px', fontFamily: 'DM Sans'
                    }}
                  >Paste</button>
                )}
              </div>

              {error && (
                <div className="error-box" style={{ marginBottom: 16 }}>
                  <span style={{ fontSize: 18 }}>⚠️</span>
                  <p style={{ color: '#fca5a5', fontSize: 14 }}>{error}</p>
                </div>
              )}

              <button
                className="btn-primary"
                onClick={handleFetch}
                disabled={loading}
              >
                {loading ? (
                  <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
                    <span className="animate-spin-slow" style={{ display: 'inline-block', fontSize: 18 }}>⟳</span>
                    Memproses video...
                  </span>
                ) : (
                  '⬇  Ambil Video'
                )}
              </button>
            </div>

            {/* ── RESULT ── */}
            {result && (
              <div className="result-card animate-fade-in" style={{ marginBottom: 24, textAlign: 'left' }}>
                {/* Thumbnail */}
                {result.thumbnail && (
                  <div style={{ position: 'relative', background: '#000', maxHeight: 280, overflow: 'hidden' }}>
                    <img
                      src={result.thumbnail}
                      alt="Thumbnail"
                      style={{ width: '100%', objectFit: 'cover', opacity: 0.9, display: 'block' }}
                      onError={(e) => { e.target.style.display = 'none'; }}
                    />
                    <div style={{
                      position: 'absolute', inset: 0,
                      background: 'linear-gradient(to bottom, transparent 40%, rgba(0,0,0,0.6))'
                    }}></div>
                    <div style={{
                      position: 'absolute', bottom: 16, left: 16, right: 16
                    }}>
                      <span style={{
                        background: 'rgba(16,185,129,0.9)', borderRadius: 6,
                        color: 'white', fontSize: 12, fontWeight: 700, padding: '4px 10px'
                      }}>✓ Video Ditemukan</span>
                    </div>
                  </div>
                )}

                {/* Info & Download */}
                <div style={{ padding: 24 }}>
                  <h3 className="font-display" style={{ fontSize: 18, fontWeight: 700, marginBottom: 20, lineHeight: 1.4 }}>
                    {result.title}
                  </h3>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {result.sources.map((source, i) => (
                      <div key={i} style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
                        borderRadius: 14, padding: '14px 18px', flexWrap: 'wrap', gap: 12
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          <div style={{
                            background: source.label === 'HD' ? 'rgba(59,130,246,0.15)' : 'rgba(139,92,246,0.15)',
                            border: source.label === 'HD' ? '1px solid rgba(59,130,246,0.4)' : '1px solid rgba(139,92,246,0.4)',
                            borderRadius: 8, padding: '4px 10px',
                            color: source.label === 'HD' ? '#93c5fd' : '#c4b5fd',
                            fontWeight: 700, fontSize: 13
                          }}>
                            {source.label}
                          </div>
                          <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: 14 }}>{source.quality}</span>
                        </div>
                        <a
                          href={source.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          download
                          className="btn-download"
                          style={{ padding: '10px 20px', fontSize: 14 }}
                        >
                          ⬇ Download {source.label}
                        </a>
                      </div>
                    ))}
                  </div>

                  <div className="warning-box" style={{ marginTop: 20 }}>
                    <p style={{ color: '#fcd34d', fontSize: 13, lineHeight: 1.6 }}>
                      ⚠️ <strong>Penting:</strong> Hanya download video milik Anda sendiri atau yang Anda punya izin untuk download. Hormati hak cipta konten kreator.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* ── CARA PAKAI ── */}
        <section className="py-16 px-4">
          <div className="max-w-3xl mx-auto">
            <h2 className="font-display text-center" style={{ fontSize: 28, fontWeight: 800, marginBottom: 12 }}>
              Cara Menggunakan
            </h2>
            <p style={{ color: 'rgba(255,255,255,0.4)', textAlign: 'center', marginBottom: 32, fontSize: 15 }}>
              Cukup 3 langkah mudah
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
              {[
                { step: '01', icon: '🔗', title: 'Salin URL', desc: 'Buka Facebook, klik video, lalu salin URL dari address bar atau tombol Bagikan.' },
                { step: '02', icon: '📋', title: 'Paste & Klik', desc: 'Paste URL di kolom input di atas, lalu klik tombol "Ambil Video".' },
                { step: '03', icon: '⬇️', title: 'Download', desc: 'Pilih kualitas HD atau SD, lalu klik tombol Download untuk menyimpan.' },
              ].map((item) => (
                <div key={item.step} className="feature-item" style={{ flexDirection: 'column', padding: 24 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                    <span style={{
                      background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.2)',
                      borderRadius: 8, color: '#3b82f6', fontSize: 11, fontWeight: 800,
                      padding: '3px 8px', letterSpacing: '0.05em'
                    }}>{item.step}</span>
                    <span style={{ fontSize: 24 }}>{item.icon}</span>
                  </div>
                  <h3 className="font-display" style={{ fontSize: 17, fontWeight: 700, marginBottom: 8 }}>{item.title}</h3>
                  <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: 13, lineHeight: 1.6 }}>{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── TIPS ── */}
        <section className="py-8 px-4 pb-24">
          <div className="max-w-3xl mx-auto">
            <div className="glass-card" style={{ padding: 28 }}>
              <h3 className="font-display" style={{ fontSize: 18, fontWeight: 700, marginBottom: 16 }}>
                💡 Tips &amp; Trik
              </h3>
              <ul style={{ color: 'rgba(255,255,255,0.55)', fontSize: 14, lineHeight: 2.1, paddingLeft: 0, listStyle: 'none' }}>
                <li>→ Pastikan video yang ingin didownload bersifat <strong style={{ color: 'rgba(255,255,255,0.8)' }}>Publik</strong>, bukan privat atau teman saja.</li>
                <li>→ URL bisa dari <strong style={{ color: 'rgba(255,255,255,0.8)' }}>facebook.com/watch</strong>, <strong style={{ color: 'rgba(255,255,255,0.8)' }}>fb.watch</strong>, atau reel Facebook.</li>
                <li>→ Pilih <strong style={{ color: 'rgba(255,255,255,0.8)' }}>HD</strong> untuk kualitas terbaik, <strong style={{ color: 'rgba(255,255,255,0.8)' }}>SD</strong> untuk ukuran file lebih kecil.</li>
                <li>→ Jika link tidak berfungsi, coba klik kanan video → <em>Salin Alamat Tautan</em>.</li>
                <li>→ Di iPhone/iPad, tahan tombol Download dan pilih <em>Download Tertaut</em>.</li>
              </ul>
            </div>
          </div>
        </section>

        {/* ── FOOTER ── */}
        <footer style={{ borderTop: '1px solid rgba(255,255,255,0.06)', padding: '24px 16px', textAlign: 'center' }}>
          <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: 13 }}>
            FBDown © {new Date().getFullYear()} · Gunakan secara bertanggung jawab · Bukan afiliasi dengan Meta/Facebook
          </p>
        </footer>
      </div>
    </>
  );
}
