// pages/api/debug.js
// Endpoint khusus debug — lihat apa yang Facebook kembalikan
// Akses: POST /api/debug dengan body { url: "..." }
// HAPUS file ini setelah selesai debugging!

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { url } = req.body;
  if (!url) return res.status(400).json({ error: 'url required' });

  const nodeFetch = (await import('node-fetch')).default;

  const UA = {
    mobile:
      'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36',
    desktop:
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    bot:
      'facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)',
  };

  const results = {};

  for (const [uaName, userAgent] of Object.entries(UA)) {
    try {
      const r = await nodeFetch(url, {
        headers: {
          'User-Agent': userAgent,
          'Accept-Language': 'en-US,en;q=0.9',
          Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Cache-Control': 'no-cache',
        },
        redirect: 'follow',
        timeout: 15000,
      });

      const html = await r.text();

      // Check for key signals
      const hasLoginWall  = html.includes('login_form') || html.includes('checkpoint/block');
      const hasPlayable   = html.includes('playable_url');
      const hasSdSrc      = html.includes('sd_src');
      const hasHdSrc      = html.includes('hd_src');
      const hasOgVideo    = html.includes('og:video');
      const hasMp4        = html.includes('.mp4');
      const hasDash       = html.includes('dash_manifest');

      // Extract any .mp4 URLs found (up to 3)
      const mp4Matches = [...html.matchAll(/https:[^"' ]{10,200}\.mp4[^"' ]{0,100}/g)]
        .slice(0, 3)
        .map((m) => m[0].replace(/\\u002F/g, '/').replace(/\\/g, ''));

      results[uaName] = {
        status:      r.status,
        finalUrl:    r.url,
        htmlLength:  html.length,
        hasLoginWall,
        hasPlayable,
        hasSdSrc,
        hasHdSrc,
        hasOgVideo,
        hasMp4,
        hasDash,
        mp4Samples:  mp4Matches,
        htmlSnippet: html.slice(0, 500).replace(/\s+/g, ' '),
      };
    } catch (e) {
      results[uaName] = { error: e.message };
    }
  }

  return res.status(200).json(results);
}
