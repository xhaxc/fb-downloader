// pages/api/get-video.js
// Facebook Video Downloader — supports Watch, Reel, Videos, fb.watch

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
    console.error('[FBDown] Final error:', err.message);
    return res.status(500).json({
      error: err.message || 'Gagal mengambil video. Pastikan video bersifat publik.',
    });
  }
}

// ─────────────────────────────────────────────────────────────

function detectUrlType(url) {
  if (url.includes('/reel/') || url.includes('/reels/')) return 'reel';
  if (url.includes('/videos/')) return 'video';
  if (url.includes('watch')) return 'watch';
  if (url.includes('fb.watch') || url.includes('fb.com')) return 'short';
  return 'unknown';
}

// ─────────────────────────────────────────────────────────────

async function extractFacebookVideo(inputUrl) {
  let url = inputUrl.trim();

  // Expand short links
  if (url.includes('fb.watch') || url.match(/^https?:\/\/fb\.com\//)) {
    console.log('[FBDown] Expanding short URL:', url);
    url = await expandUrl(url);
    console.log('[FBDown] Expanded to:', url);
  }

  const type = detectUrlType(url);
  console.log('[FBDown] Type:', type, '| URL:', url);

  // ── Try 3 different URL formats ──────────────────────────
  const urlVariants = buildUrlVariants(url, type);
  const uaVariants  = ['mobile', 'desktop', 'bot'];

  let html = '';
  let usedUrl = '';

  // Try every combination of URL variant × User-Agent
  outer:
  for (const variant of urlVariants) {
    for (const ua of uaVariants) {
      try {
        console.log(`[FBDown] Trying ${ua} UA on: ${variant}`);
        const fetched = await fetchPage(variant, ua);

        // Reject if login-walled or suspiciously short
        if (fetched.length < 3000) {
          console.log(`[FBDown] Response too short (${fetched.length} chars), skipping`);
          continue;
        }
        if (fetched.includes('"login_form"') || fetched.includes('checkpoint/block')) {
          console.log('[FBDown] Login wall detected, skipping');
          continue;
        }

        html    = fetched;
        usedUrl = variant;
        console.log(`[FBDown] Got HTML (${html.length} chars) with ${ua} UA`);
        break outer;
      } catch (e) {
        console.log(`[FBDown] Fetch failed (${ua}, ${variant}): ${e.message}`);
      }
    }
  }

  if (!html) {
    throw new Error(
      'Tidak dapat mengakses halaman Facebook. Kemungkinan diblokir atau video privat.'
    );
  }

  // ── Extract video URLs ────────────────────────────────────
  const { sdUrl, hdUrl } = extractVideoUrls(html, type);

  console.log('[FBDown] SD:', sdUrl ? '✓' : '✗', '| HD:', hdUrl ? '✓' : '✗');

  if (!sdUrl && !hdUrl) {
    // Log a snippet of HTML to help debug future pattern mismatches
    const snippet = html.slice(0, 2000).replace(/\s+/g, ' ');
    console.log('[FBDown] HTML snippet (first 2000 chars):', snippet);
    throw new Error(
      type === 'reel'
        ? 'Reel tidak dapat diambil. Facebook mungkin memerlukan login untuk reel ini, atau strukturnya berubah.'
        : 'Video tidak dapat diambil. Pastikan video bersifat Publik.'
    );
  }

  // ── Metadata ─────────────────────────────────────────────
  const title = extractMeta(html, type);
  const thumbnail = extractThumbnail(html);

  const sources = [];
  if (hdUrl) sources.push({ label: 'HD', quality: 'HD 720p', url: hdUrl });
  if (sdUrl) sources.push({ label: 'SD', quality: 'SD 480p', url: sdUrl });

  return { title, thumbnail, type, sources };
}

// ─────────────────────────────────────────────────────────────
//  URL variants to try
// ─────────────────────────────────────────────────────────────
function buildUrlVariants(url, type) {
  const mobileUrl = url
    .replace('https://www.facebook.com', 'https://m.facebook.com')
    .replace('http://www.facebook.com',  'https://m.facebook.com')
    .replace('https://facebook.com',     'https://m.facebook.com')
    .replace('http://facebook.com',      'https://m.facebook.com');

  const desktopUrl = url
    .replace('https://m.facebook.com',  'https://www.facebook.com')
    .replace('http://m.facebook.com',   'https://www.facebook.com')
    .replace('https://facebook.com',    'https://www.facebook.com')
    .replace('http://facebook.com',     'https://www.facebook.com');

  // For Reels, also try the /watch/?v= variant if we can extract the ID
  const reelIdMatch = url.match(/\/reel\/(\d+)/);
  const watchVariant = reelIdMatch
    ? `https://www.facebook.com/watch/?v=${reelIdMatch[1]}`
    : null;

  const variants = [mobileUrl, desktopUrl];
  if (watchVariant) variants.push(watchVariant);
  return [...new Set(variants)]; // deduplicate
}

// ─────────────────────────────────────────────────────────────
//  Video URL extraction — all pattern families
// ─────────────────────────────────────────────────────────────
function extractVideoUrls(html, type) {
  const clean = (u) => {
    if (!u) return null;
    return decodeURIComponent(
      u.replace(/\\u002F/gi, '/')
       .replace(/\\\//g, '/')
       .replace(/&amp;/g, '&')
    );
  };

  // ── SD candidates ────────────────────────────────────────
  const sdRaw = extractFirst(html, [
    // Standard video page patterns
    /"sd_src"\s*:\s*"([^"]+)"/,
    /"sd_src_no_ratelimit"\s*:\s*"([^"]+)"/,
    /"browser_native_sd_url"\s*:\s*"([^"]+)"/,
    // playable_url is often SD quality for reels
    /"playable_url"\s*:"([^"]+)"/,
    // Reel-specific
    /"video_url"\s*:\s*"(https:[^"]+\.mp4[^"]*)"/,
    /"videoUrl"\s*:\s*"(https:[^"]+\.mp4[^"]*)"/,
    // __data / __bbox JSON blobs (newer FB layout)
    /"dash_manifest_url"\s*:\s*"([^"]+)"/,
    // HTML5 video/source tags
    /<source[^>]+src="(https:\/\/[^"]+\.mp4[^"]*)"/,
    /<video[^>]+src="(https:\/\/[^"]+\.mp4[^"]*)"/,
    // og:video meta (reliable fallback for Reels)
    /<meta[^>]+property="og:video:secure_url"[^>]+content="([^"]+)"/,
    /<meta[^>]+content="([^"]+)"[^>]+property="og:video:secure_url"/,
    /<meta[^>]+property="og:video"[^>]+content="([^"]+)"/,
    /<meta[^>]+content="([^"]+)"[^>]+property="og:video"/,
    /<meta[^>]+property="og:video:url"[^>]+content="([^"]+)"/,
  ]);

  // ── HD candidates ────────────────────────────────────────
  const hdRaw = extractFirst(html, [
    /"hd_src"\s*:\s*"([^"]+)"/,
    /"hd_src_no_ratelimit"\s*:\s*"([^"]+)"/,
    /"browser_native_hd_url"\s*:\s*"([^"]+)"/,
    /"playable_url_quality_hd"\s*:\s*"([^"]+)"/,
  ]);

  return {
    sdUrl: clean(sdRaw),
    hdUrl: clean(hdRaw),
  };
}

