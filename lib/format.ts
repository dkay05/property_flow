export function formatCurrency(amount: number): string {
  if (amount >= 10000000) {
    return `${(amount / 10000000).toFixed(1)}Cr`;
  }
  if (amount >= 100000) {
    return `${(amount / 100000).toFixed(1)}L`;
  }
  if (amount >= 1000) {
    return `${(amount / 1000).toFixed(0)}K`;
  }
  return amount.toString();
}

export function formatBudget(min?: number, max?: number): string {
  if (!min && !max) return 'Not specified';
  if (min && max) return `${formatCurrency(min)} - ${formatCurrency(max)}`;
  if (min) return `${formatCurrency(min)}+`;
  return `Up to ${formatCurrency(max!)}`;
}

export function formatPhone(phone: string): string {
  if (phone.startsWith('+91')) {
    const num = phone.slice(3);
    return `+91 ${num.slice(0, 5)} ${num.slice(5)}`;
  }
  return phone;
}

export function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const today = now.toISOString().split('T')[0];
  const yesterday = new Date(now.getTime() - 86400000).toISOString().split('T')[0];
  const datePart = dateStr.split('T')[0];

  if (datePart === today) return 'Today';
  if (datePart === yesterday) return 'Yesterday';

  return date.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });
}

export function formatTime(time?: string): string {
  if (!time) return '';
  const [h, m] = time.split(':');
  const hour = parseInt(h);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
  return `${displayHour}:${m} ${ampm}`;
}

export function daysAgo(dateStr: string): number {
  const date = new Date(dateStr);
  const now = new Date();
  return Math.floor((now.getTime() - date.getTime()) / 86400000);
}

export function statusLabel(status: string): string {
  const map: Record<string, string> = {
    inquiry: 'Inquiry',
    site_visit: 'Site Visit',
    negotiation: 'Negotiation',
    offer: 'Offer',
    deal_done: 'Deal Done',
    lost: 'Lost',
    closed: 'Deal Done',
    dead: 'Lost',
  };
  return map[status] || status;
}

export function sourceLabel(source: string): string {
  const map: Record<string, string> = {
    walk_in: 'Walk-in',
    referral: 'Referral',
    call: 'Call',
    website: 'Website',
    social_media: 'Social Media',
  };
  return map[source] || source;
}

export function followUpTypeLabel(type: string): string {
  const map: Record<string, string> = {
    call: 'Call',
    site_visit: 'Site Visit',
    whatsapp: 'WhatsApp',
    email: 'Email',
    sms: 'SMS',
  };
  return map[type] || type;
}

export function furnishingLabel(f: string): string {
  const map: Record<string, string> = {
    furnished: 'Furnished',
    semi_furnished: 'Semi-Furnished',
    unfurnished: 'Unfurnished',
  };
  return map[f] || f;
}
