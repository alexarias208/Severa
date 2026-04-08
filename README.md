# Severa – Deploy para Vercel

Contenido para subir a un repositorio y desplegar en Vercel.

- **public/** – App modo persona (index, css, js, assets, data). Origen: carpeta `personal/` del proyecto.
- **vercel.json** – Configuración de rutas y headers para Vercel.

En Vercel: configura **Root Directory** = `github` y **Output Directory** = `public` (o apunta el proyecto a la carpeta `github` y publica desde `public`).

## Qué se publica

- **Landing**: `/index.html` con links a **Persona** y **Trabajo** (mismo origen).
- **Modo Persona**: `/personal/index.html` (SPA estática por hash `#...`).
- **Modo Trabajo**: `/trabajo/index.html`.

`vercel.json` incluye fallback para:

- `/personal/*` → `/personal/index.html`
- `/trabajo/*` → `/trabajo/index.html`
- todo lo demás → `/index.html`

## Cómo actualizar `public/`

Sin build: es un espejo de archivos estáticos.

Desde la raíz del proyecto, sincroniza:

- `personal/**` → `github/public/personal/**`
- `trabajo/**` → `github/public/trabajo/**`

## Config Vercel (estático, sin build)

Configuración recomendada:

- **Root Directory**: `github`
- **Output Directory**: `public`
- **Build Command**: None

Por qué evita el `404: NOT_FOUND`:

- `github/public/index.html` existe (ruta `/` siempre resuelve).
- `github/public/personal/index.html` y `github/public/trabajo/index.html` existen (rutas directas sin rewrites globales).
- Los assets compartidos desde Trabajo apuntan a rutas **absolutas** (`/personal/css/...`, `/personal/js/...`) y no dependen de `../`.

## Checklist post-deploy (rápida)

- [ ] Abrir home y recargar (F5) sin 404
- [ ] Login / sesión (si aplica) funciona
- [ ] Abrir `/personal/index.html#calendar`
- [ ] Crear una sesión en `/trabajo/index.html` y luego, en Persona, activar “Mostrar fechas de Modo Trabajo” y verificar que aparecen (solo lectura)
- [ ] Navegar un módulo clave en Persona (finanzas o dashboard)
