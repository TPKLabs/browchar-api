# Priorización de features post-MVP

Scope: features listadas como "Fuera de alcance" en `mvp.md`
Last updated: 2026-07-13

> Ordena entre sí las features **futuras** (las que `mvp.md` deja fuera de alcance) con un
> criterio explícito, en vez de por intuición u orden de aparición. El resultado alimenta el
> orden del [`roadmap.md`](./roadmap.md).

---

## Criterio elegido: RICE (simplificado)

Se elige **RICE** por sobre MoSCoW porque produce un **ranking comparable** (un número por
feature) que se traduce directo en la secuencia del roadmap (R2, R3…). MoSCoW agrupa en
must/should/could pero no ordena dentro de cada grupo, que es justo lo que necesitamos para
decidir "qué va primero después del MVP".

RICE = (Reach × Impact × Confidence) / Effort. Escalas simplificadas para un proyecto de
un dev:

- **Reach** — cuántos usuarios/casos toca (1 bajo, 3 medio, 5 alto).
- **Impact** — cuánto mueve la aguja del producto (1 / 2 / 3).
- **Confidence** — qué tan seguros estamos (0.5 / 0.8 / 1.0).
- **Effort** — semanas-persona aproximadas (número).

Los valores son estimaciones relativas, no absolutas; sirven para ordenar, no para prometer.

---

## Matriz

| Feature                              | Reach | Impact | Conf. | Effort | RICE | Justificación (1 línea)                                                                             |
| ------------------------------------ | ----- | ------ | ----- | ------ | ---- | --------------------------------------------------------------------------------------------------- |
| Auth real y ownership por usuario    | 5     | 3      | 1.0   | 3      | 5.0  | Desbloquea multiusuario real; hoy todo es local/demo sin dueño.                                     |
| Soporte multi-juego (más allá de AW) | 5     | 3      | 0.8   | 4      | 3.0  | Amplía el mercado, pero el modelo ya está preparado: es sobre todo data + validación.               |
| CRUD administrativo de playbooks     | 3     | 2      | 0.8   | 2      | 2.4  | Permite cargar/editar playbooks sin seed manual; habilita multi-juego.                              |
| Campañas y asociación de personajes  | 3     | 3      | 0.8   | 5      | 1.4  | Alto valor para grupos/GM, pero es una feature grande y fuera del foco actual (jugador individual). |
| Versionado avanzado de playbooks     | 3     | 2      | 0.5   | 3      | 1.0  | El versionado simple ya existe; lo "avanzado" (migración/diff) es complejo y de valor incierto.     |
| Historial de cambios del personaje   | 3     | 1      | 0.8   | 2      | 1.2  | Nice-to-have; no bloquea ningún journey principal.                                                  |

_(RICE redondeado a un decimal.)_

---

## Orden resultante

1. **Auth real y ownership** (5.0)
2. **Soporte multi-juego** (3.0)
3. **CRUD administrativo de playbooks** (2.4) — habilitador de multi-juego
4. **Campañas** (1.4)
5. **Historial de cambios** (1.2)
6. **Versionado avanzado de playbooks** (1.0)

Este orden debe coincidir con [`roadmap.md`](./roadmap.md). Si aparece un conflicto entre
ambos docs, se resuelve explícitamente **acá** (prioridad) o en el roadmap (secuencia), y se
deja anotado cuál manda.

---

## Referencias

- [`mvp.md` §"Fuera de alcance del MVP"](./mvp.md#fuera-de-alcance-del-mvp) — universo de features.
- [`roadmap.md`](./roadmap.md) — agrupamiento en releases.
