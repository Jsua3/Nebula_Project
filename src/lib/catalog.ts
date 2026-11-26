import type { ImageMetadata } from 'astro';
import { Client } from 'pg';
import fixture from '../data/catalog-fixture.json';

export { formatPrice } from './price';

type Audience = 'mujer' | 'hombre';

interface CatalogRow {
  slug: string;
  name: string;
  description: string;
  price_cop: number;
  audiences: string[];
  image_file: string;
  image_alt: string;
}

export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  audiences: Audience[];
  image: ImageMetadata;
  imageAlt: string;
}

const productImages = import.meta.glob<ImageMetadata>('../assets/products/*.jpeg', {
  eager: true,
  import: 'default',
});

function mapProduct(row: CatalogRow): Product {
  const image = productImages[`../assets/products/${row.image_file}`];
  if (!image) {
    throw new Error(`Falta la imagen del producto ${row.slug} en src/assets/products.`);
  }

  const audiences = row.audiences.filter(
    (audience): audience is Audience => audience === 'mujer' || audience === 'hombre',
  );
  if (audiences.length === 0 || audiences.length !== row.audiences.length) {
    throw new Error(`Las categorías del producto ${row.slug} son inválidas.`);
  }

  return {
    id: row.slug,
    name: row.name,
    description: row.description,
    price: row.price_cop,
    audiences,
    image,
    imageAlt: row.image_alt,
  };
}

function createCatalogClient(connectionUrl: string): Client {
  try {
    const url = new URL(connectionUrl);
    const host = url.hostname.replace(/^\[|\]$/g, '');
    const user = decodeURIComponent(url.username);
    const password = decodeURIComponent(url.password);
    const database = decodeURIComponent(url.pathname.slice(1));
    if (!['postgresql:', 'postgres:'].includes(url.protocol) || !host || !user || !password || !database) {
      throw new Error('Faltan parámetros de conexión.');
    }

    const isLocal = ['localhost', '127.0.0.1', '::1'].includes(host);
    const ca = import.meta.env.DATABASE_CA?.trim();
    const ssl = isLocal ? false : { rejectUnauthorized: true, ...(ca ? { ca } : {}) };

    return new Client({
      host,
      user,
      password,
      database,
      port: Number(url.port || 5432),
      ssl,
      connectionTimeoutMillis: 10_000,
      query_timeout: 10_000,
    });
  } catch {
    throw new Error('DATABASE_URL debe ser una URI de PostgreSQL con usuario, contraseña, host y base de datos.');
  }
}

async function readPostgres(connectionUrl: string): Promise<CatalogRow[]> {
  const client = createCatalogClient(connectionUrl);
  try {
    await client.connect();
    const { rows } = await client.query<CatalogRow>(`
      select slug, name, description, price_cop, audiences, image_file, image_alt
      from nebula_catalog.products
      where published
      order by sort_order, slug
    `);
    return rows;
  } catch {
    throw new Error('No se pudo leer el catálogo en PostgreSQL. Revisa la conexión, el certificado, la migración y los permisos del lector.');
  } finally {
    await client.end();
  }
}

export async function getProducts(): Promise<Product[]> {
  const connectionUrl = import.meta.env.DATABASE_URL?.trim();
  if (connectionUrl) {
    return (await readPostgres(connectionUrl)).map(mapProduct);
  }

  const requiresDatabase = import.meta.env.CATALOG_REQUIRE_DATABASE === 'true'
    || process.env.CF_PAGES_BRANCH === 'main';
  if (!requiresDatabase && import.meta.env.CATALOG_SOURCE === 'fixture') {
    return fixture.map(mapProduct);
  }

  throw new Error('Configura DATABASE_URL para cargar el catálogo. Para una vista local puedes activar CATALOG_SOURCE=fixture.');
}
