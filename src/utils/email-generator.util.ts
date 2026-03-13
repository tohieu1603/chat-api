import removeAccents from 'remove-accents';

/**
 * Normalize Vietnamese name to email-safe slug.
 * "Nguyễn Văn A" → "nguyen.van.a"
 */
function normalizeToSlug(str: string): string {
  return removeAccents(str)
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '.')
    .replace(/[^a-z0-9.]/g, '')
    .replace(/\.{2,}/g, '.')
    .replace(/^\.+|\.+$/g, '');
}

/**
 * Normalize company name to email domain part.
 * "Company A" → "companya"
 */
function normalizeToDomain(str: string): string {
  return removeAccents(str)
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '')
    .replace(/[^a-z0-9]/g, '');
}

/**
 * Generate email from fullName + companyName.
 * Handles duplicates by appending number suffix.
 *
 * @param fullName - e.g. "Nguyễn Văn A"
 * @param companyName - e.g. "Company A"
 * @param emailExists - async checker (returns true if email taken)
 * @returns e.g. "nguyen.van.a@companya.com" or "nguyen.van.a2@companya.com"
 */
export async function generateEmail(
  fullName: string,
  companyName: string,
  emailExists: (email: string) => Promise<boolean>,
): Promise<string> {
  const localPart = normalizeToSlug(fullName);
  if (!localPart) throw new Error(`Không thể tạo email slug từ tên: "${fullName}"`);

  const domain = normalizeToDomain(companyName);
  if (!domain) throw new Error(`Không thể tạo email domain từ tên công ty: "${companyName}"`);

  const baseEmail = `${localPart}@${domain}.com`;

  if (!(await emailExists(baseEmail))) {
    return baseEmail;
  }

  // Append incrementing suffix: localpart2@domain.com, localpart3@domain.com, ...
  let suffix = 2;
  while (suffix <= 100) {
    const candidate = `${localPart}${suffix}@${domain}.com`;
    if (!(await emailExists(candidate))) {
      return candidate;
    }
    suffix++;
  }

  throw new Error(`Không thể tạo email cho ${fullName} — quá nhiều trùng lặp`);
}
