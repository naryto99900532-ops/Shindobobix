// Инициализация Supabase
const SUPABASE_URL = 'https://dkyqegxdcerlqnfvodjd.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRreXFlZ3hkY2VybHFuZnZvZGpkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAwNTc2NzQsImV4cCI6MjA4NTYzMzY3NH0.n6KO-IQMZboeOMCnJQw6gAs8DdWFDZpevAOWBQrxFWA';

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Текущий пользователь
let currentUser = null;
let allUsers = [];

// Инициализация при загрузке
document.addEventListener('DOMContentLoaded', async () => {
    // Проверяем авторизацию
    const userData = localStorage.getItem('currentUser');
    if (!userData) {
        window.location.href = 'index.html';
        return;
    }

    try {
        currentUser = JSON.parse(userData);
        
        // Проверяем срок действия сессии
        if (currentUser.expires < Date.now()) {
            localStorage.removeItem('currentUser');
            window.location.href = 'index.html';
            return;
        }

        await initializeDashboard();
        setupEventListeners();
        updateDashboard();
        loadUsers();
    } catch (error) {
        console.error('Ошибка инициализации:', error);
        window.location.href = 'index.html';
    }
});

// Инициализация панели
async function initializeDashboard() {
    // Обновляем информацию о пользователе
    document.getElementById('userName').textContent = currentUser.username;
    document.getElementById('userAvatar').textContent = currentUser.username.charAt(0).toUpperCase();
    document.getElementById('welcomeName').textContent = currentUser.username;
    
    // Обновляем роль
    const roleBadge = document.getElementById('userRoleBadge');
    roleBadge.textContent = getRoleName(currentUser.role);
    roleBadge.className = `user-role role-${currentUser.role}`;
    
    // Показываем/скрываем элементы в зависимости от роли
    updateNavigation();
}

// Обновление навигации в зависимости от роли
function updateNavigation() {
    const adminItems = document.querySelectorAll('.admin-only');
    const ownerItems = document.querySelectorAll('.owner-only');
    
    if (currentUser.role === 'admin' || currentUser.role === 'owner') {
        adminItems.forEach(item => item.style.display = 'flex');
    } else {
        adminItems.forEach(item => item.style.display = 'none');
    }
    
    if (currentUser.role === 'owner') {
        ownerItems.forEach(item => item.style.display = 'flex');
    } else {
        ownerItems.forEach(item => item.style.display = 'none');
    }
}

// Настройка обработчиков событий
function setupEventListeners() {
    // Навигация по разделам
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', () => {
            const section = item.getAttribute('data-section');
            
            // Обновляем активный пункт меню
            document.querySelectorAll('.nav-item').forEach(nav => nav.classList.remove('active'));
            item.classList.add('active');
            
            // Показываем выбранный раздел
            showSection(section);
        });
    });

    // Выход из системы
    document.getElementById('logoutBtn').addEventListener('click', () => {
        localStorage.removeItem('currentUser');
        window.location.href = 'index.html';
    });

    // Обновление списка игроков
    document.getElementById('refreshPlayers')?.addEventListener('click', loadUsers);

    // Обновление времени
    updateTime();
    setInterval(updateTime, 1000);
}

// Показать раздел
function showSection(sectionId) {
    // Скрываем все разделы
    document.querySelectorAll('.content-section').forEach(section => {
        section.classList.remove('active');
    });
    
    // Показываем выбранный раздел
    const section = document.getElementById(sectionId);
    if (section) {
        section.classList.add('active');
        document.getElementById('pageTitle').textContent = section.querySelector('h2')?.textContent || 'Панель управления';
        
        // Проверяем доступ к административным разделам
        if (sectionId === 'admin' && currentUser.role !== 'admin' && currentUser.role !== 'owner') {
            document.getElementById('adminAccessDenied').style.display = 'block';
            document.getElementById('adminContent').style.display = 'none';
        } else if (sectionId === 'admin') {
            document.getElementById('adminAccessDenied').style.display = 'none';
            document.getElementById('adminContent').style.display = 'block';
            loadAdminStats();
        }
        
        if (sectionId === 'owner' && currentUser.role !== 'owner') {
            document.getElementById('ownerAccessDenied').style.display = 'block';
            document.getElementById('ownerContent').style.display = 'none';
        } else if (sectionId === 'owner') {
            document.getElementById('ownerAccessDenied').style.display = 'none';
            document.getElementById('ownerContent').style.display = 'block';
            loadOwnerData();
        }
    }
}

