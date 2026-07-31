# PDPadel

Marcador y ranking de **Pádel Americano** — PWA mobile-first (Next.js 14 + Supabase + Vercel).

## Flujo

1. **Configurar jornada**: duración, canchas (1–5) y jugadores auto-calculados (canchas × 4).
2. **Registrar jugadores**: autocompletado contra el historial de jugadores (crea nuevos si no existen).
3. **Generar partidos**: round-robin automático (método del círculo). Cada jugador hace pareja con todos los demás una vez. Distribuidos en rondas según las canchas.
4. **Marcador**: modo puntos (primero en llegar, p. ej. 31, con 2 de ventaja) o modo sets (mejor de 1/3/5) con detalle set a set.
5. **Clasificación**: en vivo por jornada y agregada por temporada/histórico.

## Stack

- Next.js 14 (App Router, TypeScript, Tailwind CSS)
- PWA con `next-pwa` (manifest + service worker para instalar/offline)
- Supabase (PostgreSQL + RLS)
- Auth por PIN (cookie httpOnly; `APP_PIN` en variables de entorno)

## Setup

1. Clona y `npm install`.
2. Crea un proyecto en [Supabase](https://supabase.com) y pega `supabase/schema.sql` en el SQL editor.
3. `cp .env.local.example .env.local` y completa:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `APP_PIN` (el PIN de acceso de la app)
4. `npm run dev` → http://localhost:3000

## Deploy en Vercel

1. Push a GitHub.
2. Importa el repo en Vercel (framework: Next.js).
3. Añade las 3 variables de entorno del paso 3.
4. Deploy. La PWA es instalable desde el navegador del teléfono.

## Estructura

```
src/
  app/
    login/                    # PIN de acceso
    events/new/               # Paso 1: configuración
    events/[id]/players/      # Paso 2: registro de jugadores
    events/[id]/              # Paso 3: rondas y partidos
    events/[id]/matches/[matchId]/  # Paso 4: marcador
    events/[id]/standings/    # Paso 5: clasificación en vivo
    players/                  # Historial de jugadores
    seasons/                  # Temporadas
  components/                 # Header, autocompletado, tarjetas, tabla
  lib/
    matchmaking.ts            # Algoritmo round-robin
    rankings.ts               # Cálculo de clasificación
    supabase/                 # Clientes Supabase
supabase/schema.sql           # Esquema SQL + RLS
```
