// script.js - Logic Tabunganku (tidak diubah, hanya dipisah)
const STORAGE_KEY = 'celenganku_pro_goals_v6';
let goals = [];
let currentGoalId = null;

function showToast(message, isError = false) {
    const toast = document.getElementById('toast');
    if (!toast) return;
    toast.textContent = message;
    toast.style.background = isError ? 'rgba(255, 59, 48, 0.95)' : 'rgba(28, 28, 30, 0.95)';
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 2500);
}

function formatRupiah(amount) {
    if (isNaN(amount) || amount === null) return "Rp0";
    return "Rp" + amount.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

function formatDateIndonesian(date) {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
    return `${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;
}

function formatDateTimeIndonesian(date) {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
    return `${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()} • ${date.getHours().toString().padStart(2,'0')}:${date.getMinutes().toString().padStart(2,'0')}`;
}

function calculateTotalSaved(goal) {
    if (!goal || !goal.transactions) return 0;
    return goal.transactions.reduce((sum, t) => {
        if (t.type === 'tambah') return sum + t.amount;
        return sum - t.amount;
    }, 0);
}

function calculateEstimatedDate(goal) {
    const totalSaved = calculateTotalSaved(goal);
    const deficit = goal.targetAmount - totalSaved;
    if (deficit <= 0) return { date: null, days: 0, isAchieved: true };
    if (goal.dailySaving <= 0) return { date: null, days: Infinity, isAchieved: false };
    const daysNeeded = Math.ceil(deficit / goal.dailySaving);
    const estimatedDate = new Date();
    estimatedDate.setDate(estimatedDate.getDate() + daysNeeded);
    return { date: estimatedDate, days: daysNeeded, isAchieved: false, formattedDate: formatDateIndonesian(estimatedDate) };
}

function calculateProgress(goal) {
    const totalSaved = calculateTotalSaved(goal);
    const deficit = goal.targetAmount - totalSaved;
    const percent = Math.min(100, Math.max(0, (totalSaved / goal.targetAmount) * 100));
    const estimation = calculateEstimatedDate(goal);
    return { totalSaved, deficit, percent, estimation };
}

function sanitizeInput(str) {
    if (!str) return '';
    return str.replace(/[&<>]/g, m => {
        if (m === '&') return '&amp;';
        if (m === '<') return '&lt;';
        if (m === '>') return '&gt;';
        return m;
    });
}

function loadFromStorage() {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
        try {
            goals = JSON.parse(stored);
            goals.forEach(goal => {
                if (goal.transactions) {
                    goal.transactions.forEach(tx => {
                        if (typeof tx.timestamp === 'string') tx.timestamp = parseInt(tx.timestamp);
                        if (!tx.type) tx.type = 'tambah';
                    });
                }
                if (!goal.reminderEnabled) goal.reminderEnabled = false;
            });
        } catch (e) {
            goals = [];
        }
    }
    if (!goals || goals.length === 0) {
        const sampleGoal = {
            id: Date.now().toString(),
            name: "Liburan ke Bali",
            targetAmount: 5000000,
            dailySaving: 100000,
            createdAt: formatDateIndonesian(new Date()),
            imageUrl: "https://placehold.co/600x400/2C5F8A/FFFFFF?text=Bali",
            transactions: [
                { id: "tx1", date: formatDateTimeIndonesian(new Date(Date.now() - 2 * 86400000)), amount: 250000, type: "tambah", note: "Tabungan awal", timestamp: Date.now() - 2 * 86400000 },
                { id: "tx2", date: formatDateTimeIndonesian(new Date(Date.now() - 1 * 86400000)), amount: 150000, type: "tambah", note: "Bonus", timestamp: Date.now() - 1 * 86400000 }
            ],
            reminderEnabled: false
        };
        goals = [sampleGoal];
        saveToStorage();
    }
}

function saveToStorage() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(goals));
}

function refreshDashboard() {
    const activeContainer = document.getElementById('activeGoalsList');
    const completedContainer = document.getElementById('completedGoalsList');
    const emptyState = document.getElementById('emptyActiveState');
    if (!activeContainer || !completedContainer) return;

    const activeGoals = goals.filter(g => calculateTotalSaved(g) < g.targetAmount);
    const completedGoals = goals.filter(g => calculateTotalSaved(g) >= g.targetAmount);

    if (activeGoals.length === 0) {
        emptyState.style.display = 'block';
        activeContainer.innerHTML = '';
    } else {
        emptyState.style.display = 'none';
        activeContainer.innerHTML = activeGoals.map(goal => {
            const { percent, estimation } = calculateProgress(goal);
            const circumference = 2 * Math.PI * 45;
            const dashArray = (percent / 100) * circumference;
            let estimationText = '';
            if (estimation.isAchieved) estimationText = 'Tercapai! 🎉';
            else if (estimation.date) estimationText = `Target: ${estimation.formattedDate}`;
            else estimationText = `${estimation.days === Infinity ? '~' : estimation.days} Hari Lagi`;
            return `
                <div class="goal-card" data-goal-id="${goal.id}">
                    <img class="goal-preview-img" src="${goal.imageUrl || 'https://placehold.co/600x400/2C2C2E/FFFFFF?text=Celengan'}" alt="goal preview" loading="lazy">
                    <div class="goal-card-content">
                        <div class="goal-title">${sanitizeInput(goal.name)}</div>
                        <div class="stats-row">
                            <span class="target-amount">${formatRupiah(goal.targetAmount)}</span>
                            <span class="daily-rate">${formatRupiah(goal.dailySaving)}/hari</span>
                        </div>
                        <div class="progress-section">
                            <div class="circular-progress">
                                <svg width="90" height="90" viewBox="0 0 100 100">
                                    <circle cx="50" cy="50" r="45" fill="none" stroke="#2C2C2E" stroke-width="8"/>
                                    <circle class="progress-fill" cx="50" cy="50" r="45" fill="none" stroke="#34C759" stroke-width="8" stroke-dasharray="${dashArray}, ${circumference}"/>
                                </svg>
                                <div class="percent-text">${Math.floor(percent)}%</div>
                            </div>
                            <div class="remaining-days">${estimationText}</div>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    }

    completedContainer.innerHTML = completedGoals.map(goal => `
        <div class="goal-card" data-goal-id="${goal.id}">
            <img class="goal-preview-img" src="${goal.imageUrl || 'https://placehold.co/600x400/2C2C2E/FFFFFF?text=Celengan'}" alt="goal preview" loading="lazy">
            <div class="goal-card-content">
                <div class="goal-title">${sanitizeInput(goal.name)} <span class="achievement-badge">✓ TERCAPAI</span></div>
                <div class="stats-row">
                    <span class="target-amount">${formatRupiah(goal.targetAmount)}</span>
                    <span class="daily-rate" style="background:#34C75920; color:#34C759;">✨ Berhasil!</span>
                </div>
                <div class="progress-section">
                    <div class="circular-progress">
                        <svg width="90" height="90" viewBox="0 0 100 100">
                            <circle cx="50" cy="50" r="45" fill="none" stroke="#2C2C2E" stroke-width="8"/>
                            <circle class="progress-fill" cx="50" cy="50" r="45" fill="none" stroke="#34C759" stroke-width="8" stroke-dasharray="283, 283"/>
                        </svg>
                        <div class="percent-text">100%</div>
                    </div>
                    <div class="remaining-days" style="color:#34C759;">🎉 Target tercapai!</div>
                </div>
            </div>
        </div>
    `).join('');

    document.querySelectorAll('#activeGoalsList .goal-card, #completedGoalsList .goal-card').forEach(card => {
        card.removeEventListener('click', handleGoalClick);
        card.addEventListener('click', handleGoalClick);
    });
}

