# person — GPT-4o mini one-page chat

A deliberately small conversational web app:

- `index.html` — entire visible interface; suitable for GitHub Pages
- `worker.js` — Cloudflare Worker that talks to OpenAI
- `wrangler.toml` — Worker configuration

The OpenAI API key belongs only in Cloudflare, never in the GitHub repository.

## 1. Create an OpenAI API key

Create an API key in your OpenAI API account.

Do **not** paste the key into `index.html`, `worker.js`, GitHub, or a public repository.

## 2. Deploy the Cloudflare Worker

Install Wrangler if needed:

```bash
npm install -g wrangler
```

Log in:

```bash
wrangler login
```

From this folder, save your OpenAI key as a Cloudflare secret:

```bash
wrangler secret put OPENAI_API_KEY
```

Paste the key when prompted.

Then deploy:

```bash
wrangler deploy
```

Cloudflare will give you a URL similar to:

```text
https://person-chat.YOUR-SUBDOMAIN.workers.dev
```

## 3. Connect the web page

Open `index.html` and replace:

```js
const API_URL = "https://YOUR-WORKER.YOUR-SUBDOMAIN.workers.dev";
```

with your actual Worker URL.

## 4. Put the page on GitHub Pages

Create a GitHub repository and add these files.

In the repository:

**Settings → Pages → Deploy from a branch → main / root**

Your page will then appear at a URL similar to:

```text
https://YOUR-GITHUB-NAME.github.io/person/
```

## 5. Optional: restrict the Worker to that site

Once your GitHub Pages address is working, edit `wrangler.toml` and uncomment:

```toml
[vars]
ALLOWED_ORIGIN = "https://YOUR-GITHUB-NAME.github.io"
```

Then run:

```bash
wrangler deploy
```

## Changing the personality

The main creative control is near the top of `worker.js`:

```js
const PERSON_PROMPT = `...`;
```

Edit that block to change the character, tone, rules, theatrical frame, knowledge, or relationship to the visitor.

## Conversation memory

This starter stores the visible conversation in browser `localStorage`.

That means:

- refreshing the page preserves the conversation on that browser;
- another phone gets a separate conversation;
- clearing browser/site data clears the conversation;
- the server does not maintain a user account or permanent chat history.

For each response the page sends the most recent 20 messages back to the model.

## Cost

The site uses the OpenAI API, which is billed separately from a ChatGPT subscription. Keeping the recent-history window and response length bounded helps keep usage predictable.
