# PDPadel

PWA de **Pádel Americano**: grupos de jugadores, temporadas, quedadas y ranking en vivo.
Mobile-first (Next.js 14 + TypeScript + Tailwind CSS + Supabase), instalable y lista para Vercel.

## Modelo de datos

- **Usuarios** con roles: `super_admin` (usuario 0), `admin` (administrador de grupo), `player` (jugador).
- **Grupos** de jugadores; cada grupo tiene un administrador.
- **Temporadas**: una sola activa por grupo. Al cerrarla se calcula el ganador y queda en solo lectura.
- **Quedadas** (jornadas) dentro de una temporada: canchas, duración, formato (puntos o set único) y participantes.
- **Partidos**: round-robin automático (cada jugador hace pareja con todos y se enfrenta a todos), distribuidos en rondas según canchas.
- **Ranking** por temporada: 2 puntos por partido ganado en modo puntos, 1 punto en modo set; el marcador suma a la diferencia como desempate.
- **Auditoría** (`audit_log`): trazabilidad de quién crea grupos, usuarios, temporadas, quedadas y partidos.

## Formatos de juego

- **Puntos**: primero en llegar a la meta (21/31/50) con 2 de ventaja.
- **Set único sin fin**: se juega un solo set corrido durante el tiempo de la ronda; gana la pareja con más puntos. No hay "al mejor de N".

## Acceso y roles

- El **usuario 0** (`superadmin`) se crea automáticamente al primer arranque con `SUPER_ADMIN_PIN`.
- Nuevos usuarios se registran con un **token diario** del superadmin (se regenera cada día) o con un **PIN** emitido por el superadmin o el admin del grupo (rol jugador o administrador; si es PIN de grupo, el usuario entra al grupo automáticamente).
- **Super admin**: panel `/admin` con token diario, generación de PINs, listado de grupos y usuarios.
- **Admin de grupo**: crear/cerrar grupo y temporada, administrar jugadores, generar PINs, crear quedadas y registrar marcadores.
- **Jugador**: ver su puesto en el ranking y editar sus datos personales (nombre, apellido, apodo, email, PIN).

## Flujo en la app

1. Login o registro (PIN/token).
2. Inicio: tus grupos y su temporada en curso.
3. Grupo: clasificación, enlace directo a la quedada activa y (si eres admin) crear temporada/quedada y administrar jugadores.
4. Quedada: una ronda por pantalla con navegación (‹ › y chips). El admin registra cada partido inline (marcador con − / +), sin salir de la pantalla, y puede editar resultados ya registrados.
5. Finalizar la quedada suma los puntos al ranking de la temporada.
6. Cerrar la temporada → ganador calculado, solo lectura.

## Setup local

```bash
npm install
# 1) Crea un proyecto en Supabase y pega supabase/schema.sql en el SQL editor.
# 2) Crea las variables de entorno:
cp .env.local.example .env.local
#    Completa: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY,
#    SUPER_ADMIN_PIN, APP_TOKEN_SECRET
npm run dev   # http://localhost:3000
```

Primer acceso: usuario `superadmin` + `SUPER_ADMIN_PIN` (por defecto `0000`). **Cambia el PIN del superadmin** (Perfil → Cambiar PIN) y el `APP_TOKEN_SECRET` antes de producción.

## Deploy (Vercel)

Importa el repo en Vercel y añade las mismas variables de entorno (Settings → Environment Variables). La PWA es instalable desde el navegador del teléfono.

## Estructura

```
src/
  app/
    login/ register/ admin/ profile/
    api/auth/                  # bootstrap, login, register, session, logout, token, pins
    groups/[id]/               # Grupo (server wrapper + GroupClient)
      members/                 # administrar jugadores + generar PINs
      seasons/new/  seasons/[seasonId]/   # crear y ver temporada (clasificación, cerrar)
      quedadas/new/  quedadas/[qid]/      # crear quedada y marcador por rondas
  components/                  # AppHeader, MatchCard, MatchScorer, StandingsTable
  lib/
    matchmaking.ts             # round-robin (parejas + rivales)
    points.ts                  # ranking por temporada
    session.tsx                # sesión y roles
    token.ts                   # token diario + PINs
    audit.ts                   # trazabilidad
    supabase/                  # clientes (browser y server)
supabase/schema.sql            # esquema SQL + RLS
```

## Seguridad

- `.env.local` con credenciales reales está en `.gitignore`; solo se versiona `.env.local.example` (plantilla).
- El `anon key` (publishable) es seguro para el navegador; el `sb_secret_`/service_role nunca debe exponerse.
- RLS en Supabase está abierta a la llave anon: la autorización real la hace la app (sesión por PIN + roles). Para un uso público se debería endurecer RLS.
