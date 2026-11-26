import { formatPrice } from '../lib/price';
import { bagChangeEvent, maxQuantity, readBag, saveBag } from './bag';

interface ProductCard {
  id: string;
  name: string;
  price: number;
  search: string;
  audiences: string[];
  element: HTMLElement;
}

function field<T extends Element>(root: ParentNode, selector: string): T {
  const element = root.querySelector<T>(selector);
  if (!element) throw new Error(`Falta el control de tienda ${selector}.`);
  return element;
}

function normalizeSearch(text: string): string {
  return text.toLocaleLowerCase('es-CO').normalize('NFD').replace(/\p{M}/gu, '');
}

function setupFilters(store: HTMLElement, products: ProductCard[]): void {
  const form = field<HTMLFormElement>(store, '[data-store-controls]');
  const search = field<HTMLInputElement>(form, '[name="buscar"]');
  const categories = [...form.querySelectorAll<HTMLInputElement>('[name="categoria"]')];
  const defaultCategory = field<HTMLInputElement>(form, '[name="categoria"][value=""]');
  const status = field<HTMLElement>(store, '[data-search-status]');
  const empty = field<HTMLElement>(store, '[data-search-empty]');

  function applyFilters(syncUrl: boolean): void {
    const category = categories.find((input) => input.checked)?.value ?? '';
    const terms = normalizeSearch(search.value.trim()).split(/\s+/).filter(Boolean);
    let matches = 0;

    for (const product of products) {
      const matchesCategory = !category || product.audiences.includes(category);
      const matchesSearch = terms.every((term) => product.search.includes(term));
      product.element.hidden = !(matchesCategory && matchesSearch);
      if (!product.element.hidden) matches += 1;
    }

    empty.hidden = matches > 0 || products.length === 0;
    status.textContent = matches === 1 ? '1 pieza encontrada' : `${matches} piezas encontradas`;

    if (syncUrl) {
      const url = new URL(window.location.href);
      const values = { categoria: category, buscar: search.value.trim() };
      for (const [key, value] of Object.entries(values)) {
        if (value) url.searchParams.set(key, value);
        else url.searchParams.delete(key);
      }
      if (url.href !== window.location.href) window.history.replaceState(window.history.state, '', url);
    }
  }

  function restoreFilters(): void {
    const query = new URLSearchParams(window.location.search);
    const category = categories.find((input) => input.value === query.get('categoria')) ?? defaultCategory;
    category.checked = true;
    search.value = (query.get('buscar') ?? '').slice(0, search.maxLength);
    applyFilters(false);
  }

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    applyFilters(true);
  });
  form.addEventListener('input', () => applyFilters(true));
  window.addEventListener('popstate', restoreFilters);
  restoreFilters();
  form.hidden = false;
}

