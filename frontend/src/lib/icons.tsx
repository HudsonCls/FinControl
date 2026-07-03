import {
  Utensils,
  Car,
  Home,
  Tv,
  Heart,
  Tag,
  Wallet,
  Briefcase,
  ShoppingCart,
  Plane,
  type LucideIcon,
} from 'lucide-react';

/** Mapeia uma categoria (por nome) a um ícone lucide, com fallback. */
export function categoryIcon(name: string): LucideIcon {
  const n = name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();
  if (/aliment|comida|mercado|restaurante/.test(n)) return Utensils;
  if (/transp|carro|uber|combust/.test(n)) return Car;
  if (/morad|casa|aluguel|condom/.test(n)) return Home;
  if (/lazer|entreten|stream|cinema/.test(n)) return Tv;
  if (/saud|farm|medic/.test(n)) return Heart;
  if (/sal[aá]rio|renda|receit/.test(n)) return Briefcase;
  if (/compra|shopping/.test(n)) return ShoppingCart;
  if (/viag|turismo/.test(n)) return Plane;
  if (/conta|saldo|carteira/.test(n)) return Wallet;
  return Tag;
}