// Загрузка пользователей
async function loadUsers() {
    try {
        const { data: users, error } = await supabase
            .from('users')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;
        
        allUsers = users || [];
        updateUsersTable();
        updateDashboardStats();
    } catch (error) {
        console.error('Ошибка загрузки пользователей:', error);
        showNotification('Ошибка загрузки пользователей', 'error');
    }
}

// Обновление таблицы пользователей
function updateUsersTable() {
    const tbody = document.getElementById('playersList');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    allUsers.forEach(user => {
        const row = document.createElement('tr');
        
        // Определяем цвет в зависимости от роли
        let roleColor = '#27ae60'; // player
        if (user.role === 'admin') roleColor = '#e44d26';
        if (user.role === 'owner') roleColor = '#f39c12';
        
        row.innerHTML = `
            <td>${user.id}</td>
            <td><strong>${user.username}</strong></td>
            <td>${user.email}</td>
            <td><span class="badge" style="background: ${roleColor};">${getRoleName(user.role)}</span></td>
            <td>${new Date(user.created_at).toLocaleDateString()}</td>
            <td>
                ${currentUser.role === 'admin' || currentUser.role === 'owner' ? `
                    <button class="btn btn-primary" onclick="editUser(${user.id})">
                        <i class="fas fa-edit"></i>
                    </button>
                ` : ''}
                ${currentUser.role === 'owner' && user.id !== currentUser.id ? `
                    <button class="btn btn-danger" onclick="deleteUser(${user.id})">
                        <i class="fas fa-trash"></i>
                    </button>
                ` : ''}
            </td>
        `;
        
        tbody.appendChild(row);
    });
}

// Обновление статистики на дашборде
function updateDashboardStats() {
    if (!allUsers.length) return;
    
    const totalPlayers = allUsers.length;
    const onlinePlayers = allUsers.filter(u => {
        if (!u.last_login) return false;
        const lastLogin = new Date(u.last_login);
        const thirtyMinutesAgo = new Date(Date.now() - 30 * 60000);
        return lastLogin > thirtyMinutesAgo;
    }).length;
    
    const totalAdmins = allUsers.filter(u => u.role === 'admin' || u.role === 'owner').length;
    
    document.getElementById('totalPlayers').textContent = totalPlayers;
    document.getElementById('onlineNow').textContent = onlinePlayers;
    document.getElementById('totalAdmins').textContent = totalAdmins;
}

// Обновление времени
function updateTime() {
    const now = new Date();
    const timeString = now.toLocaleTimeString('ru-RU');
    const timeElement = document.getElementById('currentTime');
    if (timeElement) {
        timeElement.textContent = timeString;
    }
}

// Получить название роли
function getRoleName(role) {
    switch(role) {
        case 'player': return 'Игрок';
        case 'admin': return 'Администратор';
        case 'owner': return 'Владелец';
        default: return 'Игрок';
    }
}

// Функции администратора
async function loadAdminStats() {
    try {
        const stats = {
            totalUsers: allUsers.length,
            activeToday: allUsers.filter(u => {
                if (!u.last_login) return false;
                return new Date(u.last_login).toDateString() === new Date().toDateString();
            }).length,
            newThisWeek: allUsers.filter(u => {
                const created = new Date(u.created_at);
                const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
                return created > weekAgo;
            }).length
        };
        
        const statsHtml = `
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px;">
                <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; text-align: center;">
                    <h4 style="margin: 0 0 10px 0; color: #333;">Всего пользователей</h4>
                    <div style="font-size: 36px; font-weight: bold; color: #0f3460;">${stats.totalUsers}</div>
                </div>
                <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; text-align: center;">
                    <h4 style="margin: 0 0 10px 0; color: #333;">Активных сегодня</h4>
                    <div style="font-size: 36px; font-weight: bold; color: #27ae60;">${stats.activeToday}</div>
                </div>
                <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; text-align: center;">
                    <h4 style="margin: 0 0 10px 0; color: #333;">Новых за неделю</h4>
                    <div style="font-size: 36px; font-weight: bold; color: #f39c12;">${stats.newThisWeek}</div>
                </div>
            </div>
        `;
        
        document.getElementById('adminStats').innerHTML = statsHtml;
    } catch (error) {
        console.error('Ошибка загрузки статистики:', error);
    }
}