function handleGoalClick(e) {
    const id = e.currentTarget.dataset.goalId;
    if (id) showDetail(id);
}

function refreshDetail() {
    const goal = goals.find(g => g.id === currentGoalId);
    if (!goal) { showDashboard(); return; }
    const { totalSaved, deficit, estimation } = calculateProgress(goal);
    const isCompleted = totalSaved >= goal.targetAmount;

    document.getElementById('detailGoalImage').src = goal.imageUrl || 'https://placehold.co/600x400/2C2C2E/FFFFFF?text=Celengan';
    document.getElementById('detailGoalName').innerText = sanitizeInput(goal.name);
    document.getElementById('detailTargetAmount').innerText = formatRupiah(goal.targetAmount);
    document.getElementById('detailDailyRate').innerText = formatRupiah(goal.dailySaving) + '/hari';
    document.getElementById('createdDateLabel').innerHTML = `📅 Dibuat: ${goal.createdAt}`;

    let estimationText = '';
    if (isCompleted) estimationText = '✅ Tercapai! Selamat! 🎉';
    else if (estimation.date) estimationText = `🎯 Estimasi tercapai: ${estimation.formattedDate} (${estimation.days} hari lagi)`;
    else estimationText = `⏳ Estimasi: ${estimation.days === Infinity ? 'Tidak terbatas' : estimation.days + ' hari lagi'}`;
    document.getElementById('estimationDateLabel').innerHTML = estimationText;

    document.getElementById('totalSavedMetric').innerText = formatRupiah(totalSaved);
    document.getElementById('remainingMetric').innerText = formatRupiah(deficit);

    const sorted = [...goal.transactions].sort((a,b) => b.timestamp - a.timestamp);
    const container = document.getElementById('transactionListContainer');
    if (sorted.length === 0) {
        container.innerHTML = '<div style="background:#1C1C1E; border-radius:20px; padding:20px; text-align:center; color:#8E8E93;">Belum ada transaksi</div>';
    } else {
        container.innerHTML = sorted.map(tx => `
            <div class="transaction-item">
                <div>
                    <div class="transaction-date">${tx.date}</div>
                    ${tx.note ? `<div class="transaction-note">📝 ${sanitizeInput(tx.note)}</div>` : ''}
                </div>
                <div class="transaction-amount ${tx.type === 'tambah' ? 'plus' : 'minus'}">
                    ${tx.type === 'tambah' ? '+' : '-'} ${formatRupiah(tx.amount)}
                </div>
            </div>
        `).join('');
    }

    const reminderToggle = document.getElementById('reminderToggle');
    if (goal.reminderEnabled) reminderToggle.classList.add('active');
    else reminderToggle.classList.remove('active');
}

