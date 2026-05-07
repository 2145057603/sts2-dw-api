# API Contract

## Base URL

All application endpoints use `/api/v1`.

## Authentication

Authenticated requests use:

```http
Authorization: Bearer <accessToken>
```

## Success Envelope

```json
{
  "ok": true,
  "data": {},
  "message": "optional human-readable message"
}
```

## Error Envelope

```json
{
  "ok": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable message",
    "fields": {
      "email": "Invalid email"
    }
  }
}
```

## Pagination

List endpoints accept `page` and `pageSize`. Responses include:

```json
{
  "items": [],
  "page": 1,
  "pageSize": 20,
  "total": 0,
  "totalPages": 1
}
```

## Dates

All dates are ISO 8601 strings.

## Roles

User roles are `user`, `author`, and `admin`. The frontend may treat users as administrators only when the backend returns `role: "admin"` or an equivalent explicit admin flag.

## Common Error Codes

- `VALIDATION_ERROR`
- `UNAUTHORIZED`
- `FORBIDDEN`
- `NOT_FOUND`
- `CONFLICT`
- `RATE_LIMITED`
- `NOT_IMPLEMENTED`
- `INTERNAL_SERVER_ERROR`

## Compatibility

The preferred route prefix is `/api/v1`. Compatibility aliases may be provided for current frontend routes such as `/api/auth/login` during migration.
