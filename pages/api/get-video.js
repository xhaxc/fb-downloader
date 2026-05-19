// pages/api/get-video.js
// Facebook Video Downloader API Route

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { url } = req.body;

  if (!url || typeof url !== 'string') {
    return res.status(400).json({ error: 'URL diperlukan' });
  }

  // Validate it's a Facebook URL
  const isFbUrl =
    url.includes('facebook.com') ||
    url.includes('fb.watch') ||
    url.includes('fb.com');

  if (!isFbUrl) {
    return res.status(400).json({ error: 'URL harus dari Facebook (facebook.com atau fb.watch)' });
  }

  try {
    const videoData = await extractFacebookVideo(url);
    return res.status(200).json(videoData);
  } catch (err) {
    console.error('Extraction error:', err.message);
    return res.status(500).json({
      error: err.message || 'Gagal mengambil video. Pastikan video bersifat publik.',
    });
  }
}

async function extractFacebookVideo(inputUrl) {
  // Normalize URL — try mobile version for easier parsing
  let url = inputUrl.trim();

  // Handle fb.watch short links — expand them first
  if (url.includes('fb.watch')) {
    url = await expandUrl(url);
  }

  // Convert to mobile URL
  const mobileUrl = url
    .replace('https://www.facebook.com', 'https://m.facebook.com')
    .replace('https://facebook.com', 'https://m.facebook.com');

  const html = await fetchPage(mobileUrl);

  // ── Strategy 1: look for JSON blob with sd_src / hd_src ──
  let sdUrl = extractPattern(html, /"sd_src"\s*:\s*"([^"]+)"/) ||
              extractPattern(html, /sd_src_no_ratelimit":"([^"]+)"/) ||
              extractPattern(html, /"playable_url"\s*:\s*"([^"]+)"/);

  let hdUrl = extractPattern(html, /"hd_src"\s*:\s*"([^"]+)"/) ||
              extractPattern(html, /hd_src_no_ratelimit":"([^"]+)"/);

  // ── Strategy 2: look for browser-native video src tag ──
  if (!sdUrl) {
    sdUrl = extractPattern(html, /<source[^>]+src="([^"]+\.mp4[^"]*)"/) ||
            extractPattern(html, /video_src=([^&"]+)/);
  }

  // Clean escaped unicode slashes
  if (sdUrl) sdUrl = sdUrl.replace(/\\/g, '').replace(/\\u002F/g, '/');
  if (hdUrl) hdUrl = hdUrl.replace(/\\/g, '').replace(/\\u002F/g, '/');

  if (!sdUrl && !hdUrl) {
    throw new Error(
      'Tidak dapat mengambil link video. Video mungkin privat, atau format halaman Facebook berubah. Coba lagi beberapa saat.'
    );
  }

  // ── Extract metadata ──
  const title =
    extractPattern(html, /<title[^>]*>([^<]+)<\/title>/) ||
    extractPattern(html, /"title"\s*:\s*"([^"]+)"/) ||
    'Video Facebook';

  const thumbnail =
    extractPattern(html, /"thumbnailImage"\s*:\s*\{[^}]*"uri"\s*:\s*"([^"]+)"/) ||
    extractPattern(html, /<meta[^>]+property="og:image"[^>]+content="([^"]+)"/) ||
    extractPattern(html, /"preferred_thumbnail"\s*:\s*\{[^}]*"uri"\s*:\s*"([^"]+)"/);

  const cleanThumbnail = thumbnail ? thumbnail.replace(/\\/g, '') : null;

  const sources = [];
  if (hdUrl) sources.push({ label: 'HD', quality: 'HD 720p', url: hdUrl });
  if (sdUrl) sources.push({ label: 'SD', quality: 'SD 480p', url: sdUrl });

  return {
    title: cleanTitle(title),
    thumbnail: cleanThumbnail,
    sources,
  };
}

// ── Helpers ──────────────────────────────────────────────

async function fetchPage(url) {
  const nodeFetch = (await import('node-fetch')).default;

  const res = await nodeFetch(url, {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Linux; Android 11; Pixel 5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Mobile Safari/537.36',
      'Accept-Language': 'en-US,en;q=0.9,id;q=0.8',
      Accept:
        'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      'Cache-Control': 'no-cache',
      Pragma: 'no-cache',
    },
    redirect: 'follow',
    timeout: 15000,
  });

  if (!res.ok) {
    throw new Error(`HTTP ${res.status} saat mengambil halaman Facebook`);
  }

  return res.text();
}

async function expandUrl(shortUrl) {
  try {
    const nodeFetch = (await import('node-fetch')).default;
    const res = await nodeFetch(shortUrl, {
      redirect: 'follow',
      headers: { 'User-Agent': 'Mozilla/5.0' },
    });
    return res.url;
  } catch {
    return shortUrl;
  }
}

function extractPattern(html, regex) {
  const match = html.match(regex);
  return match ? match[1] : null;
}

function cleanTitle(raw) {
  return raw
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/\s*\|\s*Facebook$/, '')
    .replace(/\s*-\s*Facebook$/, '')
    .trim()
    .slice(0, 120);
}
