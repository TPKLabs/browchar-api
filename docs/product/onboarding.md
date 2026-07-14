# Onboarding de usuario — RPG Character Manager

Scope: MVP (sin auth, uso local/demo)
Last updated: 2026-07-13

> Define qué ve y qué hace un usuario **la primera vez** que entra a la app. Dado que el MVP
> no tiene auth (`mvp.md` §"Supuestos técnicos": versión local/dev sin ownership real), el
> onboarding de esta etapa es simple: primera pantalla → listado (vacío o con seed) → primer
> personaje creado. Se mantiene deliberadamente básico.

---

## Flujo de primer uso

1. **Landing / primera pantalla.** Al entrar, el usuario cae en el listado de personajes
   (`src/app/page.tsx`). No hay login ni pantalla intermedia.

2. **Listado vacío con CTA.** Si no hay personajes, se muestra un **estado vacío** con un
   mensaje breve ("Todavía no tenés personajes") y un CTA claro a **"Crear personaje"** —
   no una tabla en blanco. Este es el momento clave del onboarding.

3. **Camino sugerido.**
   - (Opcional) Ver los playbooks disponibles (`src/app/playbooks/page.tsx`) para entender
     qué se puede crear.
   - Crear el primer personaje: elegir playbook → completar el formulario **o** generar un
     draft con IA (cuando esté disponible, DEV-133).
   - Ver el resultado en el detalle y de vuelta en el listado, que ya deja de estar vacío.

El "aha moment" es tener el primer personaje guardado y visible en el listado.

---

## Qué pasa cuando exista auth real (DEV-5)

Cuando se implemente auth/ownership (R2 del [`roadmap.md`](./roadmap.md)):

- Se **agrega** un paso de registro/login **antes** del listado; el resto del flujo no
  cambia.
- El listado pasa a mostrar solo los personajes del usuario autenticado (ownership,
  DEV-64/DEV-109), en vez del set local/demo.
- El estado vacío y el CTA a "crear personaje" siguen siendo válidos tal cual.

Es decir: auth agrega una puerta de entrada, no rediseña el onboarding.

---

## Fuera de alcance (mantenerlo simple)

- Sin tours guiados interactivos ni tooltips paso a paso.
- Sin tutoriales in-app complejos.
- Sin videos ni checklist de onboarding.

El diseño es **implementable directamente** sobre lo que ya existe en `browchar-fe`
(listado de characters y formulario de creación) sin rediseñar esas pantallas: solo requiere
un empty state con CTA.

---

## Referencias

- [`mvp.md`](./mvp.md) — flujo principal y supuesto de "sin auth = local/demo".
- [`personas.md`](./personas.md) — Tomás (jugador nuevo) es el principal beneficiario de un
  buen onboarding.
- Componentes: `browchar-fe/src/app/page.tsx`, `src/app/playbooks/page.tsx`.
