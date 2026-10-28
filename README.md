# BreachParty

Juego de fiesta multijugador en tiempo real estilo *Quiplash* (Jackbox) para un after office virtual de un equipo de **Seguridad de la Información y Protección de Datos Personales**.

Dos vistas sincronizadas:

- **`/host`** — pantalla compartida (Teams, 16:9). Código de sala, QR, jugadores, temporizadores, duelos anónimos con votación en vivo, revelaciones y podio.
- **`/play`** — terminal mobile-first para el móvil de cada jugador. Alias, 2 prompts por ronda y votos.

## Stack

Astro 7 (islas de React con `client:only`), React 19, TypeScript `strict` sin `any`, Tailwind CSS 4, Zustand, `@supabase/supabase-js` usando **solo Realtime Broadcast + Presence** (sin tablas, sin SQL), `lucide-react`, QR generado con `qrcode`, audio sintetizado con Web Audio API.

## Requisitos

- **Node.js ≥ 22.23.4** (Astro 7 no arranca en versiones anteriores). En macOS con Homebrew: `brew install node` y asegúrate de que `node -v` use ese binario.
- **pnpm** (o npm/yarn).
- Un proyecto de Supabase (gratis alcanza).

## Configuración

1. Instala dependencias:

   ```bash
   pnpm install
   ```

