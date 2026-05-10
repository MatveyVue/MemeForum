import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";
import { getDatabase, ref, set, onValue, query, orderByChild, onDisconnect } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-database.js";

const firebaseConfig = {
    apiKey: "AIzaSyDTbrDxzVWtw1VKhivLZFmM7qptPmr9ATc",
    authDomain: "memeforum-9cfc0.firebaseapp.com",
    databaseURL: "https://memeforum-9cfc0-default-rtdb.firebaseio.com",
    projectId: "memeforum-9cfc0",
    storageBucket: "memeforum-9cfc0.firebasestorage.app",
    messagingSenderId: "274871887330",
    appId: "1:274871887330:web:80abe2bc798b2f5a61c5bb",
    measurementId: "G-XJJQ9X8N09"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

// Telegram WebApp
let tgUser = null;
let userPhotoUrl = '';
let typingTimeout = null;

try {
    const webApp = window.Telegram.WebApp;
    webApp.ready();
    webApp.expand();
    tgUser = webApp.initDataUnsafe?.user;
    
    if (tgUser) {
        // Получаем фото пользователя из Telegram
        if (tgUser.photo_url) {
            userPhotoUrl = tgUser.photo_url;
        } else {
            const firstName = tgUser.first_name || '';
            const lastName = tgUser.last_name || '';
            const initials = (firstName.charAt(0) + lastName.charAt(0)).toUpperCase() || firstName.charAt(0).toUpperCase() || '?';
            userPhotoUrl = `https://ui-avatars.com/api/?background=1e58d7&color=fff&size=200&name=${encodeURIComponent(initials)}&bold=true&length=2`;
        }
        
        const fullName = (tgUser.first_name || '') + (tgUser.last_name ? ' ' + tgUser.last_name : '');
        document.getElementById('fullName').innerText = fullName || 'Whsxg';
        document.getElementById('username').innerText = tgUser.username ? '@' + tgUser.username : '';
        document.getElementById('avatar').src = userPhotoUrl;
        document.getElementById('bottomAvatar').src = userPhotoUrl;
        document.getElementById('typingAvatar').src = userPhotoUrl;
    }
} catch(e) {
    console.log('Not in Telegram');
}

// ===== ЭЛЕМЕНТЫ =====
const textInput = document.getElementById("text");
const typingIndicator = document.getElementById("typingIndicator");
const postContainer = document.getElementById("post-container");
const scrollToBottomBtn = document.getElementById("scrollToBottomBtn");
const typingStatusRef = ref(db, 'typing/' + (tgUser?.id || 'guest'));

// ===== ИНДИКАТОР ПЕЧАТИ =====
function startTyping() {
    if (tgUser) {
        set(typingStatusRef, {
            isTyping: true,
            name: tgUser.first_name || 'Пользователь',
            avatar: userPhotoUrl,
            timestamp: Date.now()
        });
        onDisconnect(typingStatusRef).set(null);
    }
}

function stopTyping() {
    if (tgUser) {
        set(typingStatusRef, null);
    }
}

textInput.addEventListener('input', () => {
    if (textInput.value.length > 0) {
        startTyping();
        if (typingTimeout) clearTimeout(typingTimeout);
        typingTimeout = setTimeout(() => {
            stopTyping();
        }, 1000);
    } else {
        stopTyping();
    }
});

// Слушаем кто печатает
const allTypingRef = ref(db, 'typing');
onValue(allTypingRef, (snapshot) => {
    const typingUsers = [];
    snapshot.forEach(childSnapshot => {
        const data = childSnapshot.val();
        if (data && data.isTyping && childSnapshot.key !== (tgUser?.id?.toString() || 'guest')) {
            if (Date.now() - (data.timestamp || 0) < 3000) {
                typingUsers.push(data);
            }
        }
    });
    
    if (typingUsers.length > 0) {
        const typist = typingUsers[0];
        document.getElementById('typingAvatar').src = typist.avatar;
        const nameText = typist.name.length > 15 ? typist.name.slice(0, 15) + '...' : typist.name;
        document.querySelector('.typing-text').innerHTML = `${nameText} печатает`;
        typingIndicator.classList.remove('hidden');
    } else {
        typingIndicator.classList.add('hidden');
    }
});

// ===== ПРОКРУТКА =====
function scrollToBottom() {
    postContainer.scrollTop = postContainer.scrollHeight;
}

function isAtBottom() {
    return postContainer.scrollHeight - postContainer.scrollTop - postContainer.clientHeight < 50;
}

// Показываем/скрываем кнопку скролла
postContainer.addEventListener('scroll', () => {
    if (isAtBottom()) {
        scrollToBottomBtn.classList.add('hidden');
    } else {
        scrollToBottomBtn.classList.remove('hidden');
    }
});

scrollToBottomBtn.addEventListener('click', () => {
    scrollToBottom();
});

// ===== СОЗДАНИЕ ПОСТА =====
const PostButton = document.getElementById("post");

PostButton.addEventListener('click', () => {
    const text = textInput.value.trim();
    const nick = tgUser ? (tgUser.username || tgUser.first_name) : 'Whsxg';
    const fullName = tgUser ? (tgUser.first_name || 'Whsxg') : 'Whsxg';
    const avatar = userPhotoUrl || 'https://ui-avatars.com/api/?background=1e58d7&color=fff&size=100&name=W';
    
    if (text) {
        stopTyping();
        
        const timestamp = Date.now();
        const newPostRef = ref(db, 'posts/' + timestamp);
        
        set(newPostRef, {
            nick: nick,
            fullName: fullName,
            text: text,
            avatar: avatar,
            userId: tgUser?.id || null,
            timestamp: timestamp
        })
        .then(() => {
            textInput.value = '';
            textInput.blur();
        })
        .catch((error) => {
            console.error("Error:", error);
        });
    }
});

// ===== ФОРМАТИРОВАНИЕ =====
function formatTime(timestamp) {
    const date = new Date(timestamp);
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// ===== ЗАГРУЗКА ПОСТОВ =====
const postsRef = ref(db, 'posts');
const postsQuery = query(postsRef, orderByChild('timestamp'));

onValue(postsQuery, (snapshot) => {
    const wasAtBottom = isAtBottom();
    
    const posts = [];
    snapshot.forEach(childSnapshot => {
        posts.push({ id: childSnapshot.key, ...childSnapshot.val() });
    });
    
    // Сортируем по времени — старые сверху, новые снизу
    posts.sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
    
    // Очищаем контейнер
    postContainer.innerHTML = '';
    
    if (posts.length === 0) {
        postContainer.innerHTML = `
            <div class="empty-state">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#8e8e93" stroke-width="1.5">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                </svg>
                <p>Нет сообщений</p>
                <p style="font-size: 13px;">Напишите что-нибудь...</p>
            </div>
        `;
        return;
    }
    
    // Отображаем посты
    posts.forEach(post => {
        const postElement = document.createElement('div');
        postElement.classList.add('post-item');
        
        const displayName = post.fullName || post.nick || 'Пользователь';
        const timeStr = formatTime(post.timestamp || Date.now());
        const avatar = post.avatar || `https://ui-avatars.com/api/?background=1e58d7&color=fff&size=28&name=${displayName.charAt(0)}`;
        
        postElement.innerHTML = `
            <div class="post-top">
                <span class="post-name">${escapeHtml(displayName)}</span>
            </div>
            <div class="post-message-wrapper">
                <div class="post-bubble">
                    <div class="post-text">${escapeHtml(post.text)}</div>
                </div>
                <img class="post-avatar" src="${avatar}" alt="avatar">
            </div>
            <div class="post-time">${timeStr}</div>
        `;
        
        postContainer.appendChild(postElement);
    });
    
    // Скроллим вниз если было внизу или новое сообщение
    if (wasAtBottom) {
        scrollToBottom();
    }
});

// При загрузке страницы скроллим вниз
setTimeout(() => {
    scrollToBottom();
}, 500);
