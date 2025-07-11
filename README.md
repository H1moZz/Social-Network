# Social Network

## Описание
Социальная сеть с современным интерфейсом и расширенным функционалом обмена сообщениями. Проект включает в себя как фронтенд, так и бэкенд части.

## Основные возможности
- 💬 Чат с поддержкой различных типов сообщений:
  - Текстовые сообщения
  - Изображения
  - Видео
  - Документы различных форматов
- 👥 Система друзей и подписчиков
- 📱 Адаптивный дизайн для мобильных устройств
- 🔔 Уведомления в реальном времени
- ✏️ Редактирование и удаление сообщений
- 📱 Поддержка мобильных устройств

## Технологии
### Frontend
- React.js
- WebSocket для real-time коммуникации
- CSS3 с поддержкой современных функций
- Адаптивный дизайн

### Backend
- Python
- WebSocket сервер
- REST API
- Поддержка загрузки и обработки медиафайлов

## Установка и запуск

### Требования
- Node.js (для frontend)
- Python 3.8+ (для backend)
- Git

### Frontend
```bash
cd frontend
npm install
npm start
```

### Backend
```bash
cd backend
pip install -r requirements.txt
python app.py
```

## Структура проекта
```
social-network/
├── frontend/           # React приложение
│   ├── src/
│   │   ├── components/ # React компоненты
│   │   ├── assets/     # Статические файлы
│   │   └── api/        # API интеграция
│   └── public/         # Публичные файлы
│
└── backend/           # Python backend
    ├── api/          # API endpoints
    ├── models/       # Модели данных
    └── utils/        # Вспомогательные функции
```

## Поддерживаемые форматы файлов
- Изображения: JPG, PNG, GIF
- Видео: MP4, MOV, AVI
- Документы: PDF, DOC, DOCX, XLS, XLSX
- Текстовые файлы: TXT, CSV
- Архивы: ZIP, RAR

## Ограничения
- Максимальный размер файла: 50MB
- Поддерживаемые форматы файлов указаны выше

## Безопасность
- Аутентификация пользователей
- Защита от XSS атак
- Безопасная обработка файлов
- Валидация всех входящих данных

## Лицензия
MIT License

## Автор
[Ваше имя]

## Контакты
- Email: [ваш email]
- GitHub: [ссылка на ваш GitHub]