2. Crea un proyecto en [supabase.com](https://supabase.com) y copia **Project URL** y **anon public key** desde *Project Settings → API*.

3. Crea tu `.env` a partir del ejemplo:

   ```bash
   cp .env.example .env
   ```

   ```dotenv
   PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
   PUBLIC_SUPABASE_ANON_KEY=tu-anon-key
   # Opcional, para que el QR funcione desde móviles en tu LAN o dominio público
   PUBLIC_PLAY_ORIGIN=
   ```

   No hay que crear tablas ni ejecutar migraciones: Broadcast y Presence no las usan. Realtime viene habilitado por defecto en proyectos nuevos.

4. Arranca en desarrollo:

   ```bash
   pnpm dev
   ```

   `server.host` está activo, así que Astro imprime también la URL de red (por ejemplo `http://192.168.1.20:4321`). Para que los QR de los móviles apunten ahí, define `PUBLIC_PLAY_ORIGIN` con esa URL.

## Jugar

1. Abre `/host` en la laptop, comparte la ventana o pestaña en Teams y ponla en pantalla completa (16:9).
2. Los jugadores abren `/play` o escanean el QR, escriben el código de 4 letras y su alias.
3. Con **mínimo 3 jugadores conectados**, el host pulsa *Iniciar partida*.
4. Cada jugador recibe **2 prompts distintos** (duelos 1v1 ocultos) y tiene **60s** para responder.
5. Por cada duelo: **20s** de votación de los demás jugadores y **8s** de revelación con autor, porcentaje y puntos.
6. Tras cada ronda se muestra la tabla parcial (**LEADERBOARD**); al terminar las 2 rondas, el **PODIUM** con los 3 primeros y menciones honoríficas.

### Puntaje

| Concepto | Puntos |
| --- | --- |
| Voto recibido | +100 |
| **Ciber-Plash** (100% de los votos del duelo) | +250 extra |

Los autores de un duelo no votan en su propio duelo. Si el reloj termina y alguien no respondió, el host autocompleta su respuesta con una frase de reserva para que la partida nunca se bloquee.

## Scripts

```bash
pnpm dev      # servidor de desarrollo
pnpm build    # build estático en dist/
pnpm preview  # sirve dist/
pnpm check    # astro check (TypeScript + .astro)
pnpm test     # vitest: 20 pruebas del motor de juego
pnpm test:realtime  # E2E de Broadcast + Presence contra tu proyecto (.env)
```

`pnpm test:realtime` abre dos clientes en un canal temporal, verifica Presence entre ambos y el ida/vuelta de `state` y `submit-answer`. Es la forma más rápida de confirmar que tu URL y tu publishable key funcionan antes de abrir `/host`.

## Arquitectura

```text
Host autoritativo (/host)                      Jugadores (/play)
─────────────────────────                      ─────────────────
HostState en memoria                           Sin estado de juego propio
  ├─ reloj y transiciones                        ├─ recibe PlayerView por Broadcast
  ├─ emparejamiento y respuestas                 ├─ recibe PlayerSync dirigido
  ├─ votos y puntajes                            └─ emite SUBMIT_ANSWER / CAST_VOTE
  └─ proyección pública (PlayerView)
```

- **Canales**: un canal `breachparty:<CÓDIGO>` por sala. Host y jugadores se registran en **Presence**; el host reconstruye el roster desde `presenceState` y conserva puntajes al reconectar.
- **Broadcast**: `state` (vista pública), `player-sync` (prompts asignados y confirmaciones, filtrado por `playerId`), `host-hello` (latido), `submit-answer` y `cast-vote` (jugador → host).
- **Reloj**: el host publica `endsAt` y `sentAt`. Cada móvil calcula una sola vez el desfase de reloj y cuenta localmente, sin acumular drift.
- **Reconexión**: el jugador guarda su sesión (`playerId`, alias y sala) en `sessionStorage`. Al recargar, vuelve a entrar con el mismo `playerId`: el host lo reconoce, conserva su puntaje y responde a `player-hello` con su asignación y el estado actual, así que cae en la misma pantalla (prompts ya enviados, voto registrado) en menos de un segundo. Si no vuelve, el host lo marca desconectado y la partida sigue: sus respuestas faltantes se autocompletan al vencer el reloj y no cuenta como votante.
  - Recargar la pestaña (F5) conserva la identidad. **Cerrar la pestaña y volver a abrirla crea un jugador nuevo**: `sessionStorage` muere con la pestaña. Para eso existe el botón de salir y volver a entrar con el mismo alias, aunque el puntaje no se recupera.
  - Recargar `/host` sí pierde la partida: el estado vive en su memoria. Los móviles quedan en “Buscando al host” hasta que se abra una sala nueva.
- **Sin tablas**: todo el estado es efímero y vive en la memoria del host. Recargar `/host` reinicia la partida.

### Mapa de archivos

```text
src/
├── components/
│   ├── ui/        Button, Card, Badge, Input, Modal, TimerBar, Avatar, QrCode
│   ├── host/      HostContainer, LobbyScreen, PromptWritingScreen,
│   │              MatchupVotingScreen, RevealScreen, RoundScoreScreen, PodiumScreen,
│   │              HostHeader, PlayerRoster
│   └── player/    PlayerContainer, PlayerPhaseView, JoinRoomForm, WaitingScreen,
│                  AnswerInputScreen, VoteButtonsScreen, PlayerResultScreen, PlayerHeader
├── data/          infosecPrompts.ts (30 prompts + respuestas de reserva)
├── hooks/         useHostEngine (máquina pura + canal), usePlayerClient,
│                  useSoundEffects, useCountdown
├── lib/           supabase.ts, roomCode.ts, realtime/{channel,protocol,view,matchupUtils}.ts
├── stores/        gameStore.ts (Zustand)
├── types/         game.ts (contratos primero)
├── styles/        global.css (tokens Tailwind + animaciones)
├── layouts/       MainLayout.astro
└── pages/         index.astro, host.astro, play.astro
```

## Límites conocidos (por diseño)

- **Sin autenticación**: cualquiera con la URL y la anon key puede unirse al canal público. El anonimato de las respuestas es de facto, no criptográfico. No introduzcas datos personales reales en las respuestas.
- **Estado efímero**: si el host recarga o pierde la pestaña, se pierde la partida. Es una decisión del brief (sin base de datos).
- **Un host por sala**: otro host con el mismo código competiría por la autoridad. La regeneración de código existe para evitarlo.
- **Variables `PUBLIC_*`**: se inlinean en el build estático. Si cambias `.env`, hay que reconstruir (`pnpm build`).

## Contenido

30 prompts de Seguridad de la Información y Protección de Datos Personales en `src/data/infosecPrompts.ts`, incluyendo phishing, derechos ARCO, políticas de cumplimiento, post-its con contraseñas y carpetas compartidas de 2018. Todo ficción de oficina: sin datos reales.
