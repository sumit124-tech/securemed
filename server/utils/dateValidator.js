/**
 * Validates and parses a Date of Birth string in YYYY-MM-DD format.
 * Guarantees creation of a UTC Date to prevent one-day-off timezone shifts.
 * Rejects invalid calendar dates (such as 31 Feb), future dates, and out-of-range ages.
 * 
 * @param {string} dob - The date of birth string in YYYY-MM-DD format
 * @param {string} role - The user's role (PATIENT, DOCTOR)
 * @returns {{ error?: string, dobUtc?: Date, age?: number }}
 */
export const validateAndParseDob = (dob, role) => {
  if (!dob || typeof dob !== 'string' || !dob.trim()) {
    return { error: 'Date of birth is required' };
  }

  const match = dob.trim().match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) {
    return { error: 'Invalid date of birth format. Expected YYYY-MM-DD' };
  }

  const year = parseInt(match[1], 10);
  const month = parseInt(match[2], 10); // 1-12
  const day = parseInt(match[3], 10); // 1-31

  if (month < 1 || month > 12 || day < 1 || day > 31) {
    return { error: 'Invalid calendar date' };
  }

  // Build UTC Date explicitly to prevent timezone-related shifting
  const dobUtc = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));

  // Verify that JavaScript date didn't overflow into the next month (e.g., Feb 31 -> Mar 3)
  if (
    dobUtc.getUTCFullYear() !== year ||
    dobUtc.getUTCMonth() !== month - 1 ||
    dobUtc.getUTCDate() !== day
  ) {
    return { error: 'Invalid calendar date (date does not exist in the given month)' };
  }

  const now = new Date();
  const todayUtc = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0));

  // Block future dates
  if (dobUtc > todayUtc) {
    return { error: 'Date of birth cannot be in the future' };
  }

  // Block dates older than 120 years
  const minDateUtc = new Date(Date.UTC(now.getFullYear() - 120, now.getMonth(), now.getDate(), 0, 0, 0, 0));
  if (dobUtc < minDateUtc) {
    return { error: 'Date of birth cannot be more than 120 years ago' };
  }

  // Calculate age taking into account birthdays not yet reached this year
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;
  const currentDay = now.getDate();

  let age = currentYear - year;
  if (currentMonth < month || (currentMonth === month && currentDay < day)) {
    age--;
  }

  // Enforce role-based minimum age rules
  if (role === 'PATIENT' && age < 18) {
    return { error: 'Patients must be at least 18 years old' };
  }

  if (role === 'DOCTOR' && age < 23) {
    return { error: 'Doctors must be at least 23 years old' };
  }

  return { dobUtc, age };
};
