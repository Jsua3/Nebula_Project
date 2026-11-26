# Catálogo PostgreSQL de Nébula

Astro lee los productos publicados al generar las páginas. Los precios se guardan como pesos colombianos enteros. Las fotografías se mantienen en `src/assets/products` y PostgreSQL guarda el nombre del archivo y su texto alternativo. Tras actualizar el catálogo en PostgreSQL, vuelve a compilar y desplegar el sitio para publicar los cambios.

## PostgreSQL local

Crea una base `nebula` en tu instalación de PostgreSQL. Ejecuta la migración y la carga inicial desde la raíz del repositorio con un rol administrador de esa instancia. Estos comandos usan el puerto estándar, ajústalo al puerto de tu instalación.

```bash
psql -h localhost -p 5432 -U postgres -d nebula -v ON_ERROR_STOP=1 -1 -f supabase/migrations/20261125000000_create_catalog.sql
psql -h localhost -p 5432 -U postgres -d nebula -v ON_ERROR_STOP=1 -1 -f supabase/seed.sql
```

Crea un usuario de lectura para el sitio desde `psql` con `-U postgres -d nebula`. El comando `\password` solicita la contraseña interactivamente.

```sql
create role nebula_builder login;
grant nebula_catalog_reader to nebula_builder;
\password nebula_builder
```

Agrega `DATABASE_URL` a tu `.env` local. Sustituye `CONTRASENA` por el valor codificado para una URI si contiene caracteres reservados.

```dotenv
DATABASE_URL=postgresql://nebula_builder:CONTRASENA@127.0.0.1:5432/nebula
```

El rol `nebula_catalog_reader` puede leer las fichas publicadas. PostgreSQL excluye las fichas ocultas mediante seguridad por filas. La carga inicial agrega los productos que falten y conserva los que ya existan. Para cambios de esquema, agrega una nueva migración y respalda los datos antes de modificar su estructura.

## Supabase

Desde la raíz del repositorio, autentica la CLI de Supabase y enlaza el proyecto. Aplica las migraciones y los cuatro productos iniciales.

```bash
supabase login
supabase link --project-ref REFERENCIA_DEL_PROYECTO
supabase db push --include-seed
```

Crea el rol `nebula_builder` y asígnale `nebula_catalog_reader` con las instrucciones de arriba. Desde **Connect → Session pooler**, copia el host y el puerto del proyecto y usa el usuario `nebula_builder.REFERENCIA_DEL_PROYECTO` con su propia contraseña.

```dotenv
DATABASE_URL=postgresql://nebula_builder.REFERENCIA_DEL_PROYECTO:CONTRASENA@HOST_DEL_POOLER:5432/postgres
```

En Cloudflare Pages, guarda `DATABASE_URL` como variable cifrada para la compilación de producción. Las conexiones remotas usan TLS con verificación. Si el servidor requiere una autoridad certificadora específica, proporciona el contenido PEM en `DATABASE_CA`. La compilación de `main` en Cloudflare requiere PostgreSQL. `CATALOG_REQUIRE_DATABASE=true` aplica el mismo requisito en otros entornos.

Guías oficiales de [migraciones en Supabase](https://supabase.com/docs/guides/deployment/database-migrations), [conexión PostgreSQL](https://supabase.com/docs/guides/database/connecting-to-postgres) y [roles mediante el pooler](https://supabase.com/kb/troubleshooting/password-authentication-failed).

## Vista local con datos de referencia

`CATALOG_SOURCE=fixture` activa los cuatro productos de referencia sin conexión. Si `DATABASE_URL` tiene un valor, la compilación consulta PostgreSQL y se detiene si falla la conexión o falta la imagen asignada a un producto.
