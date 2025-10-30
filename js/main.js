diff --git a/js/main.js b/js/main.js
index 4b585b61ad354cecccce08e460126acff8659696..faf3d3d3ce482d22d4d81fe6fbb4f50ce5ec6728 100644
--- a/js/main.js
+++ b/js/main.js
@@ -1,81 +1,98 @@
 function generateUUID() {
     return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
         var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
         return v.toString(16);
     });
 }
 
 // 1. Initialize Supabase
 const SUPABASE_URL = 'https://fvyqzjwbvnkdyclljzix.supabase.co'; // <-- REPLACE THIS
 const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ2eXF6andidm5rZHljbGxqeml4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE4MjYzMDIsImV4cCI6MjA3NzQwMjMwMn0.Pvj0cQgQEiPA6IhnShN9oq4hB34Whag86UVfYIxOl0k'; // <-- REPLACE THIS
-const supabase = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
+const supabaseClient = window.supabase?.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
+
+if (!supabaseClient) {
+    console.error('Supabase client could not be initialized.');
+}
+
+window.supabaseClient = supabaseClient;
 
 // Global state variables (temporary in memory)
 let CURRENT_USER_ID = localStorage.getItem('user_id');
 let CURRENT_SESSION_ID = localStorage.getItem('session_id');
 async function handleLogin() {
+    if (!supabaseClient) {
+        alert('Supabase client is unavailable. Please check your configuration.');
+        return;
+    }
+
     const username = document.getElementById('username_input').value;
     if (!username) return alert("Please enter a username.");
 
     // 2. Call the Login RPC
-    const { data, error } = await supabase.rpc('login_or_create_user', { 
+    const { data, error } = await supabaseClient.rpc('login_or_create_user', {
         p_username: username 
     });
 
     if (error) {
         console.error('Login error:', error);
         alert('Login failed: ' + error.message);
         return;
     }
 
     // 3. Store User and Session Data
     CURRENT_USER_ID = data; // The RPC returns the user_id (BIGINT)
     CURRENT_SESSION_ID = generateUUID();
 
     localStorage.setItem('user_id', CURRENT_USER_ID);
     localStorage.setItem('session_id', CURRENT_SESSION_ID);
 
     // Redirect to the profile/menu page for the next step
     window.location.href = 'profile.html'; 
 }
 async function subscribeToProfile() {
+    if (!supabaseClient) {
+        console.error('Supabase client is not initialized.');
+        return;
+    }
+
     if (!CURRENT_USER_ID) {
         document.getElementById('status_message').innerText = "Not logged in. Redirecting...";
         setTimeout(() => window.location.href = 'index.html', 1000);
         return;
     }
 
     // First, fetch the current state
-    const { data: profile, error } = await supabase
+    const { data: profile, error } = await supabaseClient
         .from('user_profiles')
         .select('*')
         .eq('user_id', CURRENT_USER_ID)
         .single();
 
     if (error) { console.error('Error fetching profile:', error); return; }
 
     // Function to update the HTML display
     const updateDisplay = (data) => {
         document.getElementById('wallet_balance').innerText = data.wallet_balance.toFixed(2);
         document.getElementById('risk_score').innerText = data.risk_score.toFixed(1);
         document.getElementById('pace_score').innerText = data.pace_score.toFixed(1);
         document.getElementById('status_message').innerText = `Welcome, ${data.username}!`;
     };
 
     // Initial display
     updateDisplay(profile);
 
     // Second, set up the Realtime subscription
-    supabase
+    supabaseClient
         .channel('profile_changes') // You can name this anything
         .on('postgres_changes', 
             { event: 'UPDATE', schema: 'public', table: 'user_profiles', filter: `user_id=eq.${CURRENT_USER_ID}` },
             (payload) => {
                 console.log('Realtime Update Received:', payload.new);
                 updateDisplay(payload.new); // payload.new contains the updated row
             }
         )
         .subscribe();
 }
 // Call the function when the profile page loads
-// You'll need to add a line like: window.onload = subscribeToProfile; in profile.html or main.js
\ No newline at end of file
+// You'll need to add a line like: window.onload = subscribeToProfile; in profile.html or main.js
+