// Функции владельца
async function loadOwnerData() {
    // Загрузка данных для владельца
    updateRolesTable();
}

// Обновление таблицы ролей
function updateRolesTable() {
    const tbody = document.getElementById('rolesList');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    allUsers.forEach(user => {
        if (user.id === currentUser.id) return; // Пропускаем текущего пользователя
        
        const row = document.createElement('tr');
        
        row.innerHTML = `
            <td>${user.username} (${user.email})</td>
            <td><span class="badge" style="background: ${getRoleColor(user.role)};">${getRoleName(user.role)}</span></td>
            <td>
                <select id="roleSelect_${user.id}" style="width: 100%; padding: 8px;">
                    <option value="player" ${user.role === 'player' ? 'selected' : ''}>Игрок</option>
                    <option value="admin" ${user.role === 'admin' ? 'selected' : ''}>Администратор</option>
                    <option value="owner" ${user.role === 'owner' ? 'selected' : ''}>Владелец</option>
                </select>
            </td>
            <td>
                <button class="btn btn-success" onclick="updateUserRole(${user.id})">
                    <i class="fas fa-save"></i> Сохранить
                </button>
            </td>
        `;
        
        tbody.appendChild(row);
    });
}

// Получить цвет роли
function getRoleColor(role) {
    switch(role) {
        case 'player': return '#27ae60';
        case 'admin': return '#e44d26';
        case 'owner': return '#f39c12';
        default: return '#666';
    }
}

// Функции для действий
async function editUser(userId) {
    const user = allUsers.find(u => u.id === userId);
    if (!user) return;
    
    const newUsername = prompt('Введите новый логин:', user.username);
    if (newUsername && newUsername !== user.username) {
        try {
            const { error } = await supabase
                .from('users')
                .update({ username: newUsername })
                .eq('id', userId);
            
            if (error) throw error;
            
            showNotification('Логин успешно изменен', 'success');
            await loadUsers();
        } catch (error) {
            console.error('Ошибка изменения логина:', error);
            showNotification('Ошибка изменения логина', 'error');
        }
    }
}

async function deleteUser(userId) {
    if (!confirm('Вы уверены, что хотите удалить этого пользователя?')) return;
    
    try {
        const { error } = await supabase
            .from('users')
            .delete()
            .eq('id', userId);
        
        if (error) throw error;
        
        showNotification('Пользователь успешно удален', 'success');
        await loadUsers();
    } catch (error) {
        console.error('Ошибка удаления пользователя:', error);
        showNotification('Ошибка удаления пользователя', 'error');
    }
}

async function updateUserRole(userId) {
    const select = document.getElementById(`roleSelect_${userId}`);
    const newRole = select.value;
    
    try {
        const { error } = await supabase
            .from('users')
            .update({ role: newRole })
            .eq('id', userId);
        
        if (error) throw error;
        
        showNotification('Роль пользователя успешно изменена', 'success');
        await loadUsers();
        updateRolesTable();
    } catch (error) {
        console.error('Ошибка изменения роли:', error);
        showNotification('Ошибка изменения роли', 'error');
    }
}