function showDetail(goalId) {
    const goal = goals.find(g => g.id === goalId);
    if (!goal) { showToast('Target tidak ditemukan', true); showDashboard(); return; }
    currentGoalId = goalId;
    document.getElementById('dashboardPage').classList.add('hidden-page');
    document.getElementById('detailPage').classList.remove('hidden-page');
    refreshDetail();
}

function showDashboard() {
    currentGoalId = null;
    document.getElementById('dashboardPage').classList.remove('hidden-page');
    document.getElementById('detailPage').classList.add('hidden-page');
    refreshDashboard();
}

function showCreateGoalModal() {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    let selectedImageData = '';

    modal.innerHTML = `
        <div class="modal-content">
            <h3>✨ Buat Celengan Baru</h3>
            <label>Nama Target</label>
            <input type="text" id="goalNameInput" placeholder="Contoh: Liburan Bali">
            <label>Target Nominal (Rp)</label>
            <input type="text" id="targetAmountInput" placeholder="Contoh: 20000000">
            <label>Tabungan Per Hari (Rp)</label>
            <input type="text" id="dailyRateInput" placeholder="Contoh: 50000">
            <div class="image-upload-area">
                <label>Gambar Target (maks 2MB)</label>
                <input type="file" id="imageUploadInput" accept="image/jpeg,image/png,image/webp">
                <img id="imagePreviewModal" class="image-preview" style="display: none;">
            </div>
            <div class="modal-buttons">
                <button class="btn-secondary" id="cancelCreateBtn">Batal</button>
                <button class="btn-primary" id="confirmCreateBtn">Buat Celengan</button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);

    const targetInput = modal.querySelector('#targetAmountInput');
    const dailyInput = modal.querySelector('#dailyRateInput');
    const goalNameInput = modal.querySelector('#goalNameInput');
    const fileInput = modal.querySelector('#imageUploadInput');
    const preview = modal.querySelector('#imagePreviewModal');

    function formatInputToRupiah(input) {
        let value = input.value.replace(/[^0-9]/g, '');
        if (value) input.value = parseInt(value).toLocaleString('id-ID');
    }

    targetInput.addEventListener('input', () => formatInputToRupiah(targetInput));
    dailyInput.addEventListener('input', () => formatInputToRupiah(dailyInput));

    fileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            if (file.size > 2 * 1024 * 1024) {
                showToast('Ukuran gambar maksimal 2MB', true);
                fileInput.value = '';
                preview.style.display = 'none';
                selectedImageData = '';
                return;
            }
            if (!file.type.match('image/jpeg') && !file.type.match('image/png') && !file.type.match('image/webp')) {
                showToast('Hanya file JPG, PNG, atau WEBP yang didukung', true);
                fileInput.value = '';
                preview.style.display = 'none';
                selectedImageData = '';
                return;
            }
            const reader = new FileReader();
            reader.onload = (ev) => {
                selectedImageData = ev.target.result;
                preview.src = selectedImageData;
                preview.style.display = 'block';
            };
            reader.onerror = () => {
                showToast('Gagal membaca file gambar', true);
                fileInput.value = '';
            };
            reader.readAsDataURL(file);
        }
    });

    modal.querySelector('#confirmCreateBtn').onclick = () => {
        const name = goalNameInput.value.trim();
        const targetRaw = targetInput.value.replace(/[^0-9]/g, '');
        const dailyRaw = dailyInput.value.replace(/[^0-9]/g, '');
        const target = parseInt(targetRaw);
        const daily = parseInt(dailyRaw);

        if (!name) { showToast('Masukkan nama target', true); return; }
        if (isNaN(target) || target <= 0) { showToast('Target nominal harus > 0', true); return; }
        if (isNaN(daily) || daily <= 0) { showToast('Tabungan harian harus > 0', true); return; }

        const newGoal = {
            id: Date.now().toString(),
            name: name,
            targetAmount: target,
            dailySaving: daily,
            createdAt: formatDateIndonesian(new Date()),
            imageUrl: selectedImageData || 'https://placehold.co/600x400/2C5F8A/FFFFFF?text=Celengan+Baru',
            transactions: [],
            reminderEnabled: false
        };

        try {
            goals.push(newGoal);
            saveToStorage();
            refreshDashboard();
            modal.remove();
            showDetail(newGoal.id);
            showToast('Celengan berhasil dibuat!');
        } catch (err) {
            console.error(err);
            if (err.name === 'QuotaExceededError') {
                newGoal.imageUrl = 'https://placehold.co/600x400/2C5F8A/FFFFFF?text=Celengan+Baru';
                goals.push(newGoal);
                saveToStorage();
                refreshDashboard();
                modal.remove();
                showDetail(newGoal.id);
                showToast('Celengan dibuat (gambar default karena ukuran terlalu besar)');
            } else {
                showToast('Gagal menyimpan celengan', true);
            }
        }
    };

    modal.querySelector('#cancelCreateBtn').onclick = () => modal.remove();
}

function showTransactionModal() {
    const goal = goals.find(g => g.id === currentGoalId);
    if (!goal) { showToast('Target tidak ditemukan', true); return; }

    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
        <div class="modal-content">
            <h3>💰 Transaksi Tabungan</h3>
            <div class="toggle-container">
                <div class="toggle-option active" data-mode="tambah">➕ Tambah</div>
                <div class="toggle-option" data-mode="kurangi">➖ Kurangi</div>
            </div>
            <div class="input-wrapper">
                <span class="input-icon"></span>
                <input type="text" id="amountInput" class="currency-input" placeholder="Masukkan nominal" value="">
            </div>
            <div class="quick-amounts">
                <button class="quick-btn" data-value="50000">Rp 50rb</button>
                <button class="quick-btn" data-value="100000">Rp 100rb</button>
                <button class="quick-btn" data-value="250000">Rp 250rb</button>
                <button class="quick-btn" data-value="500000">Rp 500rb</button>
                <button class="quick-btn" data-value="1000000">Rp 1jt</button>
            </div>
            <textarea id="noteInput" class="note-input" placeholder="Keterangan (opsional)" rows="2"></textarea>
            <div class="modal-buttons">
                <button class="btn-secondary" id="cancelModalBtn">Batal</button>
                <button class="btn-primary" id="saveTransactionBtn">Simpan</button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);

    let currentMode = 'tambah';
    const amountInput = modal.querySelector('#amountInput');
    const toggleOptions = modal.querySelectorAll('.toggle-option');
    const quickBtns = modal.querySelectorAll('.quick-btn');
    const saveBtn = modal.querySelector('#saveTransactionBtn');

    function formatCurrency(input) {
        let value = input.value.replace(/[^0-9]/g, '');
        if (value) input.value = parseInt(value).toLocaleString('id-ID');
    }
    amountInput.addEventListener('input', () => formatCurrency(amountInput));

    toggleOptions.forEach(opt => {
        opt.addEventListener('click', () => {
            toggleOptions.forEach(o => o.classList.remove('active'));
            opt.classList.add('active');
            currentMode = opt.dataset.mode;
            if (currentMode === 'kurangi') {
                saveBtn.classList.remove('btn-primary');
                saveBtn.classList.add('btn-danger');
                saveBtn.innerText = 'Kurangi';
            } else {
                saveBtn.classList.remove('btn-danger');
                saveBtn.classList.add('btn-primary');
                saveBtn.innerText = 'Tambah';
            }
        });
    });

    quickBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const value = parseInt(btn.dataset.value);
            amountInput.value = value.toLocaleString('id-ID');
        });
    });

    modal.querySelector('#cancelModalBtn').onclick = () => modal.remove();

    saveBtn.onclick = () => {
        const rawAmount = amountInput.value.replace(/[^0-9]/g, '');
        let amount = parseInt(rawAmount);
        const note = modal.querySelector('#noteInput').value.trim();

        if (isNaN(amount) || amount <= 0) { showToast('Masukkan nominal yang valid', true); return; }
        const currentTotal = calculateTotalSaved(goal);
        if (currentMode === 'kurangi' && amount > currentTotal) {
            showToast(`Saldo tidak mencukupi! Saldo: ${formatRupiah(currentTotal)}`, true);
            return;
        }

        const now = new Date();
        const formattedDate = formatDateTimeIndonesian(now);
        goal.transactions.push({
            id: Date.now().toString(),
            date: formattedDate,
            amount: amount,
            type: currentMode,
            note: note || (currentMode === 'tambah' ? 'Penambahan tabungan' : 'Pengurangan tabungan'),
            timestamp: now.getTime()
        });

        saveToStorage();
        refreshDetail();
        refreshDashboard();
        modal.remove();
        showToast(currentMode === 'tambah' ? `+ ${formatRupiah(amount)}` : `- ${formatRupiah(amount)}`);
        if (calculateTotalSaved(goal) >= goal.targetAmount) {
            setTimeout(() => showToast(`🎉 Selamat! Target "${goal.name}" tercapai! 🎉`), 500);
        }
    };
}

function showEditGoalModal() {
    const goal = goals.find(g => g.id === currentGoalId);
    if (!goal) return;
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    let selectedImageData = goal.imageUrl;
    modal.innerHTML = `
        <div class="modal-content">
            <h3>✏️ Edit Celengan</h3>
            <label>Nama Target</label>
            <input type="text" id="editGoalName" value="${sanitizeInput(goal.name)}">
            <label>Target Nominal (Rp)</label>
            <input type="text" id="editTargetAmount" value="${formatRupiah(goal.targetAmount).replace('Rp', '')}">
            <label>Tabungan Per Hari (Rp)</label>
            <input type="text" id="editDailyRate" value="${formatRupiah(goal.dailySaving).replace('Rp', '')}">
            <div class="image-upload-area">
                <label>Gambar Target</label>
                <input type="file" id="editImageUpload" accept="image/*">
                <img id="editImagePreview" class="image-preview" src="${goal.imageUrl}">
            </div>
            <div class="modal-buttons">
                <button class="btn-secondary" id="cancelEditBtn">Batal</button>
                <button class="btn-primary" id="saveEditBtn">Simpan</button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);

    const targetInput = modal.querySelector('#editTargetAmount');
    const dailyInput = modal.querySelector('#editDailyRate');
    function formatEditInput(input) {
        let value = input.value.replace(/[^0-9]/g, '');
        if (value) input.value = parseInt(value).toLocaleString('id-ID');
    }
    targetInput.addEventListener('input', () => formatEditInput(targetInput));
    dailyInput.addEventListener('input', () => formatEditInput(dailyInput));

    const fileInput = modal.querySelector('#editImageUpload');
    const preview = modal.querySelector('#editImagePreview');
    fileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            if (file.size > 2 * 1024 * 1024) {
                showToast('Ukuran gambar maksimal 2MB', true);
                return;
            }
            const reader = new FileReader();
            reader.onload = (ev) => {
                selectedImageData = ev.target.result;
                preview.src = selectedImageData;
            };
            reader.readAsDataURL(file);
        }
    });

    modal.querySelector('#saveEditBtn').onclick = () => {
        const newName = modal.querySelector('#editGoalName').value.trim();
        const targetRaw = targetInput.value.replace(/[^0-9]/g, '');
        const dailyRaw = dailyInput.value.replace(/[^0-9]/g, '');
        const newTarget = parseInt(targetRaw);
        const newDaily = parseInt(dailyRaw);

        if (!newName) { showToast('Nama tidak boleh kosong', true); return; }
        if (isNaN(newTarget) || newTarget <= 0) { showToast('Target harus > 0', true); return; }
        if (isNaN(newDaily) || newDaily <= 0) { showToast('Tabungan harian harus > 0', true); return; }

        goal.name = newName;
        goal.targetAmount = newTarget;
        goal.dailySaving = newDaily;
        goal.imageUrl = selectedImageData;
        saveToStorage();
        refreshDetail();
        refreshDashboard();
        modal.remove();
        showToast('Celengan berhasil diperbarui!');
    };
    modal.querySelector('#cancelEditBtn').onclick = () => modal.remove();
}

