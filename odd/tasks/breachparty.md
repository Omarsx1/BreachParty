# BreachParty — Quiplash-style infosec party game

Objetivo: app multijugador en tiempo real (Astro + React islands + Supabase Realtime Broadcast/Presence) con Host autoritativo en `/host` y cliente móvil en `/play`.
Rama: n/a (el workspace no es un repositorio git todavía). Runner: `pnpm test` (vitest) / `pnpm check` (astro check) / `pnpm build`.

## Specs

S1. Stack estricto: Astro (última estable) con `@astrojs/react`, islas `client:only="react"` en `/host` y `/play`, TypeScript `strict: true` sin `any`, Tailwind CSS, Zustand, `@supabase/supabase-js` usando **solo Realtime Broadcast & Presence** (sin tablas SQL), `lucide-react` para iconografía.
S2. Arquitectura: `src/components/ui/` con átomos reutilizables (`Button`, `Card`, `Badge`, `TimerBar`, `Input`, `Modal`, más `Avatar`, `QrCode`), `src/components/host/`, `src/components/player/`, contratos en `src/types/game.ts`, estado en `src/stores/gameStore.ts`, red en `src/lib/realtime/` + hooks. Ningún componente supera 140 líneas.
S3. Fases exactas en `GamePhase`: `LOBBY`, `WRITING` (60s), `VOTING` (20s por duelo), `REVEAL` (8s por duelo), `LEADERBOARD`, `PODIUM`. Mínimo 3 jugadores para iniciar.
S4. `WRITING`: "El Host asigna 2 prompts distintos a cada jugador (emparejados en duelos 1vs1 ocultos)". Implementación: anillo de jugadores, el prompt `i` es respondido por los jugadores `i` e `i+1`; cada jugador responde 2 prompts y cada duelo expone 2 respuestas anónimas.
S5. `REVEAL`: "se revela de quién era cada respuesta, el porcentaje de votos y se suman puntos (+100 por voto, +250 bonus por 'Ciber-Plash' si obtiene el 100% de los votos)".
S6. Host autoritativo: solo `/host` controla reloj, transiciones de fase y cálculo de puntajes. `/play` recibe estado por Broadcast y emite `SUBMIT_ANSWER` y `CAST_VOTE`.
S7. `src/data/infosecPrompts.ts` con al menos 25 prompts humorísticos de Seguridad de la Información y Protección de Datos Personales, incluyendo literalmente estos 6:
   - "La peor excusa que dio un usuario para explicar por qué hizo clic en un enlace de Phishing evidente."
   - "Lo que realmente piensa el oficial de Protección de Datos cuando un área pide 'un proyectito urgente sin pasar por revisión'."
   - "La contraseña más insegura pero creativa encontrada pegada en un post-it debajo del teclado."
   - "El motivo más absurdo por el que alguien enviaría una solicitud de derechos ARCO a las 11:59 PM de un viernes."
   - "Lo que significa realmente cuando el equipo de Seguridad dice: 'Estamos actualizando las políticas de cumplimiento'."
   - "El hallazgo más perturbador que podrías encontrar auditando una carpeta compartida olvidada desde 2018."
S8. Rutas: `src/pages/index.astro` (selección Crear Sala / Unirse), `src/pages/host.astro`, `src/pages/play.astro`, layout `src/layouts/MainLayout.astro`.
S9. Código de sala de 4 letras y QR con la URL de unión, proyectados en `/host`.
S10. Diseño Cyberpunk/InfoSec moderno: alto contraste, dark nativo, animaciones fluidas, tipografía legible en 16:9 para Teams y mobile-first en `/play`.
S11. `useSoundEffects` con Web Audio API pura (sin archivos externos): tick, victoria, botón, error.
S12. Sin autenticación, sin base de datos persistente, sin rutas extra. `astro check` y `astro build` sin errores de TypeScript.
S13. Reconexión limpia: Presence re-sincroniza jugadores por `playerId`; el host reenvía asignaciones y estado al reconectar; el reloj se calcula contra `endsAt` del host.

## Tasks

