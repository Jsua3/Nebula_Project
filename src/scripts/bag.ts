export type Bag = Record<string, number>;

const storageKey = 'nebula:bag:v1';
export const bagChangeEvent = 'nebula:bag-change';
export const maxQuantity = 99;
let memoryBag: Bag = {};
let useMemory = false;

export function readBag(): Bag {
  if (useMemory) return { ...memoryBag };

  let stored: string | null;
  try {
    stored = window.localStorage.getItem(storageKey);
  } catch {
    useMemory = true;
    return { ...memoryBag };
  }

  try {
    const value: unknown = stored === null ? {} : JSON.parse(stored);
    if (!value || typeof value !== 'object' || Array.isArray(value)) return {};

    return Object.fromEntries(
      Object.entries(value).filter(([id, quantity]) =>
        /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(id)
        && typeof quantity === 'number'
        && Number.isInteger(quantity)
        && quantity > 0
        && quantity <= maxQuantity,
      ),
    );
  } catch {
    return {};
  }
}

export function saveBag(bag: Bag): void {
  memoryBag = { ...bag };

  if (!useMemory) {
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(bag));
    } catch {
      useMemory = true;
    }
  }

  window.dispatchEvent(new Event(bagChangeEvent));
}

function updateBagCount(): void {
  const quantity = Object.values(readBag()).reduce((count, value) => count + value, 0);
  document.querySelectorAll<HTMLElement>('[data-bag-count]').forEach((counter) => {
    counter.textContent = String(quantity);
    counter.closest('a')?.setAttribute(
      'aria-label',
      quantity === 1 ? 'Bolsa, 1 pieza' : `Bolsa, ${quantity} piezas`,
    );
  });
}

if (typeof window !== 'undefined') {
  window.addEventListener(bagChangeEvent, updateBagCount);
  window.addEventListener('storage', (event) => {
    if (event.key === storageKey || event.key === null) {
      window.dispatchEvent(new Event(bagChangeEvent));
    }
  });
  updateBagCount();
}
