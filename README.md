# Nébula

Catálogo de ropa y accesorios de Nébula. El sitio incluye Inicio, Tienda, Nosotros y Contacto. La bolsa guarda la selección en el navegador y permite copiarla para consultar por Instagram.

## Desarrollo local

Instala la versión de Node.js indicada en `.node-version`. En PowerShell, desde la raíz del repositorio:

```powershell
npm ci
Copy-Item .env.example .env
npm run dev
```

Astro muestra la dirección local en la terminal. El archivo de ejemplo activa los productos de referencia. Para probar con PostgreSQL, sigue la [guía de base de datos](docs/base-de-datos.md) y configura `DATABASE_URL` en `.env`. Cuando existe esa variable, el sitio lee el catálogo de PostgreSQL.

```powershell
npm run check
npm run build
npm run preview
```

Las fotos editoriales, los productos y el logo se organizan en `src/assets`. El diseño original está en [Referencias](docs/referencias/).

## Ramas y despliegue

- `develop` recibe los cambios de la siguiente versión.
- `main` es la rama de producción. Una versión llega a ella mediante un pull request desde `develop`.

Para el primer lanzamiento, crea el proyecto de [Supabase](https://supabase.com/) y aplica las migraciones y la carga inicial según la [guía de base de datos](docs/base-de-datos.md). Luego conecta este repositorio a un proyecto de Cloudflare Pages en el plan Free.

| Ajuste de Cloudflare Pages | Valor |
| --- | --- |
| Rama de producción | `main` |
| Comando de compilación | `npm run build` |
| Carpeta de salida | `dist` |
| Variable cifrada de producción | `DATABASE_URL` con el rol de lectura |
| Variable de vista previa | `CATALOG_SOURCE=fixture` o una conexión a la base de pruebas |

La compilación de producción lee PostgreSQL y genera una copia estática del catálogo. Para publicar un cambio de precios o productos, vuelve a desplegar desde Cloudflare Pages. Los visitantes consultan la copia publicada aunque la base de datos esté temporalmente pausada. La dirección gratuita se asigna bajo `.pages.dev`.

Puedes configurar `PUBLIC_CONTACT_EMAIL` o actualizar `PUBLIC_INSTAGRAM_URL` desde las variables de compilación. Los cambios de contacto se reflejan en el siguiente despliegue.

[Guía de Cloudflare Pages para Astro](https://developers.cloudflare.com/pages/framework-guides/deploy-an-astro-site/)
