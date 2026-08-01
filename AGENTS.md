# AGENTS.md — PDPadel

Guía de contexto para agentes de IA que trabajen en este repositorio.

## Proyecto

PWA de Pádel Americano (Next.js 14 App Router + TypeScript + Tailwind + Supabase + next-pwa). Mobile-first. Acceso con PIN.

## Comandos útiles

```bash
npm run dev     # dev server (puerto 3000)
npm run build   # build de producción (verifica tipos)
npm run lint    # eslint (sin warnings ni errores)
```

Siempre correr `npm run build` y `npm run lint` tras cambios. El build además valida prerender de todas las rutas.

## Arquitectura

- **Rutas**: server components delgados (`page.tsx`) que pasan los ids por props a client components (`*Client.tsx`). **NO usar `useParams()` en client components**: causa bugs de navegación (params del route anterior o `undefined`). Los params se leen en el server wrapper y se pasan como props.
  - Segmentos: `groups/[id]` → prop `groupId`; `seasons/[seasonId]` → props `groupId` (ojo: el param del wrapper es `params.id`, no `params.groupId`) y `seasonId`; `quedadas/[qid]` → props `groupId` y `quedadaId`.
- **Datos**: todo el fetch es cliente con `createClient()` (browser supabase). Patrón: `useCallback` + `load()` + `useEffect([load])`, con `try/catch/finally` y estado de `error` + botón Reintentar para nunca quedarse en "Cargando".
- **Joins de partidos**: usar FK explícitas `p1:users!matches_player1_id_fkey(*)`, `p2:...player2_id...`, etc. (4 FK a la misma tabla; sin nombrarlas PostgREST puede resolver mal).
- **Sesión**: `SessionProvider` en el root layout; `useSession()` expone `user`, `loading`, `refresh`. Helpers `isAdmin`, `isSuper`. Sesión por cookie httpOnly (`pdp_session`).
- **Roles**: `super_admin`, `admin`, `player` (columna `users.role`). Los admin de grupo son usuarios con rol `admin`; `groups.admin_id` señala al dueño.

## Reglas de negocio clave

- **Una temporada activa por grupo**: índice único parcial `seasons_one_active_per_group`.
- **Formato puntos**: primero en llegar a la meta (21/31/50) con 2 de ventaja (`WIN_BY = 2`).
- **Formato set único sin fin**: NO es "al mejor de N". Se juega un solo set corrido; gana la pareja con más puntos al terminar el tiempo. No hay lista de sets ni selector de "al mejor de".
- **Puntos de ranking**: modo puntos = 2 pts por victoria; modo sets = 1 pt (`SETS_WIN_POINTS`). El marcador (pointsFor/Against) siempre suma a la diferencia de desempate; `sets_details` es legado opcional.
- **Partidos**: no se pueden "saltar" (no hay botón). La quedada puede finalizar antes con "Finalizar quedada"; los pendientes no cuentan.
- **Edición**: el admin puede editar resultados ya registrados (el marcador inline con "Guardar cambios"). `MatchScorer` sincroniza su estado con la prop `match` tras recargar.
- **Trazabilidad**: cada mutación inserta en `audit_log` vía `audit(supabase, { userId, action, entity, entityId, details })` (helper en `lib/audit.ts`). Acciones típicas: `create_group`, `create_season`, `create_quedada`, `complete_match`, `finish_quedada`, `close_season`, `add_member`, `issue_pin`, `register`, `login`, `update_profile`.

## Matchmaking

`lib/matchmaking.ts`: método del círculo (1-factorization) para parejas + agrupación greedy para que cada jugador se enfrente a todos. Requiere múltiplo de 4 jugadores (`courts * 4`). Produce `n-1` rondas de `courts` partidos. Ya validado para 1–5 canchas.

## Base de datos (Supabase)

- Esquema completo en `supabase/schema.sql` (se corre en el SQL editor del dashboard).
- RLS habilitada pero **permissiva** (la llave anon puede leer/escribir todo): la autorización la hace la app (sesión + roles). Endurecer RLS si pasa a uso público.
- Tablas: `users`, `groups`, `group_members`, `seasons`, `quedadas`, `quedada_players`, `matches`, `registration_codes`, `audit_log`.

## Variables de entorno

- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` (anon/publishable).
- `SUPER_ADMIN_PIN` (PIN del usuario `superadmin`, se crea en bootstrap).
- `APP_TOKEN_SECRET` (secreto HMAC del token diario de registro).
- Ver `.env.local.example`. `.env.local` real está en `.gitignore`.

## Observaciones / pendientes

- **Seguridad**: el `sb_secret_`/service_role nunca debe ir al navegador. La `sb_secret_` compartida en conversación debería rotarse en Supabase.
- **RLS abierta**: para producción multi-tenant conviene cerrar RLS por rol/sesión.
- **Auditoría por app**: se inserta desde el cliente; si se requiere integridad fuerte, mover a triggers/función RPC de Supabase.
- **Token diario**: se computa en `lib/token.ts` con HMAC de la fecha; no está en BD (se regenera cada día automáticamente).
- **Modo sets**: la UI ya no usa `max_sets`/`sets_details`; quedan en el esquema como legado.
- **`AGENTS.md`**: mantener actualizado al cambiar rutas, lógica de ranking o seguridad.

## Validaciones frecuentes

- Tras refactors de rutas: confirmar que las flechas de volver apunten al grupo correcto (revisar `href` en el HTML servido).
- Tras cambios de marcador: probar registrar + editar resultado y que el ranking de la temporada se actualice.
- Verificar que ningún archivo con credenciales (`.env.local`, llaves) quede versionado: `git ls-files | grep -iE "\.env|\.pem|secret"`.
