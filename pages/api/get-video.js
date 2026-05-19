// pages/api/get-video.js
// Facebook Video Downloader API Route
// Supports: /watch?v=, /reel/, /videos/, fb.watch, fb.com short links

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { url } = req.body;

  if (!url || typeof url !== 'string') {
    return res.status(400).json({ error: 'URL diperlukan' });
  }

  const isFbUrl =
    url.includes('facebook.com') ||
    url.includes('fb.watch') ||
    url.includes('fb.com');

  if (!isFbUrl) {
    return res.status(400).json({
      error: 'URL harus dari Facebook (facebook.com, fb.watch, atau fb.com)',
    });
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

// ─────────────────────────────────────────────────────────────
//  Detect URL type so we can build the right mobile URL
// ─────────────────────────────────────────────────────────────
function detectUrlType(url) {
  if (url.includes('/reel/'))    return 'reel';
  if (url.includes('/reels/'))   return 'reel';
  if (url.includes('/videos/'))  return 'video';
  if (url.includes('watch?v='))  return 'watch';
  if (url.includes('watch/?v=')) return 'watch';
  if (url.includes('fb.watch'))  return 'short';
  if (url.includes('fb.com'))    return 'short';
  return 'unknown';
}

// ─────────────────────────────────────────────────────────────
//  Build canonical mobile URL for each type
// ─────────────────────────────────────────────────────────────
function buildMobileUrl(url, type) {
  const base = url
    .replace('https://www.facebook.com', 'https://m.facebook.com')
    .replace('http://www.facebook.com', 'https://m.facebook.com')
    .replace('https://facebook.com', 'https://m.facebook.com')
    .replace('http://facebook.com', 'https://m.facebook.com');

  // Reels sometimes need the /reel/ path to stay intact on mobile
  // m.facebook.com handles /reel/ natively, so just swap the domain.
  return base;
}

// ─────────────────────────────────────────────────────────────
//  Core extraction
// ─────────────────────────────────────────────────────────────
async function extractFacebookVideo(inputUrl) {
  let url = inputUrl.trim();

  // 1. Expand short links (fb.watch, fb.com/...)
  if (url.includes('fb.watch') || url.match(/fb\.com\/[a-zA-Z0-9]+\/?$/)) {
    url = await expandUrl(url);
  }

  const type = detectUrlType(url);
  const mobileUrl = buildMobileUrl(url, type);

  console.log(`[FBDown] type=${type} url=${mobileUrl}`);

  // Fetch with two different user-agents for resilience
  let html = await fetchPage(mobileUrl, 'mobile');

  // If mobile page looks empty / login-walled, try desktop
  if (html.length < 5000 || html.includes('login_form')) {
    console.log('[FBDown] Retrying with desktop UA...');
    const desktopUrl = mobileUrl
      .replace('https://m.facebook.com', 'https://www.facebook.com');
    html = await fetchPage(desktopUrl, 'desktop');
  }

  // ── Video URL extraction (ordered by reliability) ────────

  // Pattern set A — JSON data blobs embedded in page JS
  let sdUrl =
    extractFirst(html, [
      /"sd_src"\s*:\s*"([^"]+)"/,
      /"sd_src_no_ratelimit"\s*:\s*"([^"]+)"/,
      /"browser_native_sd_url"\s*:\s*"([^"]+)"/,
      /"playable_url"\s*:\s*"([^"]+)"/,
      /"playable_url_quality_hd"\s*:\s*"([^"]+)"/,  // fallback
    ]);

  let hdUrl =
    extractFirst(html, [
      /"hd_src"\s*:\s*"([^"]+)"/,
      /"hd_src_no_ratelimit"\s*:\s*"([^"]+)"/,
      /"browser_native_hd_url"\s*:\s*"([^"]+)"/,
    ]);

  // Pattern set B — Reel-specific data patterns
  if (!sdUrl && !hdUrl) {
    sdUrl =
      extractFirst(html, [
        /"video_url"\s*:\s*"([^"]+\.mp4[^"]+)"/,
        /"videoUrl"\s*:\s*"([^"]+\.mp4[^"]+)"/,
        /"src"\s*:\s*"(https:\/\/[^"]+\.mp4[^"]+)"/,
        /video_src\s*=\s*"([^"]+)"/,
      ]);
  }

  // Pattern set C — HTML <video> / <source> tags
  if (!sdUrl && !hdUrl) {
    sdUrl =
      extractFirst(html, [
        /<source[^>]+src="(https:\/\/[^"]+\.mp4[^"]*)"/,
        /<video[^>]+src="(https:\/\/[^"]+\.mp4[^"]*)"/,
      ]);
  }

  // Pattern set D — og:video meta tag (works on many reel pages)
  if (!sdUrl && !hdUrl) {
    sdUrl =
      extractFirst(html, [
        /<meta[^>]+property="og:video"[^>]+content="([^"]+)"/,
        /<meta[^>]+content="([^"]+)"[^>]+property="og:video"/,
        /<meta[^>]+property="og:video:url"[^>]+content="([^"]+)"/,
        /<meta[^>]+property="og:video:secure_url"[^>]+content="([^"]+)"/,
      ]);
  }

  // Clean Facebook's escaped slashes
  const cleanUrl = (u) =>
    u ? decodeURIComponent(u.replace(/\\\//g, '/').replace(/\\u002F/g, '/')) : null;

  sdUrl = cleanUrl(sdUrl);
  hdUrl = cleanUrl(hdUrl);

  if (!sdUrl && !hdUrl) {
    throw new Error(
      type === 'reel'
        ? 'Reel tidak dapat diambil. Pastikan Reel bersifat Publik dan coba lagi.'
        : 'Tidak dapat mengambil link video. Pastikan video bersifat Publik dan coba lagi.'
    );
  }

  // ── Metadata ─────────────────────────────────────────────

  const title =
    extractFirst(html, [
      /<title[^>]*>([^<]{5,})<\/title>/,
      /"title"\s*:\s*"([^"]{3,})"/,
      /<meta[^>]+property="og:title"[^>]+content="([^"]+)"/,
      /<meta[^>]+content="([^"]+)"[^>]+property="og:title"/,
    ]) || (type === 'reel' ? 'Reel Facebook' : 'Video Facebook');

  const thumbnail =
    extractFirst(html, [
      /<meta[^>]+property="og:image"[^>]+content="([^"]+)"/,
      /<meta[^>]+content="([^"]+)"[^>]+property="og:image"/,
      /"preferred_thumbnail"\s*:\s*\{[^}]*?"uri"\s*:\s*"([^"]+)"/,
      /"thumbnailImage"\s*:\s*\{[^}]*?"uri"\s*:\s*"([^"]+)"/,
    ]);

  const cleanThumb = thumbnail ? cleanUrl(thumbnail) : null;

  // Build sources list — HD first
  const sources = [];
  if (hdUrl) sources.push({ label: 'HD',  quality: 'HD 720p',  url: hdUrl });
  if (sdUrl) sources.push({ label: 'SD',  quality: 'SD 480p',  url: sdUrl });

  return {
    title: cleanTitle(title),
    thumbnail: cleanThumb,
    type,       // 'reel' | 'watch' | 'video' | 'short'
    sources,
  };
}

