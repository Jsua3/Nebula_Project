insert into nebula_catalog.products (
    slug, name, description, price_cop, audiences, image_file, image_alt, sort_order, published
) values
    (
        'hoodie-negro', 'Hoodie negro',
        'Buzo con capucha y estampado verde en la espalda.',
        150000, array['mujer', 'hombre'], 'hoodie-negro-estampado-verde.jpeg',
        'Hoodie negro con un estampado verde en la espalda', 10, true
    ),
    (
        'chaqueta-negra', 'Chaqueta negra',
        'Chaqueta negra con cierre y parches en contraste.',
        130000, array['mujer', 'hombre'], 'chaqueta-negra-con-parches.jpeg',
        'Chaqueta negra de cierre frontal con parches blancos', 20, true
    ),
    (
        'gargantilla', 'Gargantilla',
        'Gargantilla negra con aros y cadenas.',
        70000, array['mujer'], 'gargantilla-negra-con-aros-y-cadenas.jpeg',
        'Detalle de la gargantilla negra con aros y cadenas metálicas', 30, true
    ),
    (
        'guantes', 'Guantes sin dedos',
        'Guantes negros sin dedos con aberturas en el dorso.',
        50000, array['mujer', 'hombre'], 'guantes-negros-sin-dedos.jpeg',
        'Un par de guantes negros sin dedos sobre un fondo verde', 40, true
    )
on conflict (slug) do nothing;
