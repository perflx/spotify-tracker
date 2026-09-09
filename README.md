# Spotify Friends Widget

Приложение для просмотра того, что слушают твои друзья в Spotify.

## Быстрый старт

### 1. Настройка бэкенда

1. Создайте файл `.env` в корне проекта:
```env
CLIENT_ID=ваш_spotify_client_id
CLIENT_SECRET=ваш_spotify_client_secret
REDIRECT_URI=http://localhost:3001/callback
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/spotify-app
SESSION_SECRET=ваш_длинный_случайный_ключ
PORT=3001
```

2. Установите зависимости:
```bash
npm install
```

3. Запустите сервер:
```bash
npm start
```

### 2. Настройка Spotify App

1. Перейдите на [Spotify Developer Dashboard](https://developer.spotify.com/dashboard)
2. Создайте новое приложение
3. Добавьте Redirect URI: `http://localhost:3001/callback`
4. Скопируйте Client ID и Client Secret в `.env` файл

### 3. Настройка MongoDB

1. Создайте кластер в [MongoDB Atlas](https://cloud.mongodb.com)
2. Добавьте ваш IP в Network Access
3. Скопируйте connection string в `.env` файл

## Фронтенд

### Вариант 1: Простой HTML (уже готов)

Откройте `http://localhost:3001` в браузере

### Вариант 2: React приложение

1. Перейдите в папку React приложения:
```bash
cd react-app
```

2. Установите зависимости:
```bash
npm install
```

3. Запустите React приложение:
```bash
npm start
```

React приложение будет доступно на `http://localhost:3000`

## 📱 API Эндпоинты

### Авторизация
- `GET /login` - Вход через Spotify
- `GET /callback` - Обработка ответа от Spotify
- `GET /me` - Информация о пользователе

### Друзья
- `GET /friends` - Список друзей
- `POST /friends/add` - Добавить друга
- `DELETE /friends/remove` - Удалить друга

### Виджет
- `GET /widget/friends-activity` - Активность друзей
- `GET /current-song` - Текущая песня пользователя

## 🛠️ Технологии

### Бэкенд
- Node.js
- Express.js
- MongoDB + Mongoose
- Spotify Web API
- OAuth 2.0 + PKCE

### Фронтенд
- HTML/CSS/JavaScript (простой вариант)
- React.js (продвинутый вариант)

## 🔒 Безопасность

- OAuth 2.0 с PKCE для безопасной авторизации
- HttpOnly cookies для защиты от XSS
- Проверка state параметра для защиты от CSRF
- Автоматическое обновление истекших токенов

## 📱 Мобильное приложение

Для создания мобильного приложения используйте:
- **React Native** - для кроссплатформенной разработки
- **Flutter** - альтернатива React Native
- **Expo** - упрощенная разработка на React Native

## 🎯 Возможности

- ✅ Авторизация через Spotify
- ✅ Добавление/удаление друзей
- ✅ Просмотр активности друзей
- ✅ Автообновление каждые 30 секунд
- ✅ Адаптивный дизайн
- ✅ Обработка ошибок

## 🚀 Планы развития

- [ ] WebSocket для обновлений в реальном времени
- [ ] История прослушивания
- [ ] Общие плейлисты
- [ ] Чат для обсуждения музыки
- [ ] Уведомления о новых треках
- [ ] Статистика прослушивания