// ─────────────────────────────────────────────────────────────
//  Metadata helpers
// ─────────────────────────────────────────────────────────────
function extractMeta(html, type) {
  const raw = extractFirst(html, [
    /<meta[^>]+property="og:title"[^>]+content="([^"]+)"/,
    /<meta[^>]+content="([^"]+)"[^>]+property="og:title"/,
    /<title[^>]*>([^<]{5,})<\/title>/,
    /"title"\s*:\s*"([^"]{3,100})"/,
  ]) || (type === 'reel' ? 'Reel Facebook' : 'Video Facebook');

  return raw
    .replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#039;/g, "'")
    .replace(/\s*\|\s*Facebook$/, '').replace(/\s*[-–]\s*Facebook$/, '')
    .trim().slice(0, 120) || 'Video Facebook';
}

function extractThumbnail(html) {
  const raw = extractFirst(html, [
    /<meta[^>]+property="og:image"[^>]+content="([^"]+)"/,
    /<meta[^>]+content="([^"]+)"[^>]+property="og:image"/,
    /"preferred_thumbnail"\s*:\s*\{[^}]{0,200}"uri"\s*:\s*"([^"]+)"/,
    /"thumbnailImage"\s*:\s*\{[^}]{0,200}"uri"\s*:\s*"([^"]+)"/,
  ]);
  return raw
    ? decodeURIComponent(raw.replace(/\\u002F/gi, '/').replace(/\\\//g, '/').replace(/&amp;/g, '&'))
    : null;
}

// ─────────────────────────────────────────────────────────────
//  Low-level helpers
// ─────────────────────────────────────────────────────────────
function extractFirst(html, patterns) {
  for (const re of patterns) {
    const m = html.match(re);
    if (m && m[1] && m[1].length > 10) return m[1];
  }
  return null;
}

async function fetchPage(url, ua = 'mobile') {
  const nodeFetch = (await import('node-fetch')).default;

  const UA = {
    mobile:
      'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36',
    desktop:
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    bot:
      'facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)',
  };

  const res = await nodeFetch(url, {
    headers: {
      'User-Agent':      UA[ua] || UA.mobile,
      'Accept-Language': 'en-US,en;q=0.9',
      'Accept':          'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Cache-Control':   'no-cache',
      'Pragma':          'no-cache',
      'Sec-Fetch-Dest':  'document',
      'Sec-Fetch-Mode':  'navigate',
      'Sec-Fetch-Site':  'none',
      'Upgrade-Insecure-Requests': '1',
    },
    redirect: 'follow',
    timeout:  20000,
  });

  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.text();
}

async function expandUrl(shortUrl) {
  try {
    const nodeFetch = (await import('node-fetch')).default;
    const res = await nodeFetch(shortUrl, {
      redirect: 'follow',
      timeout:  10000,
      headers:  { 'User-Agent': 'Mozilla/5.0' },
    });
    return res.url || shortUrl;
  } catch {
    return shortUrl;
  }
}
