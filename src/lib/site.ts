const defaults = {
  instagram: 'https://www.instagram.com/mi1aaa.___/',
};

function instagramUrl(value: string): string {
  const url = new URL(value);
  const hosts = ['www.instagram.com', 'instagram.com'];

  if (
    url.protocol !== 'https:' ||
    !hosts.includes(url.host) ||
    url.username ||
    url.password ||
    !/^\/[a-z\d._]+\/?$/i.test(url.pathname) ||
    url.search ||
    url.hash
  ) {
    throw new Error('PUBLIC_INSTAGRAM_URL debe ser un enlace HTTPS a un perfil de Instagram.');
  }

  return url.href;
}

const email = import.meta.env.PUBLIC_CONTACT_EMAIL?.trim() ?? '';

if (email && !/^[a-z\d.!#$%&'*+/=?^_`{|}~-]+@[a-z\d.-]+\.[a-z]{2,}$/i.test(email)) {
  throw new Error('PUBLIC_CONTACT_EMAIL debe ser un correo electrónico válido.');
}

export const site = {
  email,
  instagram: instagramUrl(import.meta.env.PUBLIC_INSTAGRAM_URL?.trim() || defaults.instagram),
};
