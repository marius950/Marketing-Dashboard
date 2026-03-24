export default async function handler(req, res) {
  const { url } = req.query;
  if (!url) return res.status(400).json({ error: 'Missing url' });
  
  // Redirect zu weserv.nl – externer Bildproxy der fbcdn unterstützt
  const proxyUrl = `https://images.weserv.nl/?url=${encodeURIComponent(decodeURIComponent(url))}&w=320&h=320&fit=cover&output=jpg`;
  res.setHeader('Location', proxyUrl);
  res.status(302).end();
}
