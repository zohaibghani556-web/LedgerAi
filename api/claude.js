export default async function handler(req, res) {

  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Basic security — only allow requests from your own site
  const origin = req.headers.origin || '';
  const allowed = [
    'https://ledger-ai-theta.vercel.app',  // production
    'https://ledger-ai-git-main-zohaibghani556-webs-projects.vercel.app', // preview
    'http://localhost:3000',
    'http://127.0.0.1:5500',
    'null'
  ];
  if (!allowed.includes(origin) && origin !== '') {
    return res.status(403).json({ error: 'Forbidden' });
  }

  // Get the API key from Vercel's environment (never exposed to browser)
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'API key not configured on server' });
  }

  try {
    // Forward the request to Anthropic
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify(req.body)
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json(data);
    }

    return res.status(200).json(data);

  } catch (error) {
    return res.status(500).json({ error: 'Failed to reach Anthropic API' });
  }
}
