# AWS Migration Guide — Überseehub Marketing Dashboard

## Optionen

### Option A: AWS Amplify (empfohlen, einfachste Migration)
Next.js App Router wird nativ unterstützt.

1. AWS Console → Amplify → "New App" → GitHub verbinden
2. Branch: main
3. Build Settings werden auto-erkannt (Next.js)
4. Environment Variables (alle als "Secret" markieren):
   Alle Variablen aus `.env.example` eintragen

### Option B: AWS ECS + Fargate (Container)
```bash
docker build -t uhub-dashboard .
aws ecr get-login-password | docker login --username AWS --password-stdin <account>.dkr.ecr.eu-central-1.amazonaws.com
docker tag uhub-dashboard:latest <account>.dkr.ecr.eu-central-1.amazonaws.com/uhub-dashboard:latest
docker push <account>.dkr.ecr.eu-central-1.amazonaws.com/uhub-dashboard:latest
```
Env Vars über ECS Task Definition → Environment Variables setzen.

## Wichtig: Env Var Namensgebung

KEIN `NEXT_PUBLIC_` Präfix für Secrets verwenden.
`NEXT_PUBLIC_` macht Variablen im Browser-Bundle öffentlich.
Alle API Keys bleiben ohne Präfix — sie werden nur in `app/api/` verwendet.

## NEXTAUTH_URL anpassen
Nach AWS-Migration `NEXTAUTH_URL` auf neue Domain setzen:
```
NEXTAUTH_URL=https://dashboard.ueberseehub.de
```

Außerdem Google OAuth Redirect URI updaten:
Google Cloud Console → Credentials → Authorized redirect URIs:
`https://dashboard.ueberseehub.de/api/auth/callback/google`
