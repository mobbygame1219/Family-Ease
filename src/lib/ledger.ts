export const CATEGORY_META: Record<
  string,
  { label: string; icon: string; color: string }
> = {
  TRANSPORT:      { label: '交通',           icon: '🚗', color: '#3b82f6' },
  FOOD:           { label: '飲食',           icon: '🍽️', color: '#22c55e' },
  MEDICAL:        { label: '醫療',           icon: '🏥', color: '#ef4444' },
  ENTERTAINMENT:  { label: '娛樂',           icon: '🎮', color: '#8b5cf6' },
  FASHION_BEAUTY: { label: '治裝＋美妝保養', icon: '👗', color: '#ec4899' },
  HOUSING:        { label: '房租＋水電＋網路', icon: '🏠', color: '#f59e0b' },
  DAILY:          { label: '日用品',          icon: '🛒', color: '#06b6d4' },
  EDUCATION:      { label: '教育',           icon: '📚', color: '#10b981' },
  FINANCE:        { label: '理財',           icon: '💹', color: '#f97316' },
  OTHER:          { label: '其他',           icon: '📦', color: '#6b7280' },
};

export const PAYMENT_SOURCES = ['現金', '信用卡', '金融卡', '電子支付', '轉帳', '其他'];

export type TxCategory = keyof typeof CATEGORY_META;
