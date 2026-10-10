import { Household, Bill, BillSplit, Profile } from '../types';
import { formatCurrency } from './splitCalculator';

export async function sendDiscordWebhook(url: string, payload: any): Promise<boolean> {
  if (!url || !url.startsWith('http')) return false;
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return res.ok;
  } catch (err) {
    console.warn('Discord webhook failed', err);
    return false;
  }
}

export async function notifyNewBill(
  household: Household,
  bill: Bill,
  categoryName: string,
  profiles: Profile[]
): Promise<boolean> {
  const url = household.webhookSettings.discordUrl;
  if (!url || !household.webhookSettings.notifyOnNewBill) return false;

  const profileMap = new Map(profiles.map((p) => [p.id, p.fullName || p.email]));

  const splitFields = bill.splits.map((s) => ({
    name: `${profileMap.get(s.profileId) || 'Roommate'} (${s.percentage}%)`,
    value: `${formatCurrency(s.amountDue, bill.currency)}`,
    inline: true,
  }));

  const payload = {
    username: 'HouseSplits Bot',
    avatar_url: 'https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7?w=128&auto=format&fit=crop&q=80',
    embeds: [
      {
        title: `⚡ New ${categoryName} Bill Uploaded`,
        description: `**Provider:** ${bill.providerName}\n**Total Amount:** ${formatCurrency(bill.totalAmount, bill.currency)}\n**Due Date:** ${bill.dueDate}`,
        color: 1095905, // Emerald green
        fields: splitFields,
        footer: {
          text: `${household.name} • HouseSplits`,
        },
        timestamp: new Date().toISOString(),
      },
    ],
  };

  return sendDiscordWebhook(url, payload);
}

export async function notifyPaymentMade(
  household: Household,
  payerName: string,
  amount: number,
  currency: string = 'EUR'
): Promise<boolean> {
  const url = household.webhookSettings.discordUrl;
  if (!url || !household.webhookSettings.notifyOnPayment) return false;

  const payload = {
    username: 'HouseSplits Bot',
    embeds: [
      {
        title: `💸 Payment Sent to Admin`,
        description: `**${payerName}** marked **${formatCurrency(amount, currency)}** as paid to the House Admin.`,
        color: 16750848, // Amber
        footer: {
          text: `${household.name} • Awaiting Admin confirmation`,
        },
        timestamp: new Date().toISOString(),
      },
    ],
  };

  return sendDiscordWebhook(url, payload);
}