| ID | Specs | Ruta | Estado | Evidencia / commit |
|----|-------|------|--------|--------------------|
| T1 | S1, S7 | inline | done | `src/types/game.ts`, `src/data/infosecPrompts.ts` (30 prompts) |
| T2 | S1, S9, S13 | inline | done | `src/lib/supabase.ts`, `src/lib/roomCode.ts`, `src/lib/realtime/*`, `src/stores/gameStore.ts`, `src/hooks/useSoundEffects.ts` |
| T3 | S2, S10 | inline | done | 8 átomos en `src/components/ui/` |
| T4 | S3, S4, S5, S6, S13 | inline | done | `useHostEngine.ts` (máquina pura + hook), `usePlayerClient.ts`, `useCountdown.ts`, `engine.test.ts` (20 pruebas) |
| T5 | S8, S9, S10 | inline | done | `src/components/host/*` |
| T6 | S8, S10 | inline | done | `src/components/player/*` |
| T7 | S8, S11 | inline | done | páginas `.astro`, layout, `global.css`, README |
| T8 | S12 | inline | done | `astro check` 0 errores/0 warnings/0 hints; 20 tests verdes; build estático 3 páginas; smoke HTTP 200; revisión visual en Chrome (1440/768/390) |
| T9 | S9, S13 | inline | done | E2E con 3 jugadores reales automatizados: unión por UI, Presence en roster, 6 respuestas, 3 duelos, reveals, leaderboard, ronda 2 y podio, sin errores de consola |

## Log

L1 (solicitud original, verbatim):

Actúa como un Principal Frontend Architect especializado en Astro, React, TypeScript y arquitecturas en tiempo real orientadas a eventos. Tu objetivo es desarrollar "BreachParty", una aplicación web multijugador en tiempo real estilo Quiplash (Jackbox) diseñada para un After Office virtual (vía Microsoft Teams) de un equipo de Seguridad de la Información y Protección de Datos Personales. La aplicación tiene dos vistas principales sincronizadas en tiempo real: Host View (`/host`) proyectada en pantalla completa en Microsoft Teams (16:9), muestra el código QR/sala, jugadores conectados, temporizadores, duelos de respuestas anónimas, votaciones en vivo y podio final; Player View (`/play`) Mobile-First para smartphones, permite ingresar con código de sala y alias, enviar respuestas ingeniosas a los prompts asignados y votar en los duelos de otros compañeros.

Tech stack estricto: Astro última estable con islas de React (`@astrojs/react`), React con `client:only="react"` en `/host` y `/play`, TypeScript `strict: true` sin `any`, Tailwind CSS (Cyberpunk/InfoSec, alto contraste, dark nativo, animaciones), Zustand o Nanostores, `@supabase/supabase-js` usando exclusivamente Supabase Realtime (Broadcast & Presence) sin tablas SQL para estado efímero, Host autoritativo en memoria, `lucide-react`.

Reglas: SRP con componentes ≤140 líneas; DRY con átomos en `src/components/ui/`; Host autoritativo como única fuente de verdad (reloj, transiciones, puntajes), clientes `/play` reactivos que emiten `SUBMIT_ANSWER` y `CAST_VOTE`; componentes no instancian canales de Supabase, la red vive en `src/lib/realtime/` o hooks dedicados; contratos primero en `src/types/game.ts`; sin autenticación, sin persistencia, sin rutas innecesarias, sin sobreingeniería.

Máquina de estados: LOBBY (código de 4 letras, Presence, mínimo 3 jugadores, el Host inicia), WRITING 60s (2 prompts distintos por jugador, duelos 1vs1 ocultos), VOTING 20s por duelo (prompt + 2 respuestas anónimas, todos los demás votan), REVEAL 8s por duelo (autor, porcentaje, +100 por voto, +250 Ciber-Plash al 100%), LEADERBOARD y PODIUM (3 primeros con títulos honoríficos).

Contenido: al menos 25 prompts de infosec y datos personales con los 6 ejemplos obligatorios citados en S7.

Plan: Paso 1 dependencias + types + prompts; Paso 2 infraestructura (`supabase.ts`, `roomCode.ts`, `gameStore.ts`, `useSoundEffects.ts` con Web Audio puro); Paso 3 átomos UI; Paso 4 hooks realtime con reconexión limpia; Paso 5 componentes host/player; Paso 6 páginas `.astro` y verificación del compilador sin errores. Sin TODOs incompletos.

