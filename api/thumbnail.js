export default async function handler(req, res) {
  const { url } = req.query;
  if (!url) return res.status(400).json({ error: 'Missing url' });

  try {
    const decoded = decodeURIComponent(url);
    
    // _nc_tpa entfernen – das ist Metas Hotlink-Schutz für Browser
    // Ohne diesen Parameter akzeptiert Meta Server-zu-Server Requests
    const cleanUrl = new URL(decoded);
    cleanUrl.searchParams.delete('_nc_tpa');
    cleanUrl.searchParams.delete('edm');
    
    const response = await fetch(cleanUrl.toString(), {
      headers: {
        'User-Agent': 'facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)',
        'Accept': 'image/avif,image/webp,image/apng,image/*,*/*;q=0.8',
      }
    });

    if (!response.ok) {
      // Fallback: weserv.nl
      const weservUrl = `https://images.weserv.nl/?url=${encodeURIComponent(cleanUrl.toString())}&w=320&h=320&fit=cover&output=jpg`;
      res.setHeader('Location', weservUrl);
      return res.status(302).end();
    }

    const contentType = response.headers.get('content-type') || 'image/jpeg';
    const buffer = await response.arrayBuffer();
    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.send(Buffer.from(buffer));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
