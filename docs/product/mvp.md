# MVP — RPG Character Manager

Scope: Apocalypse World  
Last updated: 2026-05-20

## Objetivo del MVP

Construir una primera versión usable del RPG Character Manager que permita crear, listar y consultar personajes de rol a partir de juegos y playbooks existentes.

El MVP busca validar la idea central del producto: facilitar la creación y gestión básica de personajes de RPG, empezando con un alcance reducido y controlado.

Para esta primera versión, el MVP estará limitado a **Apocalypse World**. Otros juegos y sistemas podrán agregarse progresivamente en futuras iteraciones.

---

## Usuario objetivo

Jugadores de rol que quieren crear y guardar personajes de forma más ordenada que usando PDFs, documentos sueltos, notas o planillas.

En esta primera versión, el foco está en jugadores individuales que quieren crear y consultar sus propios personajes.

No se contempla todavía una experiencia completa para Game Masters ni gestión de campañas.

---

## Problema que resuelve

Crear personajes de rol puede ser incómodo cuando la información está distribuida entre PDFs, hojas editables, notas sueltas o planillas.

El MVP busca ofrecer un flujo simple para:

- elegir un playbook de Apocalypse World;
- crear un personaje;
- guardar sus datos principales;
- consultar el personaje después;
- generar opcionalmente un borrador inicial con IA.

---

## Alcance funcional del MVP

El MVP incluye:

- El usuario puede crear personajes.
- El usuario puede listar personajes creados.
- El usuario puede ver el detalle de un personaje.
- El usuario puede crear un borrador rápido de personaje con IA.
- El borrador generado por IA es editable antes de guardarse.
- Los personajes se crean a partir de un playbook existente de Apocalypse World.
- Los playbooks iniciales de Apocalypse World vienen cargados por seed.
- El personaje creado queda persistido en la base de datos.

---

## Alcance de sistema/juego

Para el MVP, el único juego soportado será:

- Apocalypse World

Queda fuera del MVP el soporte funcional completo para otros juegos, aunque el modelo de datos esté pensado para soportarlos en el futuro.

Otros juegos como Dungeons & Dragons, Vampire, Dungeon World, Masks u otros sistemas podrán agregarse progresivamente en próximos releases.

---

## Flujo principal

1. El usuario ingresa a la app.
2. El usuario ve una lista de personajes existentes.
3. El usuario inicia la creación de un nuevo personaje.
4. El usuario selecciona un playbook de Apocalypse World.
5. El usuario completa los datos mínimos del personaje o genera un borrador con IA.
6. Si usa IA, el sistema genera un draft editable.
7. El usuario revisa, edita o descarta el draft.
8. El usuario guarda el personaje.
9. El usuario ve el personaje en el listado.
10. El usuario puede abrir el detalle del personaje.

---

## Alcance de IA para el MVP

La funcionalidad de IA queda limitada a generar un borrador inicial editable de personaje.

Incluye:

- Generar una propuesta de personaje a partir de un playbook de Apocalypse World.
- Devolver datos estructurados que puedan mostrarse en el formulario.
- Permitir que el usuario revise y edite el resultado antes de guardarlo.
- Permitir que el usuario descarte el draft generado.

No incluye:

- Guardar automáticamente personajes generados por IA sin revisión del usuario.
- Chat conversacional con el personaje.
- Generación de imágenes.
- Generación completa de campañas.
- Fine-tuning.
- Memoria persistente de preferencias del usuario.
- Configuración avanzada de tono, estilo o género narrativo.
- Garantía de que el resultado respete todas las reglas del sistema sin validación posterior.

---

## Fuera de alcance del MVP

El MVP no incluye:

- Campañas.
- Asociación de personajes a campañas.
- Soporte funcional completo para juegos distintos de Apocalypse World.
- CRUD administrativo de systems.
- CRUD administrativo de games.
- CRUD administrativo de playbooks.
- Edición avanzada de templates.
- Versionado avanzado de playbooks.
- Migración de personajes entre versiones de playbook.
- Multiplayer o colaboración en tiempo real.
- Permisos avanzados.
- Importación/exportación de hojas de personaje.
- Edición visual avanzada de hojas.
- Historial de cambios del personaje.
- Generación de imágenes de personaje.

---

## Supuestos técnicos

- La app cuenta con datos iniciales de Apocalypse World cargados por seed.
- Los playbooks de Apocalypse World funcionan como fuente inicial para crear personajes.
- El template del playbook define la estructura base para la creación del personaje.
- El backend expone endpoints para crear, listar y consultar personajes.
- La integración con IA se implementa como generación de draft, no como creación final automática.
- Los datos generados por IA deben validarse antes de persistirse.
- Si Auth no está implementado en esta etapa, el MVP se considera una versión local/de desarrollo sin ownership real por usuario.
- El modelo de datos puede estar preparado para múltiples juegos, pero el producto usable del MVP se limita a Apocalypse World.

---

## Criterios de éxito

El MVP se considera completo cuando:

- Se puede crear un personaje usando un playbook de Apocalypse World.
- Se puede listar personajes creados.
- Se puede abrir el detalle de un personaje.
- Se puede generar un borrador rápido de personaje con IA.
- El draft generado por IA puede editarse antes de guardarse.
- El usuario puede guardar o descartar el draft generado por IA.
- Los datos quedan persistidos en la base de datos.
- El flujo principal funciona de punta a punta sin intervención manual en la base.
- El README o documentación del proyecto explica cómo correr la app y probar el flujo principal.

---

## Qué viene después de R1

Este MVP es el release **R1**. La secuencia de releases siguientes (R2 auth real, R3
multi-juego/campañas) está definida en [`roadmap.md`](./roadmap.md), y el orden relativo de
las features futuras en [`prioritization.md`](./prioritization.md).

## Documentos de producto relacionados

- [`personas.md`](./personas.md) — user personas del MVP.
- [`user-journeys.md`](./user-journeys.md) — journeys secundarios y de error.
- [`prioritization.md`](./prioritization.md) — priorización de features post-MVP (RICE).
- [`onboarding.md`](./onboarding.md) — flujo de primer uso.
- [`beta-feedback.md`](./beta-feedback.md) — canal y triage de feedback beta.
- [`roadmap.md`](./roadmap.md) — releases R1/R2/R3.
