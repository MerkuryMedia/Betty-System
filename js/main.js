(function () {
  'use strict';

  // --- Supabase Init ---
  const SUPABASE_URL = 'https://fvyqzjwbvnkdyclljzix.supabase.co';
  const SUPABASE_ANON_KEY =
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ2eXF6andidm5rZHljbGxqeml4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE4MjYzMDIsImV4cCI6MjA3NzQwMjMwMn0.Pvj0cQgQEiPA6IhnShN9oq4hB34Whag86UVfYIxOl0k';

  const supabaseClient = window.supabase?.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  if (!supabaseClient) console.error('Supabase client failed to initialize.');
  window.supabaseClient = supabaseClient;

  // --- Local Session State ---
  let CURRENT_USER_ID = window.localStorage.getItem('CURRENT_USER_ID');
  let CURRENT_SESSION_ID = window.localStorage.getItem('CURRENT_SESSION_ID');

  function persistSession(userId, sessionId) {
    CURRENT_USER_ID = userId ?? '';
    CURRENT_SESSION_ID = sessionId ?? '';
    window.localStorage.setItem('CURRENT_USER_ID', CURRENT_USER_ID);
    window.localStorage.setItem('CURRENT_SESSION_ID', CURRENT_SESSION_ID);
  }

  // --- Utils ---
  function generateUUID() {
    try {
      if (window.crypto?.getRandomValues) {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
          const r = crypto.getRandomValues(new Uint8Array(1))[0] & 15;
          const v = c === 'x' ? r : (r & 0x3) | 0x8;
          return v.toString(16);
        });
      }
    } catch (_) {
      // fall through to Math.random fallback
    }
    // Demo-safe fallback (non-cryptographic)
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }

  function formatNumber(value, decimals) {
    const n = typeof value === 'number' ? value : Number.parseFloat(value);
    return Number.isFinite(n) ? n.toFixed(decimals) : (0).toFixed(decimals);
  }

  // --- Login Flow ---
  async function handleLogin() {
    if (!supabaseClient) {
      alert('Supabase client is unavailable. Please verify your configuration.');
      return;
    }

    const usernameInput = document.getElementById('username_input');
    const statusNode = document.getElementById('login_status');
    const username = usernameInput?.value.trim();

    if (!username) {
      statusNode && (statusNode.textContent = 'Please enter a username to continue.');
      alert('Please enter a username to continue.');
      return;
    }

    statusNode && (statusNode.textContent = 'Signing you in...');

    try {
      const { data, error } = await supabaseClient.rpc('login_or_create_user', { p_username: username });
      if (error) {
        console.error('Login RPC failed:', error);
        statusNode && (statusNode.textContent = `Login failed: ${error.message}`);
        alert(`Login failed: ${error.message}`);
        return;
      }

      // Support both primitive ID and object with user_id
      const userId = (data && typeof data === 'object' && 'user_id' in data) ? data.user_id : data;

      if (!userId || Number.isNaN(Number(userId))) {
        statusNode && (statusNode.textContent = 'Login failed: Invalid user ID received.');
        alert('Login failed: Invalid user ID received.');
        return;
      }

      const sessionId = generateUUID();
      persistSession(String(userId), sessionId);

      statusNode && (statusNode.textContent = 'Login successful! Redirecting...');
      window.location.href = 'profile.html';
    } catch (e) {
      console.error('Unexpected login error:', e);
      statusNode && (statusNode.textContent = 'An unexpected error occurred during login.');
      alert('An unexpected error occurred during login.');
    }
  }

  // --- Profile Rendering / Realtime ---
  function updateDisplay(profileData = {}) {
    const { username, wallet_balance, risk_score, pace_score, volatility_score } = profileData;

    const usernameNode = document.getElementById('current_username');
    if (usernameNode) usernameNode.textContent = username ?? 'Player';

    const walletNode = document.getElementById('wallet_balance');
    if (walletNode) walletNode.textContent = formatNumber(wallet_balance, 2);

    const riskNode = document.getElementById('risk_score');
    if (riskNode) riskNode.textContent = formatNumber(risk_score, 1);

    const paceNode = document.getElementById('pace_score');
    if (paceNode) paceNode.textContent = formatNumber(pace_score, 1);

    const volNode = document.getElementById('volatility_score');
    if (volNode) volNode.textContent = formatNumber(volatility_score, 1);
  }

  async function subscribeToProfile() {
    if (!supabaseClient) {
      alert('Supabase client is unavailable. Please log in again.');
      return;
    }

    if (!CURRENT_USER_ID) {
      alert('No active session found. Please log in again.');
      window.location.href = 'index.html';
      return;
    }

    const userIdNum = Number(CURRENT_USER_ID);

    try {
      const { data, error } = await supabaseClient
        .from('user_profiles')
        .select('*')
        .eq('user_id', userIdNum)
        .single();

      if (error) console.error('Initial profile fetch failed:', error);
      if (data) updateDisplay(data);

      supabaseClient
        .channel('user_profiles_changes')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'user_profiles', filter: `user_id=eq.${userIdNum}` },
          (payload) => {
            if (payload?.new) updateDisplay(payload.new);
          }
        )
        .subscribe();
    } catch (e) {
      console.error('Profile subscription error:', e);
    }
  }

  // --- Slots Demo Modal / Logic ---
  function openSlotsModal() {
    const modal = document.getElementById('slots_modal');
    if (!modal) return;
    modal.classList.add('show');
    modal.setAttribute('aria-hidden', 'false');
    document.getElementById('slots_stake_input')?.focus();
  }

  function closeSlotsModal() {
    const modal = document.getElementById('slots_modal');
    if (!modal) return;
    modal.classList.remove('show');
    modal.setAttribute('aria-hidden', 'true');
  }

  function updateReelsDisplay(symbols) {
    const reelsNode = document.getElementById('slots_reels_display');
    if (reelsNode) reelsNode.textContent = symbols.join(' ');
  }

  async function slotsGameLogic() {
    if (!supabaseClient) {
      alert('Supabase client is unavailable. Please log in again.');
      return;
    }
    if (!CURRENT_USER_ID || !CURRENT_SESSION_ID) {
      alert('No active player session found. Please log in again.');
      window.location.href = 'index.html';
      return;
    }

    const stakeInput = document.getElementById('slots_stake_input');
    const stakeValue = Number.parseFloat(stakeInput?.value ?? '0');
    if (!Number.isFinite(stakeValue) || stakeValue <= 0) {
      alert('Enter a valid stake greater than 0.');
      return;
    }

    const symbols = ['🍋', '🍒', '7️⃣', '💎', '⭐'];
    const spinSymbols = Array.from({ length: 3 }, () => symbols[Math.floor(Math.random() * symbols.length)]);
    updateReelsDisplay(spinSymbols);

    const roll = Math.random();
    let resultAmount;
    if (roll <= 0.45) resultAmount = -stakeValue;
    else if (roll <= 0.95) resultAmount = stakeValue * 0.5;
    else resultAmount = stakeValue * 5;

    try {
      const { error } = await supabaseClient.rpc('submit_wager_transaction', {
        p_user_id: Number(CURRENT_USER_ID),
        p_session_id: CURRENT_SESSION_ID,
        p_game_id: 'slots',
        p_stake: stakeValue,
        p_result_amount: resultAmount
      });

      if (error) {
        console.error('Slots wager failed:', error);
        alert(error.message ?? 'Transaction failed. Please try again.');
        return;
      }

      if (stakeInput) stakeInput.value = '';
      closeSlotsModal();
    } catch (e) {
      console.error('Unexpected slots error:', e);
      alert('Unexpected error submitting wager.');
    }
  }

  // --- Expose to window for inline handlers ---
  window.handleLogin = handleLogin;
  window.subscribeToProfile = subscribeToProfile;
  window.openSlotsModal = openSlotsModal;
  window.closeSlotsModal = closeSlotsModal;
  window.slotsGameLogic = slotsGameLogic;
})();