// Показать уведомление
function showNotification(message, type = 'info') {
    // Создаем временное уведомление
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 15px 20px;
        background: ${type === 'success' ? '#27ae60' : type === 'error' ? '#e74c3c' : '#3498db'};
        color: white;
        border-radius: 8px;
        box-shadow: 0 5px 15px rgba(0,0,0,0.2);
        z-index: 9999;
        animation: slideIn 0.3s ease;
    `;
    
    notification.innerHTML = `
        <i class="fas ${type === 'success' ? 'fa-check-circle' : type === 'error' ? 'fa-exclamation-circle' : 'fa-info-circle'}"></i>
        ${message}
    `;
    
    document.body.appendChild(notification);
    
    // Удаляем через 5 секунд
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 300);
    }, 5000);
}

// Добавляем стили для анимации уведомлений
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    @keyframes slideOut {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(100%); opacity: 0; }
    }
`;
document.head.appendChild(style);// Инициализация Supabase
const SUPABASE_URL = 'https://ВАШ_PROJECT_ID.supabase.co';
const SUPABASE_ANON_KEY = 'ВАШ_ANON_KEY';

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Текущий пользователь
let currentUser = null;
let allUsers = [];

// Инициализация при загрузке
document.addEventListener('DOMContentLoaded', async () => {
    // Проверяем авторизацию
    const userData = localStorage.getItem('currentUser');
    if (!userData) {
        window.location.href = 'index.html';
        return;
    }

    try {
        currentUser = JSON.parse(userData);
        
        // Проверяем срок действия сессии
        if (currentUser.expires < Date.now()) {
            localStorage.removeItem('currentUser');
            window.location.href = 'index.html';
            return;
        }

        await initializeDashboard();
        setupEventListeners();
        updateDashboard();
        loadUsers();
    } catch (error) {
        console.error('Ошибка инициализации:', error);
        window.location.href = 'index.html';
    }
});

// Инициализация панели
async function initializeDashboard() {
    // Обновляем информацию о пользователе
    document.getElementById('userName').textContent = currentUser.username;
    document.getElementById('userAvatar').textContent = currentUser.username.charAt(0).toUpperCase();
    document.getElementById('welcomeName').textContent = currentUser.username;
    
    // Обновляем роль
    const roleBadge = document.getElementById('userRoleBadge');
    roleBadge.textContent = getRoleName(currentUser.role);
    roleBadge.className = `user-role role-${currentUser.role}`;
    
    // Показываем/скрываем элементы в зависимости от роли
    updateNavigation();
}

// Обновление навигации в зависимости от роли
function updateNavigation() {
    const adminItems = document.querySelectorAll('.admin-only');
    const ownerItems = document.querySelectorAll('.owner-only');
    
    if (currentUser.role === 'admin' || currentUser.role === 'owner') {
        adminItems.forEach(item => item.style.display = 'flex');
    } else {
        adminItems.forEach(item => item.style.display = 'none');
    }
    
    if (currentUser.role === 'owner') {
        ownerItems.forEach(item => item.style.display = 'flex');
    } else {
        ownerItems.forEach(item => item.style.display = 'none');
    }
}

// Настройка обработчиков событий
function setupEventListeners() {
    // Навигация по разделам
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', () => {
            const section = item.getAttribute('data-section');
            
            // Обновляем активный пункт меню
            document.querySelectorAll('.nav-item').forEach(nav => nav.classList.remove('active'));
            item.classList.add('active');
            
            // Показываем выбранный раздел
            showSection(section);
        });
    });

    // Выход из системы
    document.getElementById('logoutBtn').addEventListener('click', () => {
        localStorage.removeItem('currentUser');
        window.location.href = 'index.html';
    });

    // Обновление списка игроков
    document.getElementById('refreshPlayers')?.addEventListener('click', loadUsers);

    // Обновление времени
    updateTime();
    setInterval(updateTime, 1000);
}

// Показать раздел
function showSection(sectionId) {
    // Скрываем все разделы
    document.querySelectorAll('.content-section').forEach(section => {
        section.classList.remove('active');
    });
    
    // Показываем выбранный раздел
    const section = document.getElementById(sectionId);
    if (section) {
        section.classList.add('active');
        document.getElementById('pageTitle').textContent = section.querySelector('h2')?.textContent || 'Панель управления';
        
        // Проверяем доступ к административным разделам
        if (sectionId === 'admin' && currentUser.role !== 'admin' && currentUser.role !== 'owner') {
            document.getElementById('adminAccessDenied').style.display = 'block';
            document.getElementById('adminContent').style.display = 'none';
        } else if (sectionId === 'admin') {
            document.getElementById('adminAccessDenied').style.display = 'none';
            document.getElementById('adminContent').style.display = 'block';
            loadAdminStats();
        }
        
        if (sectionId === 'owner' && currentUser.role !== 'owner') {
            document.getElementById('ownerAccessDenied').style.display = 'block';
            document.getElementById('ownerContent').style.display = 'none';
        } else if (sectionId === 'owner') {
            document.getElementById('ownerAccessDenied').style.display = 'none';
            document.getElementById('ownerContent').style.display = 'block';
            loadOwnerData();
        }
    }
}

