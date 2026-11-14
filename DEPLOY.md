# Put UCF online

Three free services work together:

- **Neon:** the database
- **Render:** the Django back end
- **Vercel:** the website people see. It passes `/api` and `/admin` on to
  Render, so logins work.

Do the steps in order. Total time: about 20 minutes.

## 1. Push this repo to GitHub

Render and Vercel build straight from GitHub.

## 2. Neon (database)

1. Sign up at neon.tech and create a project called `ucf`.
2. Copy the **connection string**. It starts with `postgresql://`.

## 3. Render (back end)

1. Sign up at render.com with GitHub.
2. Click **New > Blueprint**, pick this repo. Render reads `render.yaml`.
3. Fill in the values it asks for:
   - `DATABASE_URL`: the Neon connection string
   - `DJANGO_SUPERUSER_USERNAME`, `DJANGO_SUPERUSER_EMAIL`,
     `DJANGO_SUPERUSER_PASSWORD`: your admin account
   - `UCF_TRUSTED_ORIGINS`: leave as `https://example.com` for now
4. Click **Apply**. Wait for **Live**.
5. Note the address, e.g. `https://ucf-backend.onrender.com`.
   If yours is different, change the 3 Render addresses in
   `frontend/vercel.json`, then push.

## 4. Vercel (website)

1. Sign up at vercel.com with GitHub.
2. **Add New > Project**, pick this repo.
3. Set **Root Directory** to `frontend`. Click **Deploy**.
4. Note the address, e.g. `https://ucf-abc.vercel.app`.

## 5. Connect them

On Render, open the service > **Environment**. Set `UCF_TRUSTED_ORIGINS` to
your Vercel address (no slash at the end), for example:

```
https://ucf-abc.vercel.app,https://ucf.estenlab.com
```

Save. Render restarts by itself.

Open the Vercel address. Create an account. Done.

## 6. Optional: ucf.estenlab.com

1. Vercel > your project > **Settings > Domains**: add `ucf.estenlab.com`.
2. Cloudflare > **DNS**: add a `CNAME` record, name `ucf`, target
   `cname.vercel-dns.com`, **DNS only** (grey cloud).

## Good to know

- Render's free plan sleeps after 15 minutes with no visitors. The first visit
  after that takes about 30 seconds.
- New accounts can read everything but not edit. Only admins can edit.
- The admin page is at `/admin` on the Vercel address.
