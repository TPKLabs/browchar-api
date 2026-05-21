# REST API Conventions

Status: Draft  
Scope: Backend API  
Last updated: 2026-05-20

---

## Objetivo

Definir convenciones REST para mantener la API del RPG Character Manager consistente, predecible y fácil de consumir desde el frontend.

Estas convenciones aplican a todos los endpoints del backend, empezando por el MVP basado en Apocalypse World.

---

## Base URL

Todos los endpoints de la API deben estar bajo el prefijo:

```text```
/api/v1
```text```


## Fechas

Todas las fechas deben devolverse en formato ISO 8601.

Ejemplo:

{
  "createdAt": "2026-05-20T15:30:00.000Z"
}

Las fechas se devuelven en UTC.

## Success responses
### Single resource

Para recursos individuales, la API devuelve directamente el objeto.
### List responses

Para listados, la API debe devolver un objeto con data y meta.

Ejemplo:

{
  "data": [
    {
      "id": "clx123",
      "name": "Raven",
      "gameId": "game_aw",
      "playbookId": "playbook_battlebabe"
    }
  ],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 1,
    "totalPages": 1
  }
}
## Validación de requests

Los endpoints deben validar el body, params y query params antes de ejecutar lógica de negocio.

### Convenciones:

Rechazar campos no esperados.
Requerir campos obligatorios.
Validar tipos de datos.
Validar strings vacíos.
Validar IDs requeridos.
Validar reglas mínimas de dominio.

## Auth

Los endpoints públicos y privados deben definirse explícitamente.

Cuando Auth esté implementado, los endpoints protegidos deberán recibir JWT mediante:

`Authorization: Bearer <token>`

Si un endpoint requiere autenticación y el token no existe o es inválido, debe responder:

`401 Unauthorized`

Si el usuario está autenticado pero no puede acceder al recurso, debe responder:

`403 Forbidden`

Para recursos privados de usuario, se puede devolver 404 Not Found cuando se quiera evitar revelar que un recurso existe pero pertenece a otro usuario.

## Documentation

Cada módulo nuevo de API debería documentar:

rutas disponibles;
request body esperado;
response body esperado;
errores relevantes;
reglas de dominio importantes.

## Filtering

Los filtros deben expresarse como query params.

Ejemplos:

GET /characters?playbookId=clx123
GET /characters?gameId=clx456
GET /characters?search=raven

## Character draft conventions

La generación con IA no debe guardar automáticamente un personaje.

La API debe tratar el resultado de IA como un draft editable.

### Ruta sugerida:

POST /api/v1/character-drafts

El endpoint genera una propuesta estructurada a partir de un playbook, pero el usuario debe confirmar o editar el resultado antes de persistirlo como Character.

### Flujo esperado:

POST /character-drafts   -> genera draft, no persiste Character
POST /characters         -> persiste Character confirmado por el usuario