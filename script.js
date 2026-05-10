import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";
import { getDatabase, ref, set, onValue, push } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-database.js";

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

// Получаем данные пользователя из Telegram
let tgUser = null;
let userPhotoUrl = 'https://github.com/MatveyVue/Profiles-Telegram/blob/main/Profile.PNG?raw=true'; // фото по умолчанию

try {
    if (window.Telegram && window.Telegram.WebApp) {
        const webApp = window.Telegram.WebApp;
        webApp.ready();
        tgUser = webApp.initDataUnsafe?.user;
        
        if (tgUser) {
            // Устанавливаем данные в профиль
            document.getElementById('fullName').innerText = tgUser.first_name + (tgUser.last_name ? ' ' + tgUser.last_name : '');
            document.getElementById('username').innerText = tgUser.username ? '@' + tgUser.username : '';
            
            // Получаем аватарку через бота (если есть)
            if (tgUser.photo_url) {
                userPhotoUrl = tgUser.photo_url;
            } else {
                // Генерируем аватарку из первых букв имени
                const initials = tgUser.first_name?.charAt(0) || '?';
                userPhotoUrl = `https://ui-avatars.com/api/?background=1e58d7&color=fff&size=100&name=${initials}&bold=true`;
            }
            
            document.getElementById('avatar').src = userPhotoUrl;
        }
    }
} catch(e) {
    console.log('Не в Telegram WebApp', e);
}

// Если не в Telegram, показываем заглушку
if (!tgUser) {
    document.getElementById('fullName').innerText = 'Гость';
    document.getElementById('username').innerText = '';
    document.getElementById('avatar').src = 'https://github.com/MatveyVue/Profiles-Telegram/blob/main/Profile.PNG?raw=true';
}

// Создание поста
const PostButton = document.getElementById("post");
const textInput = document.getElementById("text");
const postContainer = document.getElementById("post-container");

PostButton.addEventListener('click', () => {
    const text = textInput.value;
    const nick = tgUser ? (tgUser.username || tgUser.first_name) : 'Гость';
    const fullName = tgUser ? (tgUser.first_name + (tgUser.last_name ? ' ' + tgUser.last_name : '')) : 'Гость';
    const avatarUrl = userPhotoUrl;
    
    if (text) {
        const newPostRef = ref(db, 'posts/' + Date.now());
        
        set(newPostRef, {
            nick: nick,
            fullName: fullName,
            text: text,
            avatar: avatarUrl,
            userId: tgUser?.id || null,
            timestamp: Date.now()
        })
        .then(() => {
            console.log("Data written successfully!");
            textInput.value = '';
        })
        .catch((error) => {
            console.error("Error writing data:", error);
        });
    } else {
        alert("Please fill in all fields.");
    }
});

// Загрузка постов
const postsRef = ref(db, 'posts');
onValue(postsRef, (snapshot) => {
    postContainer.innerHTML = '';
    
    const posts = [];
    snapshot.forEach(childSnapshot => {
        posts.push({ id: childSnapshot.key, ...childSnapshot.val() });
    });
    
    // Сортируем по времени (новые сверху)
    posts.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
    
    posts.forEach(post => {
        const postElement = document.createElement('div');
        postElement.classList.add('post-item');
        postElement.innerHTML = `
            <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 8px;">
                <img src="${post.avatar || 'https://github.com/MatveyVue/Profiles-Telegram/blob/main/Profile.PNG?raw=true'}" 
                     style="width: 40px; height: 40px; border-radius: 25px; object-fit: cover;">
                <div>
                    <div style="font-weight: bold; color: white;">${post.fullName || post.nick}</div>
                    <div style="font-size: 11px; color: #888;">${post.nick ? '@' + post.nick : ''}</div>
                </div>
            </div>
            <div style="background: #1e2a3a; padding: 12px; border-radius: 12px; margin-left: 50px;">
                ${post.text}
            </div>
        `;
        postContainer.appendChild(postElement);
    });
});