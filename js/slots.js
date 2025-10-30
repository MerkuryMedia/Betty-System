+(function () {
+    const MODAL_ID = 'slots_modal';
+    const STAKE_INPUT_ID = 'slots_stake_input';
+    const REELS_DISPLAY_ID = 'slots_reels_display';
+    const SPIN_BUTTON_ID = 'slots_wager_button';
+    const CLOSE_BUTTON_ID = 'slots_close_button';
+    const OPEN_BUTTON_ID = 'open_slots_modal_button';
+    const REEL_SYMBOLS = ['🍒', '🍋', '⭐', '7️⃣', '🔔', '🍉'];
+
+    const getModal = () => document.getElementById(MODAL_ID);
+    const getStakeInput = () => document.getElementById(STAKE_INPUT_ID);
+    const getSpinButton = () => document.getElementById(SPIN_BUTTON_ID);
+    const getReelsDisplay = () => document.getElementById(REELS_DISPLAY_ID);
+
+    const updateReelsDisplay = (reels) => {
+        const display = getReelsDisplay();
+        if (display) {
+            display.textContent = reels.join(' | ');
+        }
+    };
+
+    const toggleModal = (show) => {
+        const modal = getModal();
+        const stakeInput = getStakeInput();
+
+        if (!modal) {
+            return;
+        }
+
+        if (show) {
+            modal.classList.add('show');
+            modal.setAttribute('aria-hidden', 'false');
+            if (stakeInput) {
+                requestAnimationFrame(() => stakeInput.focus());
+            }
+            document.addEventListener('keydown', handleEscape, { once: true });
+        } else {
+            modal.classList.remove('show');
+            modal.setAttribute('aria-hidden', 'true');
+        }
+    };
+
+    const handleEscape = (event) => {
+        if (event.key === 'Escape') {
+            toggleModal(false);
+        }
+    };
+
+    const generateReels = () => Array.from({ length: 3 }, () => REEL_SYMBOLS[Math.floor(Math.random() * REEL_SYMBOLS.length)]);
+
+    const formatResultMessage = (amount) => {
+        const absoluteAmount = Math.abs(amount).toFixed(2);
+        if (amount > 0) {
+            return `You won ${absoluteAmount} credits!`;
+        }
+        if (amount < 0) {
+            return `You lost ${absoluteAmount} credits.`;
+        }
+        return 'Round complete! You broke even.';
+    };
+
+    async function slotsGameLogic() {
+        const stakeInput = getStakeInput();
+        const spinButton = getSpinButton();
+
+        if (!stakeInput) {
+            console.error('Slots stake input field was not found.');
+            return;
+        }
+
+        const stake = Number.parseFloat(stakeInput.value);
+        if (!Number.isFinite(stake) || stake <= 0) {
+            alert('Please enter a valid positive stake amount.');
+            return;
+        }
+
+        if (!window.CURRENT_USER_ID || !window.CURRENT_SESSION_ID) {
+            alert('You must be logged in to place a wager.');
+            return;
+        }
+
+        const client = window.supabaseClient || window.supabase;
+        if (!client || typeof client.rpc !== 'function') {
+            alert('Supabase client is not available. Please refresh and try again.');
+            return;
+        }
+
+        const reels = generateReels();
+        updateReelsDisplay(reels);
+
+        const randomOutcome = Math.random();
+        let resultAmount;
+        if (randomOutcome <= 0.45) {
+            resultAmount = -stake;
+        } else if (randomOutcome <= 0.95) {
+            resultAmount = stake * 0.5;
+        } else {
+            resultAmount = stake * 5;
+        }
+
+        try {
+            if (spinButton) {
+                spinButton.disabled = true;
+                spinButton.textContent = 'Spinning...';
+            }
+
+            const { error } = await client.rpc('submit_wager_transaction', {
+                p_user_id: window.CURRENT_USER_ID,
+                p_session_id: window.CURRENT_SESSION_ID,
+                p_game_id: 'slots',
+                p_stake: stake,
+                p_result_amount: resultAmount
+            });
+
+            if (error) {
+                throw error;
+            }
+
+            toggleModal(false);
+            alert(formatResultMessage(resultAmount));
+            stakeInput.value = '';
+        } catch (err) {
+            console.error('Slots transaction failed:', err);
+            const message = typeof err?.message === 'string' ? err.message : 'Transaction failed. Please try again.';
+            if (message.toLowerCase().includes('insufficient')) {
+                alert('Insufficient funds. Please top up your wallet and try again.');
+            } else {
+                alert(message);
+            }
+        } finally {
+            if (spinButton) {
+                spinButton.disabled = false;
+                spinButton.textContent = 'Spin';
+            }
+        }
+    }
+
+    const initializeSlotsModal = () => {
+        const modal = getModal();
+        const openButton = document.getElementById(OPEN_BUTTON_ID);
+        const closeButton = document.getElementById(CLOSE_BUTTON_ID);
+        const spinButton = getSpinButton();
+
+        if (!modal) {
+            return;
+        }
+
+        if (openButton) {
+            openButton.addEventListener('click', () => toggleModal(true));
+        }
+
+        if (closeButton) {
+            closeButton.addEventListener('click', () => toggleModal(false));
+        }
+
+        modal.addEventListener('click', (event) => {
+            if (event.target === modal) {
+                toggleModal(false);
+            }
+        });
+
+        if (spinButton) {
+            spinButton.addEventListener('click', slotsGameLogic);
+        }
+    };
+
+    document.addEventListener('DOMContentLoaded', initializeSlotsModal);
+
+    window.slotsGameLogic = slotsGameLogic;
+})();
