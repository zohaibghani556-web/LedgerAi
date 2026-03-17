export default function handler(req, res) {
  // Only deliver the public/anon keys — never the secret key
  res.status(200).json({
    supabaseUrl:  process.env.SUPABASE_URL  || '',
    supabaseAnon: process.env.SUPABASE_ANON_KEY || ''
  });
}
