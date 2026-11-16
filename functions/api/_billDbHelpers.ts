export const MAX_INLINE_DATA_URL_CHARS = 900_000;

export async function resolveBillHouseholdId(
  db: D1Database,
  requestedHouseholdId: string | undefined
): Promise<string | null> {
  if (requestedHouseholdId) {
    const houseExists = await db
      .prepare('SELECT id FROM households WHERE id = ?')
      .bind(requestedHouseholdId)
      .first();
    if (houseExists) return requestedHouseholdId;
  }

  const fallbackHouse = await db
    .prepare('SELECT id FROM households ORDER BY created_at ASC LIMIT 1')
    .first();
  return (fallbackHouse?.id as string) || null;
}

export async function resolveBillCategoryId(
  db: D1Database,
  householdId: string,
  requestedCategoryId: string | undefined
): Promise<string> {
  const categoryId = requestedCategoryId || '';
  if (categoryId) {
    const catExists = await db
      .prepare('SELECT id FROM bill_categories WHERE id = ?')
      .bind(categoryId)
      .first();
    if (catExists) return categoryId;
  }

  const codeCandidate = (categoryId || 'utility').replace(/^cat-/, '').toLowerCase();
  const codeMapping: Record<string, string> = {
    elec: 'electricity',
    net: 'internet',
    wat: 'water',
  };
  const normalizedCode = codeMapping[codeCandidate] || codeCandidate;

  const matched = await db
    .prepare(
      'SELECT id FROM bill_categories WHERE household_id = ? AND (code = ? OR code = ? OR id = ?) LIMIT 1'
    )
    .bind(householdId, codeCandidate, normalizedCode, categoryId)
    .first();
  if (matched?.id) return matched.id as string;

  const anyCat = await db
    .prepare('SELECT id FROM bill_categories WHERE household_id = ? LIMIT 1')
    .bind(householdId)
    .first();
  if (anyCat?.id) return anyCat.id as string;

  const newCatId = crypto.randomUUID();
  const catName = normalizedCode.charAt(0).toUpperCase() + normalizedCode.slice(1);
  await db
    .prepare(
      'INSERT INTO bill_categories (id, household_id, name, code, icon, color_hex) VALUES (?, ?, ?, ?, ?, ?)'
    )
    .bind(newCatId, householdId, catName, normalizedCode, 'zap', '#10b981')
    .run();
  return newCatId;
}

export async function resolveBillCreatorId(
  db: D1Database,
  householdId: string,
  requestedCreatedBy: string | undefined
): Promise<string | null> {
  if (!requestedCreatedBy) return null;
  const profileExists = await db
    .prepare('SELECT id FROM profiles WHERE id = ?')
    .bind(requestedCreatedBy)
    .first();
  if (profileExists) return requestedCreatedBy;

  const adminProfile = await db
    .prepare('SELECT id FROM profiles WHERE household_id = ? AND role = "admin" LIMIT 1')
    .bind(householdId)
    .first();
  return adminProfile?.id ? (adminProfile.id as string) : null;
}

export async function insertBillSplitsInDb(
  db: D1Database,
  billId: string,
  householdId: string,
  splits: any[]
): Promise<any[]> {
  const insertedSplits: any[] = [];
  if (!Array.isArray(splits) || splits.length === 0) return insertedSplits;

  const adminProfile = await db
    .prepare('SELECT id FROM profiles WHERE household_id = ? AND role = "admin" LIMIT 1')
    .bind(householdId)
    .first();
  const adminId = adminProfile?.id as string | undefined;

  for (const split of splits) {
    let splitProfileId = split.profileId;
    const pExists = await db
      .prepare('SELECT id FROM profiles WHERE id = ?')
      .bind(splitProfileId)
      .first();

    if (!pExists) {
      if ((splitProfileId === 'user-admin' || !splitProfileId) && adminId) {
        splitProfileId = adminId;
      } else {
        continue;
      }
    }

    const splitId = split.id || crypto.randomUUID();
    const amount = Number(split.amountDue !== undefined ? split.amountDue : split.amount || 0) || 0;
    const percentage = Number(split.percentage) || 0;

    await db
      .prepare(
        `INSERT OR REPLACE INTO bill_splits (
          id, bill_id, profile_id, amount, percentage, status, paid_at, confirmed_at, notes
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .bind(
        splitId,
        billId,
        splitProfileId,
        amount,
        percentage,
        split.status || 'pending',
        split.markedPaidAt || split.paidAt || null,
        split.confirmedPaidAt || split.confirmedAt || null,
        split.notes || null
      )
      .run();

    insertedSplits.push({
      id: splitId,
      billId,
      profileId: splitProfileId,
      amount,
      amountDue: amount,
      percentage,
      status: split.status || 'pending',
      paidAt: split.markedPaidAt || split.paidAt || null,
      markedPaidAt: split.markedPaidAt || split.paidAt || null,
      confirmedAt: split.confirmedPaidAt || split.confirmedAt || null,
      confirmedPaidAt: split.confirmedPaidAt || split.confirmedAt || null,
      notes: split.notes || null,
    });
  }

  return insertedSplits;
}
