# AGENTS.md — PolluxPadel

Guía de contexto para agentes de IA que trabajen en este repositorio.

## Proyecto

PWA de Pádel Americano (Next.js 14 App Router + TypeScript + Tailwind + Supabase + next-pwa). Mobile-first. Acceso por **magic link** (email); PIN solo como respaldo del superadmin. En producción: https://ppadel.polluxdata.com (Vercel).

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
- **Datos**: todo el fetch/mutación es por **API routes propias** (`/api/...`) que usan `SUPABASE_SERVICE_KEY` (service role, ignora RLS) y validan sesión + rol por grupo. El cliente **no toca Supabase** (la llave anon está bloqueada por RLS). Helpers: `requireUser()` y `getGroupRole()` en `lib/api/auth.ts`, cliente en `lib/supabase/service.ts`. **Rate limit**: `checkRateLimit()` en `lib/api/rateLimit.ts` (tabla `rate_limits`) aplicado en magic links (por email/IP) e invitaciones.
- **Joins de partidos**: usar FK explícitas `p1:users!matches_player1_id_fkey(*)`, `p2:...player2_id...`, etc. (4 FK a la misma tabla; sin nombrarlas PostgREST puede resolver mal).
- **Sesión**: `SessionProvider` en el root layout; `useSession()` expone `user`, `loading`, `refresh`. Helpers `isAdmin`, `isSuper`. Sesión por cookie httpOnly (`pdp_session`) que guarda un **token de sesión aleatorio**; en BD (`sessions`) solo su hash, con expiración (30 días) y revocable al cerrar sesión. Helpers en `lib/api/auth.ts`: `createSession`, `requireUser`, `setSessionCookie`, `revokeSession`.
- **Roles**: los roles son **por grupo** (`group_members.role` = `admin`|`player`). `users.role` solo distingue `super_admin` (control global); el resto son jugadores. `groups.admin_id` señala al dueño (admin irremovible). Ayudantes: `isGroupAdmin(user, group, membershipRole)` en `lib/groupRoles.ts`. Un usuario puede ser admin en un grupo y jugador en otro.

## Reglas de negocio clave

- **Una temporada activa por grupo**: índice único parcial `seasons_one_active_per_group`.
- **Formato puntos**: primero en llegar a la meta (21/31/50) con 2 de ventaja (`WIN_BY = 2`).
- **Formato set único sin fin**: NO es "al mejor de N". Se juega un solo set corrido; gana la pareja con más puntos al terminar el tiempo. No hay lista de sets ni selector de "al mejor de".
- **Puntos de ranking**: modo puntos = 2 pts por victoria; modo sets = 1 pt (`SETS_WIN_POINTS`). El marcador (pointsFor/Against) siempre suma a la diferencia de desempate; `sets_details` es legado opcional.
- **Partidos**: no se pueden "saltar" (no hay botón). La quedada puede finalizar antes con "Finalizar quedada"; los pendientes no cuentan.
- **Edición**: el admin puede editar resultados ya registrados (el marcador inline con "Guardar cambios"). `MatchScorer` sincroniza su estado con la prop `match` tras recargar.
- **Trazabilidad**: cada mutación inserta en `audit_log` vía `audit(supabase, { userId, action, entity, entityId, details })` (helper en `lib/audit.ts`). Acciones típicas: `create_group`, `create_season`, `create_quedada`, `complete_match`, `finish_quedada`, `close_season`, `add_member`, `remove_member`, `change_role`, `join_group`, `delete_user`, `login`, `update_profile`, `request_magic_link`, `create_invite`, `accept_invite`, `magic_link_login`.

## Matchmaking

`lib/matchmaking.ts`: método del círculo (1-factorization) para parejas + agrupación greedy para que cada jugador se enfrente a todos. Requiere múltiplo de 4 jugadores (`courts * 4`). Produce `n-1` rondas de `courts` partidos. Ya validado para 1–5 canchas.

## Base de datos (Supabase)

- Esquema completo en `supabase/schema.sql` (se corre en el SQL editor del dashboard).
- RLS habilitada pero **permissiva** (la llave anon puede leer/escribir todo): la autorización la hace la app (sesión + roles). Endurecer RLS si pasa a uso público.
- Tablas: `users`, `groups`, `group_members`, `seasons`, `quedadas`, `quedada_players`, `matches`, `magic_links`, `sessions`, `rate_limits`, `audit_log`.

## Variables de entorno

- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` (anon/publishable).
- `SUPER_ADMIN_PIN` (PIN del usuario `superadmin`, se crea en bootstrap), `SUPER_ADMIN_EMAIL`.
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `EMAIL_FROM` (OCI Email Delivery), `APP_URL` (URL pública para enlaces).
- Ver `.env.local.example`. `.env.local` real está en `.gitignore`.

## Observaciones / pendientes

### Decisiones de diseño aprobadas (pendientes de implementar)

- **Auth con magic link** (reemplaza PIN/token diario): **IMPLEMENTADO** (login, alta e invitación).
  - Login y alta por correo (enlace de verificación 15 min, un solo uso, tabla `magic_links`).
  - `users.email` pasa a ser único y obligatorio (índice único `users_email_unique`); `pin_hash` es opcional (usuarios de magic link no tienen PIN).
  - El super admin entra con magic link (`SUPER_ADMIN_EMAIL`); `SUPER_ADMIN_PIN` queda como respaldo temporal.
  - SMTP: OCI Email Delivery en `lib/mail.ts` (nodemailer). Credenciales solo en vars de entorno, nunca `NEXT_PUBLIC_`.
  - Endpoints: `POST /api/auth/magic` (login/signup/invite), `POST /api/auth/invite`, `POST /api/auth/accept-invite`, `POST /api/auth/confirm` (confirma y crea sesión), `GET /auth/confirm` (página que confirma por POST), `GET /auth/invite` (pantalla para invitado: si está logueado acepta directo, si no pide email).
- **Alta por invitación (Opción B)**: **IMPLEMENTADO** — el admin genera un **enlace de invitación** (grupo + rol, válido 7 días) y lo comparte por WhatsApp. El invitado lo abre, pone su email, recibe un magic link y queda dentro del grupo con el rol del enlace.
- **Múltiples administradores por grupo**: **IMPLEMENTADO** — roles por membresía (`group_members.role` = `admin`|`player`). El creador queda como dueño (`groups.admin_id`) y su membresía es `admin`. El dueño (o el super admin) puede promover/demover admins desde Jugadores (pantalla `members`); el dueño no se puede demover. Acción de auditoría: `change_role`.
- **Código de grupo**: cada grupo tiene un `code` único (6 chars) para unirse. Un usuario se une a un grupo con el código (rol jugador, página `/groups/join`) o con el enlace de invitación por WhatsApp (rol según el enlace). **IMPLEMENTADO**.
- **Crear grupo**: cualquier usuario puede crear un grupo y queda como administrador de él. **IMPLEMENTADO**.
- **Permisos de edición de marcadores**: **PENDIENTE**.
  - Quedada **abierta**: admins + dueño + super admin pueden registrar/editar.
  - Quedada **cerrada**: SOLO el super admin puede editar (al cerrarse se "congelan" los marcadores).
  - Temporada **cerrada**: solo lectura para todos.

### Pendientes generales

- **Seguridad**: el `sb_secret_`/service_role nunca debe ir al navegador. Si alguna llave de servicio se llegó a exponer, rotarla en Supabase.
- **RLS cerrada**: las políticas permisivas se eliminaron; la llave anon no accede a nada. El acceso pasa por las API routes con `SUPABASE_SERVICE_KEY`.
- **Sesiones y rate limit**: **IMPLEMENTADO** — sesiones revocables (hash en `sessions`, expiración 30 días) y `checkRateLimit()` (tabla `rate_limits`).
- **PWA**: `handle_links: "auto"` + `scope` en `public/manifest.webmanifest` (Android/Chrome abre la app instalada con enlaces del dominio; iOS no soporta link-capture en PWA).
- **Auditoría por app**: se inserta desde el cliente; si se requiere integridad fuerte, mover a triggers/función RPC de Supabase.
- **Modo sets**: la UI ya no usa `max_sets`/`sets_details`; quedan en el esquema como legado.
- **`AGENTS.md`**: mantener actualizado al cambiar rutas, lógica de ranking o seguridad.

## Validaciones frecuentes

- Tras refactors de rutas: confirmar que las flechas de volver apunten al grupo correcto (revisar `href` en el HTML servido).
- Tras cambios de marcador: probar registrar + editar resultado y que el ranking de la temporada se actualice.
- Verificar que ningún archivo con credenciales (`.env.local`, llaves) quede versionado: `git ls-files | grep -iE "\.env|\.pem|secret"`.
