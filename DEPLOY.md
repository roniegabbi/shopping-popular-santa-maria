# Deploy — Shopping Popular (GitHub + Vercel)

O repositório Git está na raiz desta pasta (`Plataforma/web`), então o app Next.js já é a raiz do projeto.

## 1. Finalizar o Git (na sua máquina)

No terminal, dentro de `Plataforma/web`:

```bash
rm -f .git/index.lock                 # destrava o lock deixado pelo drive
git add -A
git commit -m "app completo: vitrine + painel de gestão"
```

## 2. Criar o repositório no GitHub e enviar

Crie um repositório vazio no GitHub (ex.: `shopping-popular-santa-maria`), depois:

```bash
git branch -M main
git remote add origin https://github.com/SEU-USUARIO/shopping-popular-santa-maria.git
git push -u origin main
```

## 3. Importar no Vercel

1. https://vercel.com/new → **Import Git Repository** → selecione o repositório.
2. **Framework Preset:** Next.js (detectado automaticamente).
3. **Root Directory:** deixe no padrão (`./`) — o app já está na raiz do repo.
4. **Environment Variables** — adicione as duas:

   | Name | Value |
   |---|---|
   | `NEXT_PUBLIC_SUPABASE_URL` | `https://hxrkjsesemiulapqszti.supabase.co` |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh4cmtqc2VzZW1pdWxhcHFzenRpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ5MDAxODcsImV4cCI6MjEwMDQ3NjE4N30.8NB-rJlVaH9HCw_k4pn1Y_5vn9JscJTK1SFAgJz_cWk` |

5. **Deploy**.

## 4. Após o deploy — Supabase

No painel do Supabase → **Authentication → URL Configuration**, adicione o domínio do Vercel
(ex.: `https://shopping-popular-santa-maria.vercel.app`) em **Site URL**. Assim o login do `/admin`
funciona no domínio publicado.

## Pronto

- Vitrine pública: `https://SEU-DOMINIO.vercel.app`
- Painel de gestão: `https://SEU-DOMINIO.vercel.app/admin` (login: ronie.gabbi74@gmail.com)

Cada `git push` novo dispara um redeploy automático no Vercel.
