# Деплой Cyberlingo (Vercel / Netlify)

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
git commit -m "Cyberlingo"
```

Создай пустой репозиторий на github.com (без README), затем:

```bash
git remote add origin https://github.com/<твой-логин>/cyberlingo.git
git branch -M main
git push -u origin main
```

### 2а. Vercel

1. Зайди на vercel.com → **Add New → Project**.
2. Выбери свой репозиторий `cyberlingo` → **Import**.
3. Framework Preset определится сам как **Vite**. Проверь:
   - Build Command: `npm run build`
   - Output Directory: `dist`
4. В **Environment Variables** добавь `VITE_SUPABASE_URL` и `VITE_SUPABASE_ANON_KEY`
   (значения из `.env.local`).
5. **Deploy**. Через минуту получишь ссылку вида `cyberlingo.vercel.app`.
6. При каждом `git push` в `main` Vercel будет пересобирать сайт сам.

### 2б. Netlify (вместо Vercel)

1. Зайди на app.netlify.com → **Add new site → Import an existing project**.
2. Подключи GitHub, выбери репозиторий `cyberlingo`.
3. Настройки сборки:
   - Build command: `npm run build`
   - Publish directory: `dist`
4. **Site settings → Environment variables** — добавь `VITE_SUPABASE_URL` и
   `VITE_SUPABASE_ANON_KEY`.
5. **Deploy site**. Получишь ссылку вида `cyberlingo.netlify.app`.

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

## 3. Боевой адрес

Сайт живёт тут: **https://cyberlingo-six.vercel.app**

Проект уже подключён к репозиторию `asimzhanovvv/Cyberlingo`, переменные
окружения прописаны. Каждый `git push` в `main` автоматически пересобирает сайт,
руками ничего делать не нужно.

Если когда-нибудь деплой не запустится сам — почти всегда причина в том, что
проект на Vercel подключили к репозиторию уже ПОСЛЕ последнего пуша. Vercel
строит только по новым пушам и не подхватывает историю задним числом: достаточно
сделать любой новый коммит и запушить.

## 4. Настройки Supabase

`Confirm email` в Supabase → Authentication → Sign In / Providers выключён, так
что регистрация проходит сразу, без письма-подтверждения, и никаких редиректов
не требуется.

Один хвост на будущее: в Authentication → URL Configuration поле **Site URL**
до сих пор стоит дефолтное `http://localhost:3000`. Сейчас это ни на что не
влияет. Но если когда-нибудь включишь подтверждение почты или сброс пароля —
письма будут вести на localhost. Тогда пропиши туда
`https://cyberlingo-six.vercel.app`, а в Redirect URLs добавь и его,
и `http://localhost:5180` для локальной разработки.

## 5. Проверка после деплоя

- Открой сайт — появляется экран входа/регистрации.
- Зарегистрируйся, войди — прогресс должен подтягиваться на другом устройстве
  под тем же логином.
- Установи как PWA (иконка "Установить приложение" в адресной строке или
  "Добавить на экран" на телефоне) — манифест и service worker уже настроены.