L2. Decisión de diseño (S4): emparejamiento en anillo determinista (prompt `i` ↔ jugadores `i`, `i+1`). Garantiza 2 prompts por jugador, duelos 1v1 y N duelos para N jugadores, sin estados imposibles.
L3. Decisión (S3/S5): 2 rondas por partida; tras la última revelación de cada ronda se muestra `LEADERBOARD` (10s) y al terminar la última ronda se pasa a `PODIUM`. Ambos estados del enum quedan usados con sentido.
L4. Decisión: las respuestas no enviadas al agotarse el reloj se autocompletan con frases de reserva del host (marcadas `autoFilled`) para que la partida nunca se bloquee.
L5. Decisión: los autores de un duelo no votan en su propio duelo ("todos los demás jugadores"), por lo que la elegibilidad se calcula en el host.
L6. Decisión (S6/S13): la vista pública no incluye respuestas ajenas durante `WRITING`; las asignaciones y confirmaciones de voto se envían en un evento dirigido con guarda por `playerId`. Limitación aceptada: Broadcast sin RLS no es un canal privado; ocultar información es de facto, no criptográfico (el spec prohíbe auth).
L7. Decisión: la lógica pura del motor (`createHostState`, `hostReducer`, `buildMatchups`, `computeMatchupResult`) vive en `src/hooks/useHostEngine.ts` y se prueba con Vitest; el árbol de carpetas solicitado se respeta y solo se añaden archivos exigidos por las propias reglas: `src/lib/realtime/` (regla 4), `src/components/ui/cn.ts` (utilidad DRY), `src/styles/global.css` (convención Astro), `src/hooks/useCountdown.ts` (reloj compartido host/móvil), y las divisiones por SRP: `HostHeader`, `PlayerRoster`, `RevealScreen`, `PlayerHeader`, `PlayerPhaseView` (PlayerContainer tenía 192 líneas).
L8. Verificación T8: `pnpm check` → 46 archivos, 0 errores, 0 warnings, 0 hints. `pnpm test` → 20 pruebas verdes (emparejamiento, puntajes, Ciber-Plash, transiciones, autocompletado, presencia/reconexión). `pnpm build` → 3 páginas estáticas (`/`, `/host`, `/play`) y CSS con tokens de tema. Smoke HTTP 200 en las tres rutas. Revisión visual en Chrome a 1440/768/390 sobre un arnés temporal de fixtures (luego eliminado) que destapó y corrigió: chips de jugador truncados, contador de votos "3 de 2" cuando un votante se desconecta tras votar (la elegibilidad ahora incluye a quien ya votó) y plurales "1 voto".
L9. Entorno: el Node por defecto del equipo (v22.23.2) no cumple el mínimo de Astro 7 (`>=22.23.4`); la verificación se ejecutó con Node v25.9.0 de Homebrew. Queda documentado en README.
L10. Decisión: se añadió `PUBLIC_PLAY_ORIGIN` opcional para que el QR apunte a la IP de LAN o al dominio público cuando el host corre en `localhost`. Requiere rebuild porque las variables `PUBLIC_*` se inlinean.
L11. Se cargó el skill `design-taste-frontend`; su house style prohíbe neones, glows, mono etiquetas y gradientes, exactamente lo que el brief cyberpunk exige. Se aplicó solo lo compatible (legibilidad, márgenes parejos, foco visible, `prefers-reduced-motion`) y se documentó la excepción.
L12. T9 (transporte) verificado el 2026-10-28 contra el proyecto `egixjcmntiwrghozydkg.supabase.co` con la publishable key: dos clientes suscritos al mismo canal, Presence visible en ambos sentidos, `state` recibido del host con `roomCode` y `phase` correctos, `submit-answer` recibido y validado por el host. Queda como `pnpm test:realtime` (opt-in con `REALTIME_E2E=1`). Pendiente únicamente la sesión de 3+ dispositivos sobre la UI.
L13. Se detectó que la Secret Key del proyecto fue compartida en el chat; se instruyó revocarla. La app solo usa la publishable key y `.env` está ignorado por git. `skills-lock.json` y los directorios de herramientas del entorno (`.agents/`, `data/skills/`, `skills/`, etc.) quedaron excluidos del repositorio.
L14. T9 completado: E2E real con Chrome headless y 3 jugadores sobre la UI (sin mocks): `/play` unido por formulario, roster actualizado por Presence, `Iniciar partida`, 6 respuestas enviadas, 3 duelos votados, 3 reveals, leaderboard de ronda 1, ronda 2 con autocompletado por reloj y podio final. Cero errores de consola y de página. El arnés temporal se eliminó y `puppeteer-core` se desinstaló. Hallazgos del arnés (no de la app): `requestAnimationFrame` estrangulado en pestañas de fondo exigió polling por intervalo, e `innerText` devuelve el texto transformado a mayúsculas por CSS, así que las comparaciones deben ser case-insensitive. Único arreglo de producto derivado de la revisión visual: plural de "duelos" en las menciones del podio.
L15. Despliegue: el repo se publicó en `github.com/Omarsx1/BreachParty` (rama `main`, commit `a987a94`) usando SSH porque HTTPS no tenía credenciales en el keychain. Para Vercel no hace falta `PUBLIC_PLAY_ORIGIN`: el QR cae en `window.location.origin` en runtime.
L16. Feedback del usuario: faltaba una explicación del juego en la landing y una forma de terminar la partida antes de tiempo. Se añadió `components/landing/GameExplainer.astro` (qué es + 6 fases) y `ScoringSection.astro` (puntaje + requisitos), con nav de anclas; y la acción `END` del host con confirmación en `HostHeader`, que cierra la partida con los puntajes actuales y lleva al podio. También se corrigió `admitted` para que los jugadores que llegan tarde vean el podio. 23 tests + check + build en verde.