function deleteGoal() {
    const goal = goals.find(g => g.id === currentGoalId);
    if (!goal) return;
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
        <div class="modal-content">
            <h3>⚠️ Hapus Celengan</h3>
            <p style="margin-bottom: 20px; text-align: center;">Apakah Anda yakin ingin menghapus "${sanitizeInput(goal.name)}"?<br>Semua data transaksi akan hilang permanen.</p>
            <div class="modal-buttons">
                <button class="btn-secondary" id="cancelDeleteBtn">Batal</button>
                <button class="btn-danger" id="confirmDeleteBtn">Hapus</button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
    modal.querySelector('#cancelDeleteBtn').onclick = () => modal.remove();
    modal.querySelector('#confirmDeleteBtn').onclick = () => {
        const index = goals.findIndex(g => g.id === currentGoalId);
        if (index !== -1) {
            goals.splice(index, 1);
            saveToStorage();
            showDashboard();
            modal.remove();
            showToast('Celengan berhasil dihapus');
        }
    };
}

function initTabs() {
    const tabs = document.querySelectorAll('.tab');
    const activeList = document.getElementById('activeGoalsList');
    const completedList = document.getElementById('completedGoalsList');
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            if (tab.innerText === 'Berlangsung') {
                activeList.style.display = 'block';
                completedList.style.display = 'none';
            } else {
                activeList.style.display = 'none';
                completedList.style.display = 'block';
            }
            refreshDashboard();
        });
    });
}

document.addEventListener('DOMContentLoaded', () => {
    loadFromStorage();
    initTabs();
    refreshDashboard();

    const createBtn = document.getElementById('createNewGoalBtn');
    if (createBtn) {
        createBtn.removeEventListener('click', showCreateGoalModal);
        createBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            showCreateGoalModal();
        });
    }

    document.getElementById('backToDashboardBtn').addEventListener('click', showDashboard);
    document.getElementById('editDetailBtn').addEventListener('click', showEditGoalModal);
    document.getElementById('deleteGoalBtn').addEventListener('click', deleteGoal);
    document.getElementById('fabAddTransaction').addEventListener('click', showTransactionModal);

    const reminderToggle = document.getElementById('reminderToggle');
    reminderToggle.addEventListener('click', () => {
        reminderToggle.classList.toggle('active');
        if (currentGoalId) {
            const goal = goals.find(g => g.id === currentGoalId);
            if (goal) {
                goal.reminderEnabled = reminderToggle.classList.contains('active');
                saveToStorage();
                showToast(goal.reminderEnabled ? 'Pengingat diaktifkan' : 'Pengingat dinonaktifkan');
            }
        }
    });
});
