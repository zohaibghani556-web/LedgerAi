import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_ANON_KEY
  );

  const { action, token, data } = req.body;

  // Verify the user's JWT token
  const { data: { user }, error: authError } = await supabase.auth.getUser(token);
  if (authError || !user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    if (action === 'save_transactions') {
      // Delete existing transactions for this period and user
      await supabase
        .from('transactions')
        .delete()
        .eq('user_id', user.id)
        .eq('period', data.period);

      // Insert new ones
      if (data.transactions.length > 0) {
        const rows = data.transactions.map(t => ({
          user_id:     user.id,
          period:      data.period,
          date:        t.date,
          description: t.description,
          amount:      parseFloat(t.amount) || 0,
          category:    t.category || '',
          flag:        t.flag || 'none',
          account_type: data.accountType || 'personal'
        }));
        const { error } = await supabase.from('transactions').insert(rows);
        if (error) throw error;
      }
      return res.status(200).json({ success: true, saved: data.transactions.length });
    }

    if (action === 'load_transactions') {
      const { data: rows, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', user.id)
        .order('date', { ascending: true });
      if (error) throw error;
      return res.status(200).json({ success: true, transactions: rows });
    }

    if (action === 'delete_period') {
      const { error } = await supabase
        .from('transactions')
        .delete()
        .eq('user_id', user.id)
        .eq('period', data.period);
      if (error) throw error;
      return res.status(200).json({ success: true });
    }

    if (action === 'save_settings') {
      const { error } = await supabase
        .from('user_settings')
        .upsert({
          user_id:     user.id,
          company:     data.company,
          industry:    data.industry,
          currency:    data.currency,
          fiscal_year: data.fiscalYear,
          ai_mode:     data.aiMode
        });
      if (error) throw error;
      return res.status(200).json({ success: true });
    }

    if (action === 'load_settings') {
      const { data: row, error } = await supabase
        .from('user_settings')
        .select('*')
        .eq('user_id', user.id)
        .single();
      if (error && error.code !== 'PGRST116') throw error;
      return res.status(200).json({ success: true, settings: row || null });
    }

    if (action === 'get_profile') {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
      if (error) throw error;
      return res.status(200).json({ success: true, profile });
    }

    return res.status(400).json({ error: 'Unknown action' });

  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
