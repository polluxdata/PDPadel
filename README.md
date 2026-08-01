# PDPadel

PWA de **Pádel Americano**: grupos de jugadores, temporadas, quedadas y ranking.
Mobile-first (Next.js 14 + Supabase + Vercel).

## Modelo

- **Usuarios** con rol: `super_admin` (usuario 0), `admin` (administrador de grupo), `player`.
- **Grupos** de jugadores de pádel. Cada grupo tiene un administrador.
- **Temporadas**: una sola activa por grupo. Al cerrarla se calcula el ganador y queda en solo lectura.
- **Quedadas** (jornadas) dentro de una temporada: canchas, duración, formato (puntos o sets), participantes.
- **Partidos**: round-robin automático (cada jugador hace pareja con todos y se enfrenta a todos), distribuidos en rondas según canchas.
- **Ranking** por temporada: 2 puntos por partido ganado (el marcador set a set y por puntos suma a la diferencia).
- **Auditoría**: registro de quién crea grupos, usuarios, quedadas, partidos, etc.

## Acceso

- El **usuario 0** (superadmin) se crea solo al primer arranque con `SUPER_ADMIN_PIN`.
- Nuevos usuarios se registran con:
  - el **token diario** del superadmin (se regenera cada día), o
  - un **PIN** emitido por el superadmin o el admin del grupo (rol jugador o administrador).

## Flujo

1. Login / registro (PIN o token).
2. Inicio: lista tus grupos y tu puesto en la temporada en curso.
3. Grupo: clasificación, jugadores y (si eres admin) crear temporada y quedada.
4. Quedada: partidos por rondas; el admin ingresa los marcadores (puntos o sets).
5. Al finalizar la quedada los puntos se suman al ranking de la temporada.
6. Cerrar temporada → ganador calculado, solo lectura.

## Setup

1. `npm install`
2. Supabase: pegar `supabase/schema.sql` en el SQL editor.
3. `cp .env.local.example .env.local` y completar:
   - `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPER_ADMIN_PIN` (PIN del usuario 0, usuario `superadmin`)
   - `APP_TOKEN_SECRET` (secreto del token diario)
4. `npm run dev`

## Deploy (Vercel)

Importa el repo en Vercel y añade las mismas variables de entorno. La PWA es instalable.

## Estructura

```
src/
  app/
    login/  register/  admin/  profile/
    groups/[id]/
      members/            # agregar jugadores + generar PINs
      seasons/new/        # crear temporada
      seasons/[seasonId]/ # clasificación + cerrar temporada
      quedadas/new/       # crear quedada (participantes, canchas, formato)
      quedadas/[qid]/     # rondas y partidos
      quedadas/[qid]/matches/[mid]/  # marcador
  components/             # Header, MatchCard, StandingsTable
  lib/
    matchmaking.ts        # round-robin (parejas + rivales)
    points.ts             # ranking por temporada
    session.tsx           # sesión y roles
    token.ts              # token diario + PINs
    audit.ts              # trazabilidad
    supabase/             # clientes
supabase/schema.sql       # esquema SQL + RLS
```