// Загрузка пользователей
async function loadUsers() {
    try {
        const { data: users, error } = await supabase
            .from('users')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;
        
        allUsers = users || [];
        updateUsersTable();
        updateDashboardStats();
    } catch (error) {
        console.error('Ошибка загрузки пользователей:', error);
        showNotification('Ошибка загрузки пользователей', 'error');
    }
}

// Обновление таблицы пользователей
function updateUsersTable() {
    const tbody = document.getElementById('playersList');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    allUsers.forEach(user => {
        const row = document.createElement('tr');
        
        // Определяем цвет в зависимости от роли
        let roleColor = '#27ae60'; // player
        if (user.role === 'admin') roleColor = '#e44d26';
        if (user.role === 'owner') roleColor = '#f39c12';
        
        row.innerHTML = `
            <td>${user.id}</td>
            <td><strong>${user.username}</strong></td>
            <td>${user.email}</td>
            <td><span class="badge" style="background: ${roleColor};">${getRoleName(user.role)}</span></td>
            <td>${new Date(user.created_at).toLocaleDateString()}</td>
            <td>
                ${currentUser.role === 'admin' || currentUser.role === 'owner' ? `
                    <button class="btn btn-primary" onclick="editUser(${user.id})">
                        <i class="fas fa-edit"></i>
                    </button>
                ` : ''}
                ${currentUser.role === 'owner' && user.id !== currentUser.id ? `
                    <button class="btn btn-danger" onclick="deleteUser(${user.id})">
                        <i class="fas fa-trash"></i>
                    </button>
                ` : ''}
            </td>
        `;
        
        tbody.appendChild(row);
    });
}

// Обновление статистики на дашборде
function updateDashboardStats() {
    if (!allUsers.length) return;
    
    const totalPlayers = allUsers.length;
    const onlinePlayers = allUsers.filter(u => {
        if (!u.last_login) return false;
        const lastLogin = new Date(u.last_login);
        const thirtyMinutesAgo = new Date(Date.now() - 30 * 60000);
        return lastLogin > thirtyMinutesAgo;
    }).length;
    
    const totalAdmins = allUsers.filter(u => u.role === 'admin' || u.role === 'owner').length;
    
    document.getElementById('totalPlayers').textContent = totalPlayers;
    document.getElementById('onlineNow').textContent = onlinePlayers;
    document.getElementById('totalAdmins').textContent = totalAdmins;
}

// Обновление времени
function updateTime() {
    const now = new Date();
    const timeString = now.toLocaleTimeString('ru-RU');
    const timeElement = document.getElementById('currentTime');
    if (timeElement) {
        timeElement.textContent = timeString;
    }
}

// Получить название роли
function getRoleName(role) {
    switch(role) {
        case 'player': return 'Игрок';
        case 'admin': return 'Администратор';
        case 'owner': return 'Владелец';
        default: return 'Игрок';
    }
}

// Функции администратора
async function loadAdminStats() {
    try {
        const stats = {
            totalUsers: allUsers.length,
            activeToday: allUsers.filter(u => {
                if (!u.last_login) return false;
                return new Date(u.last_login).toDateString() === new Date().toDateString();
            }).length,
            newThisWeek: allUsers.filter(u => {
                const created = new Date(u.created_at);
                const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
                return created > weekAgo;
            }).length
        };
        
        const statsHtml = `
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px;">
                <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; text-align: center;">
                    <h4 style="margin: 0 0 10px 0; color: #333;">Всего пользователей</h4>
                    <div style="font-size: 36px; font-weight: bold; color: #0f3460;">${stats.totalUsers}</div>
                </div>
                <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; text-align: center;">
                    <h4 style="margin: 0 0 10px 0; color: #333;">Активных сегодня</h4>
                    <div style="font-size: 36px; font-weight: bold; color: #27ae60;">${stats.activeToday}</div>
                </div>
                <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; text-align: center;">
                    <h4 style="margin: 0 0 10px 0; color: #333;">Новых за неделю</h4>
                    <div style="font-size: 36px; font-weight: bold; color: #f39c12;">${stats.newThisWeek}</div>
                </div>
            </div>
        `;
        
        document.getElementById('adminStats').innerHTML = statsHtml;
    } catch (error) {
        console.error('Ошибка загрузки статистики:', error);
    }
}

