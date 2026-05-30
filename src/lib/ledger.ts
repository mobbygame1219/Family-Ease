import type { LucideIcon } from 'lucide-react';
import {
  Car, UtensilsCrossed, Stethoscope, Gamepad2, ShoppingBag,
  Home, ShoppingCart, BookOpen, TrendingUp, Package,
} from 'lucide-react';

export const CATEGORY_META: Record<
  string,
  { label: string; Icon: LucideIcon; color: string }
> = {
  TRANSPORT:      { label: '交通',            Icon: Car,             color: '#3b82f6' },
  FOOD:           { label: '飲食',            Icon: UtensilsCrossed, color: '#22c55e' },
  MEDICAL:        { label: '醫療',            Icon: Stethoscope,     color: '#ef4444' },
  ENTERTAINMENT:  { label: '娛樂',            Icon: Gamepad2,        color: '#8b5cf6' },
  FASHION_BEAUTY: { label: '治裝＋美妝保養', Icon: ShoppingBag,     color: '#ec4899' },
  HOUSING:        { label: '房租＋水電＋網路', Icon: Home,            color: '#f59e0b' },
  DAILY:          { label: '日用品',           Icon: ShoppingCart,    color: '#06b6d4' },
  EDUCATION:      { label: '教育',            Icon: BookOpen,        color: '#10b981' },
  FINANCE:        { label: '理財',            Icon: TrendingUp,      color: '#f97316' },
  OTHER:          { label: '其他',            Icon: Package,         color: '#6b7280' },
};

export const PAYMENT_SOURCES = ['現金', '信用卡', '金融卡', '電子支付', '轉帳', '其他'];

export type TxCategory = keyof typeof CATEGORY_META;
