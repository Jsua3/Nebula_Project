create schema nebula_catalog;

create table nebula_catalog.products (
    slug text primary key check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
    name text not null check (btrim(name) <> ''),
    description text not null check (btrim(description) <> ''),
    price_cop integer not null check (price_cop > 0),
    audiences text[] not null check (
        cardinality(audiences) between 1 and 2
        and array_lower(audiences, 1) = 1
        and array_position(audiences, null) is null
        and audiences <@ array['mujer', 'hombre']::text[]
        and (cardinality(audiences) = 1 or audiences[1] <> audiences[2])
    ),
    image_file text not null check (image_file ~ '^[a-z0-9]+(-[a-z0-9]+)*\.jpeg$'),
    image_alt text not null check (btrim(image_alt) <> ''),
    sort_order smallint not null default 0 check (sort_order >= 0),
    published boolean not null default false
);

create role nebula_catalog_reader nologin;

revoke all on schema nebula_catalog from public;
revoke all on table nebula_catalog.products from public;
grant usage on schema nebula_catalog to nebula_catalog_reader;
grant select on nebula_catalog.products to nebula_catalog_reader;

alter table nebula_catalog.products enable row level security;

create policy read_published_products on nebula_catalog.products
    for select to nebula_catalog_reader
    using (published);
