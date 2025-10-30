-function generateUUID() {
-    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
-        var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
-        return v.toString(16);
-    });
-}
-
-// 1. Initialize Supabase
-const SUPABASE_URL = 'https://fvyqzjwbvnkdyclljzix.supabase.co'; // <-- REPLACE THIS
-const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ2eXF6andidm5rZHljbGxqeml4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE4MjYzMDIsImV4cCI6MjA3NzQwMjMwMn0.Pvj0cQgQEiPA6IhnShN9oq4hB34Whag86UVfYIxOl0k'; // <-- REPLACE THIS
-const supabase = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
-
-// Global state variables (temporary in memory)
-let CURRENT_USER_ID = localStorage.getItem('user_id');
-let CURRENT_SESSION_ID = localStorage.getItem('session_id');
-async function handleLogin() {
-    const username = document.getElementById('username_input').value;
-    if (!username) return alert("Please enter a username.");
-
-    // 2. Call the Login RPC
-    const { data, error } = await supabase.rpc('login_or_create_user', { 
-        p_username: username 
-    });
-
-    if (error) {
-        console.error('Login error:', error);
-        alert('Login failed: ' + error.message);
-        return;
+(function () {
+    'use strict';
+
+    const SUPABASE_URL = 'https://fvyqzjwbvnkdyclljzix.supabase.co';
+    const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ2eXF6andidm5rZHljbGxqeml4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE4MjYzMDIsImV4cCI6MjA3NzQwMjMwMn0.Pvj0cQgQEiPA6IhnShN9oq4hB34Whag86UVfYIxOl0k';
+
+    const supabaseClient = window.supabase?.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
+
+    if (!supabaseClient) {
+        console.error('Supabase client failed to initialize.');
+    }
+
+    window.supabaseClient = supabaseClient;
+
+    let CURRENT_USER_ID = window.localStorage.getItem('CURRENT_USER_ID');
+    let CURRENT_SESSION_ID = window.localStorage.getItem('CURRENT_SESSION_ID');
+
+    function persistSession(userId, sessionId) {
+        CURRENT_USER_ID = userId;
+        CURRENT_SESSION_ID = sessionId;
+        window.localStorage.setItem('CURRENT_USER_ID', userId ?? '');
+        window.localStorage.setItem('CURRENT_SESSION_ID', sessionId ?? '');
     }
 
-    // 3. Store User and Session Data
-    CURRENT_USER_ID = data; // The RPC returns the user_id (BIGINT)
-    CURRENT_SESSION_ID = generateUUID();
-
-    localStorage.setItem('user_id', CURRENT_USER_ID);
-    localStorage.setItem('session_id', CURRENT_SESSION_ID);
-
-    // Redirect to the profile/menu page for the next step
-    window.location.href = 'profile.html'; 
-}
-async function subscribeToProfile() {
-    if (!CURRENT_USER_ID) {
-        document.getElementById('status_message').innerText = "Not logged in. Redirecting...";
-        setTimeout(() => window.location.href = 'index.html', 1000);
-        return;
+    function generateUUID() {
+        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (char) => {
+            const random = crypto.getRandomValues(new Uint8Array(1))[0] & 15;
+            const value = char === 'x' ? random : (random & 0x3) | 0x8;
+            return value.toString(16);
+        });
     }
 
-    // First, fetch the current state
-    const { data: profile, error } = await supabase
-        .from('user_profiles')
-        .select('*')
-        .eq('user_id', CURRENT_USER_ID)
-        .single();
-
-    if (error) { console.error('Error fetching profile:', error); return; }
-
-    // Function to update the HTML display
-    const updateDisplay = (data) => {
-        document.getElementById('wallet_balance').innerText = data.wallet_balance.toFixed(2);
-        document.getElementById('risk_score').innerText = data.risk_score.toFixed(1);
-        document.getElementById('pace_score').innerText = data.pace_score.toFixed(1);
-        document.getElementById('status_message').innerText = `Welcome, ${data.username}!`;
-    };
-
-    // Initial display
-    updateDisplay(profile);
-
-    // Second, set up the Realtime subscription
-    supabase
-        .channel('profile_changes') // You can name this anything
-        .on('postgres_changes', 
-            { event: 'UPDATE', schema: 'public', table: 'user_profiles', filter: `user_id=eq.${CURRENT_USER_ID}` },
-            (payload) => {
-                console.log('Realtime Update Received:', payload.new);
-                updateDisplay(payload.new); // payload.new contains the updated row
+    async function handleLogin() {
+        if (!supabaseClient) {
+            alert('Supabase client is unavailable. Please verify your configuration.');
+            return;
+        }
+
+        const usernameInput = document.getElementById('username_input');
+        const statusNode = document.getElementById('login_status');
+        const username = usernameInput?.value.trim();
+
+        if (!username) {
+            if (statusNode) {
+                statusNode.textContent = 'Please enter a username to continue.';
+            }
+            alert('Please enter a username to continue.');
+            return;
+        }
+
+        if (statusNode) {
+            statusNode.textContent = 'Signing you in...';
+        }
+
+        try {
+            const { data, error } = await supabaseClient.rpc('login_or_create_user', {
+                p_username: username
+            });
+
+            if (error) {
+                console.error('Login RPC failed:', error);
+                if (statusNode) {
+                    statusNode.textContent = `Login failed: ${error.message}`;
+                }
+                alert(`Login failed: ${error.message}`);
+                return;
+            }
+
          const userId = data; 
            
            if (!userId || isNaN(Number(userId))) {
                if (statusNode) {
                    statusNode.textContent = 'Login failed: Invalid user ID received.';
                }
                alert('Login failed: Invalid user ID received.');
                return;
            }
            // --- MODIFIED CODE END ---

            const sessionId = generateUUID();
            // Note: We use String(userId) because localStorage only stores strings
            persistSession(String(userId), sessionId); 

            if (statusNode) {
                statusNode.textContent = 'Login successful! Redirecting...';
            }

            window.location.href = 'profile.html';
        } catch (error)
+                }
+                alert('Login failed: invalid user data received.');
+                return;
             }
-        )
-        .subscribe();
-}
-// Call the function when the profile page loads
-// You'll need to add a line like: window.onload = subscribeToProfile; in profile.html or main.js
\ No newline at end of file
+
+            const sessionId = generateUUID();
+            persistSession(String(userId), sessionId);
+
+            if (statusNode) {
+                statusNode.textContent = 'Login successful! Redirecting...';
+            }
+
+            window.location.href = 'profile.html';
+        } catch (error) {
+            console.error('Unexpected login error:', error);
+            if (statusNode) {
+                statusNode.textContent = 'An unexpected error occurred during login.';
+            }
+            alert('An unexpected error occurred during login.');
+        }
+    }
+
+    function formatNumber(value, decimals) {
+        const numericValue = typeof value === 'number' ? value : Number.parseFloat(value);
+        if (Number.isFinite(numericValue)) {
+            return numericValue.toFixed(decimals);
+        }
+        return (0).toFixed(decimals);
+    }
+
+    function updateDisplay(profileData = {}) {
+        const {
+            username,
+            wallet_balance,
+            risk_score,
+            pace_score,
+            volatility_score
+        } = profileData;
+
+        const usernameNode = document.getElementById('current_username');
+        if (usernameNode) {
+            usernameNode.textContent = username ?? 'Player';
+        }
+
+        const walletNode = document.getElementById('wallet_balance');
+        if (walletNode) {
+            walletNode.textContent = formatNumber(wallet_balance, 2);
+        }
+
+        const riskNode = document.getElementById('risk_score');
+        if (riskNode) {
+            riskNode.textContent = formatNumber(risk_score, 1);
+        }
+
+        const paceNode = document.getElementById('pace_score');
+        if (paceNode) {
+            paceNode.textContent = formatNumber(pace_score, 1);
+        }
+
+        const volatilityNode = document.getElementById('volatility_score');
+        if (volatilityNode) {
+            volatilityNode.textContent = formatNumber(volatility_score, 1);
+        }
+    }
+
+    async function subscribeToProfile() {
+        if (!supabaseClient) {
+            alert('Supabase client is unavailable. Please log in again.');
+            return;
+        }
+
+        if (!CURRENT_USER_ID) {
+            alert('No active session found. Please log in again.');
+            window.location.href = 'index.html';
+            return;
+        }
+
+        try {
+            const { data, error } = await supabaseClient
+                .from('user_profiles')
+                .select('*')
+                .eq('user_id', CURRENT_USER_ID)
+                .single();
+
+            if (error) {
+                console.error('Initial profile fetch failed:', error);
+            }
+
+            if (data) {
+                updateDisplay(data);
+            }
+
+            supabaseClient
+                .channel('user_profiles_changes')
+                .on(
+                    'postgres_changes',
+                    {
+                        event: '*',
+                        schema: 'public',
+                        table: 'user_profiles',
+                        filter: `user_id=eq.${CURRENT_USER_ID}`
+                    },
+                    (payload) => {
+                        if (payload?.new) {
+                            updateDisplay(payload.new);
+                        }
+                    }
+                )
+                .subscribe();
+        } catch (error) {
+            console.error('Profile subscription error:', error);
+        }
+    }
+
+    function openSlotsModal() {
+        const modal = document.getElementById('slots_modal');
+        if (modal) {
+            modal.classList.add('show');
+            modal.setAttribute('aria-hidden', 'false');
+            const stakeInput = document.getElementById('slots_stake_input');
+            if (stakeInput) {
+                stakeInput.focus();
+            }
+        }
+    }
+
+    function closeSlotsModal() {
+        const modal = document.getElementById('slots_modal');
+        if (modal) {
+            modal.classList.remove('show');
+            modal.setAttribute('aria-hidden', 'true');
+        }
+    }
+
+    function updateReelsDisplay(symbols) {
+        const reelsNode = document.getElementById('slots_reels_display');
+        if (reelsNode) {
+            reelsNode.textContent = symbols.join(' ');
+        }
+    }
+
+    async function slotsGameLogic() {
+        if (!supabaseClient) {
+            alert('Supabase client is unavailable. Please log in again.');
+            return;
+        }
+
+        if (!CURRENT_USER_ID || !CURRENT_SESSION_ID) {
+            alert('No active player session found. Please log in again.');
+            window.location.href = 'index.html';
+            return;
+        }
+
+        const stakeInput = document.getElementById('slots_stake_input');
+        const stakeValue = Number.parseFloat(stakeInput?.value ?? '0');
+
+        if (!Number.isFinite(stakeValue) || stakeValue <= 0) {
+            alert('Enter a valid stake greater than 0.');
+            return;
+        }
+
+        const symbols = ['🍋', '🍒', '7️⃣', '💎', '⭐'];
+        const spinSymbols = Array.from({ length: 3 }, () => symbols[Math.floor(Math.random() * symbols.length)]);
+        updateReelsDisplay(spinSymbols);
+
+        const outcomeRoll = Math.random();
+        let resultAmount;
+
+        if (outcomeRoll <= 0.45) {
+            resultAmount = -stakeValue;
+        } else if (outcomeRoll <= 0.95) {
+            resultAmount = stakeValue * 0.5;
+        } else {
+            resultAmount = stakeValue * 5;
+        }
+
+        try {
+            const { error } = await supabaseClient.rpc('submit_wager_transaction', {
+                p_user_id: Number(CURRENT_USER_ID),
+                p_session_id: CURRENT_SESSION_ID,
+                p_game_id: 'slots',
+                p_stake: stakeValue,
+                p_result_amount: resultAmount
+            });
+
+            if (error) {
+                console.error('Slots wager failed:', error);
+                alert(error.message ?? 'Transaction failed. Please try again.');
+                return;
+            }
+
+            stakeInput.value = '';
+            closeSlotsModal();
+        } catch (error) {
+            console.error('Unexpected slots error:', error);
+            alert('Unexpected error submitting wager.');
+        }
+    }
+
+    window.handleLogin = handleLogin;
+    window.subscribeToProfile = subscribeToProfile;
+    window.updateDisplay = updateDisplay;
+    window.openSlotsModal = openSlotsModal;
+    window.closeSlotsModal = closeSlotsModal;
+    window.slotsGameLogic = slotsGameLogic;
+})();
