// Инициализация Supabase
const SUPABASE_URL = 'https://dkyqegxdcerlqnfvodjd.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRreXFlZ3hkY2VybHFuZnZvZGpkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAwNTc2NzQsImV4cCI6MjA4NTYzMzY3NH0.n6KO-IQMZboeOMCnJQw6gAs8DdWFDZpevAOWBQrxFWA';

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// DOM элементы
const tabs = document.querySelectorAll('.tab');
const tabContents = document.querySelectorAll('.tab-content');
const loginForm = document.getElementById('loginForm');
const registerForm = document.getElementById('registerForm');
const totalUsers = document.getElementById('totalUsers');
const onlineUsers = document.getElementById('onlineUsers');

// Текущий пользователь
let currentUser = null;

// Инициализация при загрузке
document.addEventListener('DOMContentLoaded', async () => {
    await loadStats();
    setupEventListeners();
    checkExistingSession();
});

// Проверка существующей сессии
function checkExistingSession() {
    const user = localStorage.getItem('currentUser');
    if (user) {
        try {
            currentUser = JSON.parse(user);
            // Проверяем, действительна ли сессия
            if (currentUser && currentUser.expires > Date.now()) {
                window.location.href = 'dashboard.html';
            } else {
                localStorage.removeItem('currentUser');
            }
        } catch (e) {
            localStorage.removeItem('currentUser');
        }
    }
}

// Настройка обработчиков событий
function setupEventListeners() {
    // Переключение табов
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const tabId = tab.getAttribute('data-tab');
            
            // Убираем активный класс у всех табов
            tabs.forEach(t => t.classList.remove('active'));
            tabContents.forEach(tc => tc.classList.remove('active'));
            
            // Добавляем активный класс текущему табу
            tab.classList.add('active');
            document.getElementById(tabId).classList.add('active');
        });
    });

    // Переключение видимости пароля
    document.querySelectorAll('.password-toggle').forEach(toggle => {
        toggle.addEventListener('click', () => {
            const targetId = toggle.getAttribute('data-target');
            const passwordInput = document.getElementById(targetId);
            const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
            
            passwordInput.setAttribute('type', type);
            toggle.innerHTML = type === 'password' 
                ? '<i class="far fa-eye"></i>' 
                : '<i class="far fa-eye-slash"></i>';
        });
    });

    // Вход в систему
    loginForm.addEventListener('submit', handleLogin);

    // Регистрация
    registerForm.addEventListener('submit', handleRegistration);
}

// Загрузка статистики
async function loadStats() {
    try {
        // Общее количество пользователей
        const { count: total } = await supabase
            .from('users')
            .select('*', { count: 'exact', head: true });
        
        totalUsers.textContent = total || 0;

        // Количество "онлайн" пользователей (заходили за последние 30 минут)
        const thirtyMinutesAgo = new Date(Date.now() - 30 * 60000).toISOString();
        const { count: online } = await supabase
            .from('users')
            .select('*', { count: 'exact' })
            .gte('last_login', thirtyMinutesAgo);
        
        onlineUsers.textContent = online || 0;

    } catch (error) {
        console.error('Ошибка загрузки статистики:', error);
    }
}

