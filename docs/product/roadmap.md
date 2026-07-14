# Roadmap por releases — RPG Character Manager

Last updated: 2026-07-13

> Ordena en el tiempo lo que hoy son features sueltas fuera de alcance del MVP, agrupándolas
> en releases. El **orden relativo** entre features sale de
> [`prioritization.md`](./prioritization.md); este doc arma el agrupamiento en R1/R2/R3.
> No promete fechas: solo secuencia y dependencias.

---

## R1 (actual) — MVP Apocalypse World

**Objetivo:** crear, listar y consultar personajes de AW, con draft opcional por IA, sin
auth real.

Incluye (ver `mvp.md` §"Alcance funcional"):

- Crear / listar / ver detalle de personaje a partir de un playbook de AW.
- Draft de personaje con IA, editable antes de guardar.
- Playbooks de AW cargados por seed; persistencia en base.

**Estado:** en curso. Sin ownership real por usuario (versión local/demo).

---

## R2 — Auth real y ownership

**Objetivo:** que cada usuario tenga sus propios personajes, con login y ownership.

**Depende de:** DEV-5 / DEV-83 (Auth BE), DEV-64 (validación de acceso en detalle),
DEV-109 (ownership de datos por usuario).

**Por qué va segundo:** es la feature con mayor RICE en `prioritization.md` (5.0) y
desbloquea todo lo multiusuario; además el onboarding ya está pensado para sumarle un login
adelante sin rediseño ([`onboarding.md`](./onboarding.md)).

---

## R3 — Expansión: más juegos / campañas

**Objetivo:** salir de "solo Apocalypse World" y/o habilitar campañas.

**Contenido (a secuenciar con `prioritization.md`):**

- **Soporte multi-juego** (RICE 3.0) + **CRUD administrativo de playbooks** (2.4) como
  habilitador — el orden sugiere hacer multi-juego antes que campañas.
- **Campañas y asociación de personajes** (1.4) — mayor esfuerzo, y sirve más al GM, que
  está fuera del foco de personas actual ([`personas.md`](./personas.md)).

**Depende de:** modelo de datos ya multi-juego (existe), más el CRUD de playbooks.

---

## Más adelante (sin release asignado)

Del orden de `prioritization.md`, quedan como "cuando toque": historial de cambios del
personaje (1.2) y versionado avanzado de playbooks (1.0).

---

## Consistencia

Este roadmap usa el **mismo orden relativo** que `prioritization.md`. Si hay conflicto entre
ambos, se resuelve explícitamente y se anota cuál manda.

---

## Referencias

- [`mvp.md`](./mvp.md) — alcance de R1.
- [`prioritization.md`](./prioritization.md) — orden relativo de features.
- [`personas.md`](./personas.md) — a quién sirve cada release.
