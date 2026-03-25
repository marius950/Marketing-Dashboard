export default async function handler(req, res) {
  const { url } = req.query;
  if (!url) return res.status(400).json({ error: 'Missing url' });

  try {
    const decoded = decodeURIComponent(url);

    // Direkt versuchen mit Browser-Headers
    const response = await fetch(decoded, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Referer': 'https://www.facebook.com/',
        'Accept': 'image/avif,image/webp,image/apng,image/*,*/*;q=0.8',
        'Accept-Language': 'de-DE,de;q=0.9,en;q=0.8',
      }
    });

    if (!response.ok) {
      // Fallback: weserv.nl als externer Proxy
      const weservUrl = `https://images.weserv.nl/?url=${encodeURIComponent(decoded)}&w=320&h=320&fit=cover&output=jpg`;
      res.setHeader('Location', weservUrl);
      return res.status(302).end();
    }

    const contentType = response.headers.get('content-type') || 'image/jpeg';
    const buffer = await response.arrayBuffer();
    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'public, max-age=86400');
    res.send(Buffer.from(buffer));
  } catch (e) {
    // Fallback bei jedem Fehler: weserv.nl
    const weservUrl = `https://images.weserv.nl/?url=${encodeURIComponent(decodeURIComponent(url))}&w=320&h=320&fit=cover&output=jpg`;
    res.setHeader('Location', weservUrl);
    res.status(302).end();
  }
}