function setupBag(store: HTMLElement, products: ProductCard[]): void {
  const bag = field<HTMLElement>(store, '[data-bag]');
  const empty = field<HTMLElement>(bag, '[data-bag-empty]');
  const content = field<HTMLElement>(bag, '[data-bag-content]');
  const items = field<HTMLUListElement>(bag, '[data-bag-items]');
  const total = field<HTMLElement>(bag, '[data-bag-total]');
  const rowTemplate = field<HTMLTemplateElement>(bag, '[data-bag-row]');
  const status = field<HTMLElement>(store, '[data-bag-status]');
  const copy = field<HTMLButtonElement>(bag, '[data-copy-bag]');
  const fallback = field<HTMLElement>(bag, '[data-bag-fallback]');
  const textArea = field<HTMLTextAreaElement>(bag, '[data-bag-text]');
  const email = bag.querySelector<HTMLAnchorElement>('[data-email-bag]');
  const catalog = new Map(products.map((product) => [product.id, product]));

  function renderBag(): void {
    const active = document.activeElement;
    const wasInItems = active instanceof HTMLElement && items.contains(active);
    const focusId = wasInItems ? active.closest('li')?.dataset.itemId : undefined;
    const focusAction = wasInItems ? active.dataset.bagAction : undefined;
    const rows = document.createDocumentFragment();
    const summary: string[] = [];
    let subtotal = 0;
    let focusTarget: HTMLButtonElement | undefined;

    for (const [id, quantity] of Object.entries(readBag())) {
      const product = catalog.get(id);
      if (!product) continue;
      const row = field<HTMLLIElement>(rowTemplate.content, 'li').cloneNode(true) as HTMLLIElement;
      const itemSubtotal = product.price * quantity;
      subtotal += itemSubtotal;
      summary.push(`${quantity} × ${product.name} — ${formatPrice(itemSubtotal)}`);
      row.dataset.itemId = id;
      field(row, '[data-item-name]').textContent = product.name;
      field(row, '[data-item-total]').textContent = formatPrice(itemSubtotal);
      field(row, '[data-item-quantity]').textContent = String(quantity);
      const subtract = field<HTMLButtonElement>(row, '[data-bag-action="subtract"]');
      const add = field<HTMLButtonElement>(row, '[data-bag-action="add"]');
      const remove = field<HTMLButtonElement>(row, '[data-bag-action="remove"]');
      subtract.setAttribute('aria-label', `Reducir cantidad de ${product.name}`);
      subtract.setAttribute('aria-disabled', String(quantity === 1));
      add.setAttribute('aria-label', `Aumentar cantidad de ${product.name}`);
      add.setAttribute('aria-disabled', String(quantity === maxQuantity));
      remove.setAttribute('aria-label', `Quitar ${product.name} de la bolsa`);

      if (id === focusId) {
        focusTarget = [subtract, add, remove].find((button) => button.dataset.bagAction === focusAction);
      }
      rows.append(row);
    }

    items.replaceChildren(rows);
    empty.hidden = summary.length > 0;
    content.hidden = summary.length === 0;
    total.textContent = formatPrice(subtotal);
    textArea.value = [
      'Hola, Nébula. ¿Me pueden confirmar la disponibilidad de estas piezas?',
      '',
      ...summary,
      '',
      `Subtotal: ${formatPrice(subtotal)}`,
    ].join('\n');

    if (email) {
      const subject = encodeURIComponent('Consulta sobre la colección Nébula');
      email.href = `mailto:${bag.dataset.email}?subject=${subject}&body=${encodeURIComponent(textArea.value)}`;
    }

    if (wasInItems) (focusTarget ?? field<HTMLElement>(bag, '#bag-title')).focus({ preventScroll: true });
  }

  function changeQuantity(id: string, change: number | 'remove'): void {
    const product = catalog.get(id);
    if (!product) return;
    const current = readBag();
    const existingQuantity = Object.hasOwn(current, id) ? current[id] : 0;
    const quantity = change === 'remove' ? 0 : existingQuantity + change;
    if (quantity > maxQuantity) {
      status.textContent = `La cantidad máxima por pieza es ${maxQuantity}.`;
      return;
    }
    if (quantity < 1 && change !== 'remove') return;

    if (quantity === 0) delete current[id];
    else current[id] = quantity;
    saveBag(current);
    status.textContent = quantity === 0
      ? `${product.name} retirado de la bolsa.`
      : `${product.name} en la bolsa. Cantidad: ${quantity}.`;
  }

  for (const product of products) {
    const add = field<HTMLButtonElement>(product.element, '[data-add-product]');
    add.addEventListener('click', () => changeQuantity(product.id, 1));
    add.hidden = false;
  }

  items.addEventListener('click', (event) => {
    if (!(event.target instanceof Element)) return;
    const button = event.target.closest<HTMLButtonElement>('[data-bag-action]');
    if (!button || button.getAttribute('aria-disabled') === 'true') return;
    const id = button.closest('li')?.dataset.itemId;
    if (!id) return;
    const action = button.dataset.bagAction;
    changeQuantity(id, action === 'remove' ? 'remove' : action === 'subtract' ? -1 : 1);
  });

  copy.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(textArea.value);
      fallback.hidden = true;
      copy.textContent = 'Consulta copiada';
      status.textContent = 'Consulta copiada.';
    } catch {
      fallback.hidden = false;
      textArea.focus();
      textArea.select();
    }
  });

  window.addEventListener(bagChangeEvent, () => {
    copy.textContent = 'Copiar consulta';
    renderBag();
  });
  const stored = readBag();
  const available = Object.entries(stored).filter(([id]) => catalog.has(id));
  if (available.length < Object.keys(stored).length) saveBag(Object.fromEntries(available));
  else renderBag();

  bag.hidden = false;
  if (window.location.hash === '#bolsa') {
    window.requestAnimationFrame(() => {
      bag.scrollIntoView();
      bag.focus({ preventScroll: true });
    });
  }
}

const storefront = document.querySelector<HTMLElement>('[data-store]');
if (storefront) {
  const products = [...storefront.querySelectorAll<HTMLElement>('[data-product]')].map((element) => ({
    id: element.dataset.id ?? '',
    name: element.dataset.name ?? '',
    price: Number(element.dataset.price),
    search: normalizeSearch(element.dataset.search ?? ''),
    audiences: element.dataset.audiences?.split(' ') ?? [],
    element,
  }));
  setupFilters(storefront, products);
  setupBag(storefront, products);
}