// ─────────────────────────────────────────────────────────────
//  Helpers
// ─────────────────────────────────────────────────────────────

/** Try a list of regexes; return first match or null */
function extractFirst(html, patterns) {
  for (const re of patterns) {
    const m = html.match(re);
    if (m && m[1] && m[1].length > 5) return m[1];
  }
  return null;
}

async function fetchPage(url, ua = 'mobile') {
  const nodeFetch = (await import('node-fetch')).default;

  const userAgents = {
    mobile:
      'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36',
    desktop:
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  };

  const res = await nodeFetch(url, {
    headers: {
      'User-Agent': userAgents[ua] || userAgents.mobile,
      'Accept-Language': 'en-US,en;q=0.9,id;q=0.8',
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Cache-Control': 'no-cache',
      Pragma: 'no-cache',
      // Needed on some reel pages
      'Sec-Fetch-Dest': 'document',
      'Sec-Fetch-Mode': 'navigate',
      'Sec-Fetch-Site': 'none',
    },
    redirect: 'follow',
    timeout: 20000,
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
      timeout: 10000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0',
      },
    });
    return res.url || shortUrl;
  } catch {
    return shortUrl;
  }
}

function cleanTitle(raw) {
  return raw
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/\s*\|\s*Facebook$/, '')
    .replace(/\s*[-–]\s*Facebook$/, '')
    .replace(/^Facebook\s*[-–|]\s*/, '')
    .trim()
    .slice(0, 120) || 'Video Facebook';
}