// Функции владельца
async function loadOwnerData() {
    // Загрузка данных для владельца
    updateRolesTable();
}

// Обновление таблицы ролей
function updateRolesTable() {
    const tbody = document.getElementById('rolesList');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    allUsers.forEach(user => {
        if (user.id === currentUser.id) return; // Пропускаем текущего пользователя
        
        const row = document.createElement('tr');
        
        row.innerHTML = `
            <td>${user.username} (${user.email})</td>
            <td><span class="badge" style="background: ${getRoleColor(user.role)};">${getRoleName(user.role)}</span></td>
            <td>
                <select id="roleSelect_${user.id}" style="width: 100%; padding: 8px;">
                    <option value="player" ${user.role === 'player' ? 'selected' : ''}>Игрок</option>
                    <option value="admin" ${user.role === 'admin' ? 'selected' : ''}>Администратор</option>
                    <option value="owner" ${user.role === 'owner' ? 'selected' : ''}>Владелец</option>
                </select>
            </td>
            <td>
                <button class="btn btn-success" onclick="updateUserRole(${user.id})">
                    <i class="fas fa-save"></i> Сохранить
                </button>
            </td>
        `;
        
        tbody.appendChild(row);
    });
}

// Получить цвет роли
function getRoleColor(role) {
    switch(role) {
        case 'player': return '#27ae60';
        case 'admin': return '#e44d26';
        case 'owner': return '#f39c12';
        default: return '#666';
    }
}

// Функции для действий
async function editUser(userId) {
    const user = allUsers.find(u => u.id === userId);
    if (!user) return;
    
    const newUsername = prompt('Введите новый логин:', user.username);
    if (newUsername && newUsername !== user.username) {
        try {
            const { error } = await supabase
                .from('users')
                .update({ username: newUsername })
                .eq('id', userId);
            
            if (error) throw error;
            
            showNotification('Логин успешно изменен', 'success');
            await loadUsers();
        } catch (error) {
            console.error('Ошибка изменения логина:', error);
            showNotification('Ошибка изменения логина', 'error');
        }
    }
}

async function deleteUser(userId) {
    if (!confirm('Вы уверены, что хотите удалить этого пользователя?')) return;
    
    try {
        const { error } = await supabase
            .from('users')
            .delete()
            .eq('id', userId);
        
        if (error) throw error;
        
        showNotification('Пользователь успешно удален', 'success');
        await loadUsers();
    } catch (error) {
        console.error('Ошибка удаления пользователя:', error);
        showNotification('Ошибка удаления пользователя', 'error');
    }
}

async function updateUserRole(userId) {
    const select = document.getElementById(`roleSelect_${userId}`);
    const newRole = select.value;
    
    try {
        const { error } = await supabase
            .from('users')
            .update({ role: newRole })
            .eq('id', userId);
        
        if (error) throw error;
        
        showNotification('Роль пользователя успешно изменена', 'success');
        await loadUsers();
        updateRolesTable();
    } catch (error) {
        console.error('Ошибка изменения роли:', error);
        showNotification('Ошибка изменения роли', 'error');
    }
}

// Показать уведомление
function showNotification(message, type = 'info') {
    // Создаем временное уведомление
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 15px 20px;
        background: ${type === 'success' ? '#27ae60' : type === 'error' ? '#e74c3c' : '#3498db'};
        color: white;
        border-radius: 8px;
        box-shadow: 0 5px 15px rgba(0,0,0,0.2);
        z-index: 9999;
        animation: slideIn 0.3s ease;
    `;
    
    notification.innerHTML = `
        <i class="fas ${type === 'success' ? 'fa-check-circle' : type === 'error' ? 'fa-exclamation-circle' : 'fa-info-circle'}"></i>
        ${message}
    `;
    
    document.body.appendChild(notification);
    
    // Удаляем через 5 секунд
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 300);
    }, 5000);
}

// Добавляем стили для анимации уведомлений
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    @keyframes slideOut {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(100%); opacity: 0; }
    }
`;
document.head.appendChild(style);
