# Shopping Popular — Santa Maria

Plataforma de gestão do Shopping Independência (espaço público de comércio popular de Santa Maria/RS).
Vitrine pública + painel de gestão restrito. Iniciativa da SMDE&I.

**Stack:** Next.js (App Router) · Supabase (Postgres + Auth) · Tailwind · deploy no Vercel.

## Rodar localmente

```bash
npm install
cp .env.example .env.local   # já existe um .env.local preenchido para o projeto atual
npm run dev
# http://localhost:3000
```

## Variáveis de ambiente

| Variável | Descrição |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | URL do projeto Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Chave pública (anon/publishable) |

Os dados sensíveis são protegidos por **RLS** no banco — a chave pública só lê o que é público
(bancas, segmentos, editais). Dados pessoais e processuais exigem usuário com papel de staff.

## Estrutura

```
src/
  app/
    page.tsx            Vitrine — início
    mapa/               Mapa de bancas (interativo)
    participar/         Como participar
    indicadores/        Indicadores agregados
    admin/              Painel de gestão (login + dashboard de conformidade)
  lib/
    supabase.ts         Cliente Supabase
    data.ts             Leituras (bancas, segmentos, contagens)
    types.ts            Tipos e rótulos de status
```

## Banco de dados (Supabase)

Projeto: `shopping-popular-santa-maria` (região sa-east-1).
Tabelas: `banca`, `permissionario`, `auxiliar`, `recadastramento`, `notificacao`, `processo`,
`pagamento`, `sorteio`, `conselho_gestor`, `ata`, `manifestacao_interesse`, `segmento`,
`site_config`, `profile`. RLS habilitado em todas.

Para dar acesso de gestão a um usuário: crie o usuário em Auth e insira o papel em `profile`
(`admin`, `poder_publico`, `concessionaria`, `fiscalizacao` ou `conselho`).

## Deploy (Vercel)

1. `git push` para um repositório no GitHub.
2. No Vercel: **New Project** → importar o repositório → root `Plataforma/web`.
3. Adicionar as duas variáveis de ambiente.
4. Deploy.
