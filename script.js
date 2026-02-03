// Инициализация Supabase
const SUPABASE_URL = 'https://dkyqegxdcerlqnfvodjd.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRreXFlZ3hkY2VybHFuZnZvZGpkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAwNTc2NzQsImV4cCI6MjA4NTYzMzY3NH0.n6KO-IQMZboeOMCnJQw6gAs8DdWFDZpevAOWBQrxFWA';

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// DOM элементы
const registrationForm = document.getElementById('registrationForm');
const usernameInput = document.getElementById('username');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const passwordToggle = document.getElementById('passwordToggle');
const submitBtn = document.getElementById('submitBtn');
const messageDiv = document.getElementById('message');
const usersCount = document.getElementById('usersCount');
const viewUsersLink = document.getElementById('viewUsers');

// Переменная для хранения всех пользователей
let allUsers = [];

// Инициализация при загрузке
document.addEventListener('DOMContentLoaded', async () => {
    await loadUsersCount();
    setupEventListeners();
});

// Настройка обработчиков событий
function setupEventListeners() {
    // Переключение видимости пароля
    passwordToggle.addEventListener('click', () => {
        const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
        passwordInput.setAttribute('type', type);
        passwordToggle.innerHTML = type === 'password' 
            ? '<i class="far fa-eye"></i>' 
            : '<i class="far fa-eye-slash"></i>';
    });

    // Отправка формы
    registrationForm.addEventListener('submit', handleRegistration);

    // Просмотр пользователей
    viewUsersLink.addEventListener('click', (e) => {
        e.preventDefault();
        showUsersList();
    });
}

// Обработка регистрации
async function handleRegistration(e) {
    e.preventDefault();
    
    const username = usernameInput.value.trim();
    const email = emailInput.value.trim();
    const password = passwordInput.value.trim();

    // Валидация
    if (!username || !email || !password) {
        showMessage('Все поля обязательны для заполнения', 'error');
        return;
    }

    if (password.length < 6) {
        showMessage('Пароль должен содержать минимум 6 символов', 'error');
        return;
    }

    if (!validateEmail(email)) {
        showMessage('Введите корректный email адрес', 'error');
        return;
    }

    try {
        // Блокируем кнопку
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Регистрация...';

        // Проверяем, существует ли пользователь
        const { data: existingUsers, error: checkError } = await supabase
            .from('users')
            .select('*')
            .or(`username.eq.${username},email.eq.${email}`);

        if (checkError) throw checkError;

        if (existingUsers.length > 0) {
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
                    created_at: new Date().toISOString()
                }
            ])
            .select();

        if (error) throw error;

        // Показываем успешное сообщение
        showMessage(`Регистрация успешна! Добро пожаловать, ${username}!`, 'success');
        
        // Обновляем счетчик
        await loadUsersCount();
        
        // Очищаем форму
        registrationForm.reset();

    } catch (error) {
        console.error('Ошибка регистрации:', error);
        showMessage(error.message || 'Ошибка при регистрации. Попробуйте еще раз.', 'error');
    } finally {
        // Разблокируем кнопку
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<i class="fas fa-user-plus"></i> Зарегистрироваться';
    }
}

// Загрузка количества пользователей
async function loadUsersCount() {
    try {
        const { data, error, count } = await supabase
            .from('users')
            .select('*', { count: 'exact', head: true });

        if (error) throw error;
        
        usersCount.textContent = count || 0;
        
        // Сохраняем всех пользователей для просмотра
        if (!data) {
            const { data: users } = await supabase
                .from('users')
                .select('*');
            allUsers = users || [];
        }
        
    } catch (error) {
        console.error('Ошибка загрузки количества пользователей:', error);
    }
}

// Показать список пользователей
function showUsersList() {
    if (allUsers.length === 0) {
        showMessage('Нет зарегистрированных пользователей', 'info');
        return;
    }

    const usersList = allUsers.map(user => 
        `<div style="margin-bottom: 10px; padding: 10px; background: #f8f9fa; border-radius: 5px;">
            <strong>${user.username}</strong> - ${user.email}
            <br><small>Зарегистрирован: ${new Date(user.created_at).toLocaleDateString()}</small>
        </div>`
    ).join('');

    showMessage(`
        <h3 style="margin-bottom: 15px;">Зарегистрированные пользователи:</h3>
        ${usersList}
        <button onclick="closeUsersList()" style="margin-top: 15px; background: #667eea; color: white; border: none; padding: 8px 15px; border-radius: 5px; cursor: pointer;">
            Закрыть
        </button>
    `, 'info');
}

// Закрыть список пользователей
function closeUsersList() {
    messageDiv.style.display = 'none';
    messageDiv.innerHTML = '';
}

// Показать сообщение
function showMessage(text, type) {
    messageDiv.innerHTML = text;
    messageDiv.className = `message ${type}`;
    messageDiv.style.display = 'block';
    
    // Автоматически скрывать успешные сообщения через 5 секунд
    if (type === 'success') {
        setTimeout(() => {
            messageDiv.style.display = 'none';
        }, 5000);
    }
}

// Валидация email
function validateEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
}
