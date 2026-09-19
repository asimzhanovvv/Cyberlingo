# Деплой CyberPath (Vercel / Netlify)

Проект — обычное статическое SPA на Vite. Собирается командой `npm run build`,
результат — папка `dist`. Ниже два способа: через GitHub (сайт сам пересобирает
проект при каждом пуше) и через CLI (без GitHub, руками из терминала).

## 0. Что нужно под рукой

Два значения из `.env.local` — они же будут переменными окружения на хостинге:

```
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
```

## Способ А: через GitHub (рекомендуется)

### 1. Залить проект на GitHub

В папке проекта:

```bash
git init
git add .
git commit -m "CyberPath"
```

Создай пустой репозиторий на github.com (без README), затем:

```bash
git remote add origin https://github.com/<твой-логин>/cyberpath.git
git branch -M main
git push -u origin main
```

### 2а. Vercel

1. Зайди на vercel.com → **Add New → Project**.
2. Выбери свой репозиторий `cyberpath` → **Import**.
3. Framework Preset определится сам как **Vite**. Проверь:
   - Build Command: `npm run build`
   - Output Directory: `dist`
4. В **Environment Variables** добавь `VITE_SUPABASE_URL` и `VITE_SUPABASE_ANON_KEY`
   (значения из `.env.local`).
5. **Deploy**. Через минуту получишь ссылку вида `cyberpath.vercel.app`.
6. При каждом `git push` в `main` Vercel будет пересобирать сайт сам.

### 2б. Netlify (вместо Vercel)

1. Зайди на app.netlify.com → **Add new site → Import an existing project**.
2. Подключи GitHub, выбери репозиторий `cyberpath`.
3. Настройки сборки:
   - Build command: `npm run build`
   - Publish directory: `dist`
4. **Site settings → Environment variables** — добавь `VITE_SUPABASE_URL` и
   `VITE_SUPABASE_ANON_KEY`.
5. **Deploy site**. Получишь ссылку вида `cyberpath.netlify.app`.

## Способ Б: без GitHub, из терминала (быстрее для одного человека)

### Vercel CLI

```bash
npm i -g vercel
vercel login
vercel            # первый раз — ответит на вопросы, создаст проект
vercel env add VITE_SUPABASE_URL production
vercel env add VITE_SUPABASE_ANON_KEY production
vercel --prod     # финальный деплой
```

### Netlify CLI

```bash
npm i -g netlify-cli
netlify login
npm run build
netlify deploy --dir=dist          # тестовый деплой, покажет превью-ссылку
netlify env:set VITE_SUPABASE_URL "..."
netlify env:set VITE_SUPABASE_ANON_KEY "..."
netlify deploy --dir=dist --prod   # финальный деплой
```

## 3. Важно: настроить Supabase под новый домен

После деплоя зайди в Supabase → **Authentication → URL Configuration** и
пропиши реальный адрес сайта (например `https://cyberpath.vercel.app`) в:

- **Site URL**
- **Redirect URLs** (добавь и его, и `http://localhost:5180` для локальной разработки)

Без этого шага подтверждение почты при регистрации будет вести на неправильный
адрес. Если в Supabase → Authentication → Providers → Email включено
"Confirm email", после регистрации пользователю нужно будет подтвердить почту
по письму, прежде чем он сможет войти — это нормальное поведение формы входа
в приложении.

## 4. Проверка после деплоя

- Открой сайт — должен появиться экран входа/регистрации (если Supabase
  настроен). Без переменных окружения приложение по-прежнему работает
  полностью офлайн, без экрана входа.
- Зарегистрируйся, войди — прогресс должен подтягиваться на другом устройстве
  под тем же логином.
- Установи как PWA (иконка "Установить приложение" в адресной строке или
  "Добавить на экран" на телефоне) — манифест и service worker уже настроены.
