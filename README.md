# PolluxPadel

PWA de **Pádel Americano**: grupos de jugadores, temporadas, quedadas y ranking en vivo.
Mobile-first (Next.js 14 + TypeScript + Tailwind CSS + Supabase), instalable y desplegada en Vercel.

## Modelo de datos

- **Usuarios**: identidad única (`users`). `users.role` solo distingue al `super_admin` (control global); el resto son jugadores.
- **Grupos**: cada grupo tiene un **código único** para unirse. Al crear un grupo quedas como su **administrador**.
- **Roles por grupo**: `group_members.role` = `admin` | `player`. Un usuario puede ser **admin en un grupo y jugador en otro**.
- **Temporadas**: una sola activa por grupo. Al cerrarla se calcula el ganador y queda en solo lectura.
- **Quedadas** (jornadas) dentro de una temporada: canchas, duración, formato (puntos o set único) y participantes.
- **Partidos**: round-robin automático (cada jugador hace pareja con todos y se enfrenta a todos), distribuidos en rondas según canchas.
- **Ranking** por temporada: 2 puntos por partido ganado en modo puntos, 1 punto en modo set; el marcador suma a la diferencia como desempate.
- **Auditoría** (`audit_log`): trazabilidad de quién crea grupos, usuarios, temporadas, quedadas y partidos.

## Acceso

- **Auth por magic link** (sin contraseñas): el usuario pide un enlace con su email, lo abre y queda logueado (15 min, un solo uso).
- **Usuario 0** (`superadmin`): se crea automáticamente con `SUPER_ADMIN_PIN`/`SUPER_ADMIN_EMAIL`; tiene el panel `/admin` (control global). El PIN de acceso es solo un respaldo temporal.
- **Registro**: cualquier persona crea su cuenta con su email y un magic link de confirmación.
- **Invitaciones por WhatsApp**: un admin genera un **enlace de invitación** (rol jugador/administrador, válido 7 días) y lo comparte. Al abrirlo, el invitado pone su email, recibe un magic link y queda dentro del grupo.
- **Unirse con código**: cualquier usuario entra el **código del grupo** (página `/groups/join`) y se une como jugador.
- **Privacidad**: cada usuario decide si **aparecer en el listado de jugadores** (para que lo agreguen a grupos) o no; si lo desactiva, solo entra por código/invitación.

## Permisos

- **Super admin**: control global (panel `/admin`).
- **Admin de grupo** (dueño u otro admin de ese grupo): crear temporada y quedada, administrar jugadores, generar enlaces de invitación y registrar marcadores.
- **Jugador**: ver su puesto, sus grupos y editar sus datos personales.

## Formatos de juego

- **Puntos**: primero en llegar a la meta (21/31/50) con 2 de ventaja.
- **Set único sin fin**: un solo set corrido durante el tiempo de la ronda; gana la pareja con más puntos. No hay "al mejor de N".

## Flujo en la app

1. Login o registro por correo (magic link).
2. Inicio: tus grupos, su código y su temporada en curso. Botones para **crear grupo** o **unirte con código**.
3. Grupo: clasificación (con tu puesto), enlace directo a la quedada activa y (si eres admin) crear temporada/quedada y administrar jugadores.
4. Quedada: una ronda por pantalla con navegación (‹ › y chips). El admin registra cada partido **inline** (marcador con − / +) y puede editar resultados ya registrados.
5. Finalizar la quedada suma los puntos al ranking de la temporada.
6. Cerrar la temporada → ganador calculado, solo lectura.

## Setup local

```bash
npm install
# 1) Crea un proyecto en Supabase y pega supabase/schema.sql en el SQL editor.
# 2) Crea las variables de entorno:
cp .env.local.example .env.local
#    Completa:
#    - NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY
#    - SUPER_ADMIN_PIN, SUPER_ADMIN_EMAIL
#    - APP_URL (http://localhost:3000 en local)
#    - SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, EMAIL_FROM (SMTP de OCI Email Delivery)
npm run dev   # http://localhost:3000
```

Primer acceso: pide el magic link para `SUPER_ADMIN_EMAIL`, o entra con PIN `superadmin` / `SUPER_ADMIN_PIN`.

## Deploy (Vercel)

La app está desplegada en **https://ppadel.polluxdata.com**. Importa el repo en Vercel y añade las mismas variables de entorno (Settings → Environment Variables), con `APP_URL` apuntando al dominio de producción. La PWA es instalable desde el navegador del teléfono.

## Estructura

```
src/
  app/
    login/ register/ auth/confirm/ auth/invite/ admin/ profile/
    groups/join/                 # unirse con el código del grupo
    groups/new/                  # crear grupo (quedas como admin)
    groups/[id]/                 # Grupo (server wrapper + GroupClient)
      members/                   # administrar jugadores + enlaces de invitación
      seasons/new/  seasons/[seasonId]/   # crear y ver temporada (clasificación, cerrar)
      quedadas/new/  quedadas/[qid]/      # crear quedada y marcador por rondas
    api/auth/                    # magic, invite, accept-invite, confirm, login, session, logout, bootstrap
  components/                    # AppHeader, MatchCard, MatchScorer, StandingsTable
  lib/
    matchmaking.ts               # round-robin (parejas + rivales)
    points.ts                    # ranking por temporada
    session.tsx                  # sesión (SessionProvider) y helpers de rol
    groupRoles.ts                # isGroupAdmin + códigos de grupo
    magic.ts / mail.ts           # tokens de enlace y envío SMTP (nodemailer)
    audit.ts                     # trazabilidad
    supabase/                    # clientes (browser y server)
supabase/schema.sql              # esquema SQL + RLS
```

## Seguridad

- Las credenciales reales van en variables de entorno (`.env.local`, gitignoreado); solo se versiona `.env.local.example` como plantilla.
- Claves de servidor (`service_role`/`sb_secret_`) y credenciales SMTP nunca van al navegador ni se versionan; se usan solo en endpoints del servidor vía variables de entorno.
- El esquema y las políticas RLS de Supabase están en `supabase/schema.sql`.

