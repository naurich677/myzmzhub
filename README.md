# 💰 Finance Tracker, Habits & Movies App

Многофункциональное мобильное приложение для управления финансами, отслеживания привычек и просмотра фильмов.

![Next.js](https://img.shields.io/badge/Next.js-16-black?style=flat-square&logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?style=flat-square&logo=typescript)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-4-38B2AC?style=flat-square&logo=tailwind-css)

## ✨ Возможности

### 💰 Кошелек (Финансы)
- Отслеживание доходов и расходов
- Баланс в тенге (₸)
- Голосовой ввод транзакций
- Сканирование чеков (OCR)
- Свайп для удаления записей

### ✅ Трекер привычек
- Добавление привычек с иконками
- Ежедневные / еженедельные / разовые задачи
- Счётчик серий (streak)
- Статистика выполнения

### 🎬 Кино
- Поиск фильмов через TMDB API
- Список "Смотреть вечером"
- Просмотр через несколько видеобалансеров:
  - Kinobox (все озвучки)
  - HDRezka
  - Alloha TV
  - Kodik

## 🛠 Технологии

- **Frontend:** Next.js 16, React 19, TypeScript
- **Стилизация:** Tailwind CSS 4, shadcn/ui
- **Иконки:** Lucide React
- **API:** TMDB, Deepgram (голос), OCR.space

## 🚀 Запуск

```bash
# Установка зависимостей
bun install

# Запуск в режиме разработки
bun run dev

# Сборка для production
bun run build
```

## 📱 Скриншоты

Приложение имеет тёмную тему с мобильным дизайном:

- Главный экран кошелька с балансом
- Список фильмов с постерами
- Трекер привычек с прогрессом

## 🔑 API ключи

Приложение использует следующие API:
- **TMDB** - поиск фильмов
- **Deepgram** - распознавание голоса
- **OCR.space** - распознавание текста с изображений
- **OpenRouter** - AI анализ

## 📄 Лицензия

MIT

---

Создано с ❤️