// Обработка входа
async function handleLogin(e) {
    e.preventDefault();
    
    const username = document.getElementById('loginUsername').value.trim();
    const password = document.getElementById('loginPassword').value.trim();
    const messageDiv = document.getElementById('loginMessage');
    const loginBtn = document.getElementById('loginBtn');

    // Валидация
    if (!username || !password) {
        showMessage('Введите логин/email и пароль', 'error', messageDiv);
        return;
    }

    try {
        // Блокируем кнопку
        loginBtn.disabled = true;
        loginBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Вход...';

        // Ищем пользователя по логину или email
        const { data: users, error: findError } = await supabase
            .from('users')
            .select('*')
            .or(`username.eq.${username},email.eq.${username}`);

        if (findError) throw findError;

        if (!users || users.length === 0) {
            throw new Error('Пользователь не найден');
        }

        const user = users[0];

        // Проверяем пароль (в реальном приложении используйте хэширование!)
        if (user.password !== password) {
            throw new Error('Неверный пароль');
        }

        // Обновляем время последнего входа
        const { error: updateError } = await supabase
            .from('users')
            .update({ last_login: new Date().toISOString() })
            .eq('id', user.id);

        if (updateError) throw updateError;

        // Сохраняем пользователя в localStorage
        currentUser = {
            ...user,
            expires: Date.now() + (24 * 60 * 60 * 1000) // 24 часа
        };
        localStorage.setItem('currentUser', JSON.stringify(currentUser));

        // Показываем успешное сообщение и перенаправляем
        showMessage(`Добро пожаловать, ${user.username}!`, 'success', messageDiv);
        
        setTimeout(() => {
            window.location.href = 'dashboard.html';
        }, 1000);

    } catch (error) {
        console.error('Ошибка входа:', error);
        showMessage(error.message || 'Ошибка при входе. Проверьте данные.', 'error', messageDiv);
    } finally {
        // Разблокируем кнопку
        loginBtn.disabled = false;
        loginBtn.innerHTML = '<i class="fas fa-sign-in-alt"></i> Войти в систему';
    }
}

// Обработка регистрации
async function handleRegistration(e) {
    e.preventDefault();
    
    const username = document.getElementById('registerUsername').value.trim();
    const email = document.getElementById('registerEmail').value.trim();
    const password = document.getElementById('registerPassword').value.trim();
    const role = document.getElementById('userRole').value;
    const messageDiv = document.getElementById('registerMessage');
    const registerBtn = document.getElementById('registerBtn');

    // Валидация
    if (!username || !email || !password) {
        showMessage('Все поля обязательны для заполнения', 'error', messageDiv);
        return;
    }

    if (password.length < 6) {
        showMessage('Пароль должен содержать минимум 6 символов', 'error', messageDiv);
        return;
    }

    if (!validateEmail(email)) {
        showMessage('Введите корректный email адрес', 'error', messageDiv);
        return;
    }

    try {
        // Блокируем кнопку
        registerBtn.disabled = true;
        registerBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Регистрация...';

        // Проверяем, существует ли пользователь
        const { data: existingUsers, error: checkError } = await supabase
            .from('users')
            .select('*')
            .or(`username.eq.${username},email.eq.${email}`);

        if (checkError) throw checkError;

        if (existingUsers && existingUsers.length > 0) {
            const existingUser = existingUsers[0];
            if (existingUser.username === username) {
                throw new Error('Пользователь с таким логином уже существует');
            }
            if (existingUser.email === email) {
                throw new Error('Пользователь с таким email уже существует');
            }
        }

        // Сохраняем пользователя в Supabase
        const { data, error } = await supabase
            .from('users')
            .insert([
                {
                    username: username,
                    email: email,
                    password: password, // В реальном приложении пароль нужно хэшировать!
                    role: role,
                    created_at: new Date().toISOString(),
                    last_login: new Date().toISOString()
                }
            ])
            .select();

        if (error) throw error;

        // Автоматически входим после регистрации
        currentUser = {
            ...data[0],
            expires: Date.now() + (24 * 60 * 60 * 1000)
        };
        localStorage.setItem('currentUser', JSON.stringify(currentUser));

        // Показываем успешное сообщение и перенаправляем
        showMessage(`Регистрация успешна! Добро пожаловать, ${username}!`, 'success', messageDiv);
        
        setTimeout(() => {
            window.location.href = 'dashboard.html';
        }, 1000);

    } catch (error) {
        console.error('Ошибка регистрации:', error);
        showMessage(error.message || 'Ошибка при регистрации. Попробуйте еще раз.', 'error', messageDiv);
    } finally {
        // Разблокируем кнопку
        registerBtn.disabled = false;
        registerBtn.innerHTML = '<i class="fas fa-user-plus"></i> Зарегистрироваться';
    }
}

// Показать сообщение
function showMessage(text, type, element) {
    element.innerHTML = text;
    element.className = `message ${type}`;
    element.style.display = 'block';
    
    // Автоматически скрывать успешные сообщения через 5 секунд
    if (type === 'success') {
        setTimeout(() => {
            element.style.display = 'none';
        }, 5000);
    }
}

// Валидация email
function validateEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
}
