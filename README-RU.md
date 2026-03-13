# Европа 2026 — backend для Vercel

Это минимальный serverless backend для ИИ-консьержа.

## Как развернуть

1. Создайте новый GitHub-репозиторий, например `trip2026-concierge-backend`.
2. Загрузите в него содержимое этой папки.
3. В Vercel создайте новый проект из этого репозитория.
4. В Vercel → Settings → Environment Variables добавьте:

- `OPENAI_API_KEY` = ваш API key OpenAI
- `ALLOWED_ORIGINS` = `https://ivantimurov13-design.github.io`
- `OPENAI_MODEL` = `gpt-5-mini`  (или `gpt-5.4`, если хотите более сильную модель)

5. Нажмите Deploy.
6. После деплоя возьмите URL вида:
   `https://ВАШ-ПРОЕКТ.vercel.app/api/concierge`
7. Откройте во фронтенде `config.js` и вставьте этот URL в `conciergeApiUrl`.

## Проверка

После деплоя фронтенда и backend зайдите на вкладку «Консьерж ✨» и задайте вопрос.
