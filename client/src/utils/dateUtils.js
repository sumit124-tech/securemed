const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

/**
 * Returns today's date formatted as YYYY-MM-DD.
 */
export const getTodayString = () => {
  return new Date().toISOString().split('T')[0];
};

/**
 * Returns the date string for `yearsAgo` years ago as YYYY-MM-DD.
 */
export const getMinDateString = (yearsAgo = 120) => {
  const d = new Date();
  d.setFullYear(d.getFullYear() - yearsAgo);
  return d.toISOString().split('T')[0];
};

/**
 * Explicitly parses a YYYY-MM-DD string into components and verifies calendar validity.
 * Returns null if format is invalid or calendar date does not exist (e.g. 31 Feb).
 */
export const parseUtcDate = (dateStr) => {
  if (!dateStr || typeof dateStr !== 'string') return null;
  const match = dateStr.trim().match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;

  const year = parseInt(match[1], 10);
  const month = parseInt(match[2], 10); // 1-12
  const day = parseInt(match[3], 10); // 1-31

  if (month < 1 || month > 12 || day < 1 || day > 31) return null;

  // Build UTC date explicitly
  const utc = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
  if (
    utc.getUTCFullYear() !== year ||
    utc.getUTCMonth() !== month - 1 ||
    utc.getUTCDate() !== day
  ) {
    return null; // Date overflowed, e.g. Feb 31 -> Mar 3
  }

  return { year, month, day, utc };
};

/**
 * Calculates exact age in years, correctly accounting for birthdays not yet reached this year.
 * Handles both YYYY-MM-DD strings and Date objects.
 */
export const calculateAge = (dob) => {
  if (!dob) return null;
  let birthYear, birthMonth, birthDay;

  if (typeof dob === 'string') {
    const parsed = parseUtcDate(dob);
    if (!parsed) return null;
    birthYear = parsed.year;
    birthMonth = parsed.month;
    birthDay = parsed.day;
  } else if (dob instanceof Date && !isNaN(dob.getTime())) {
    birthYear = dob.getUTCFullYear();
    birthMonth = dob.getUTCMonth() + 1;
    birthDay = dob.getUTCDate();
  } else {
    return null;
  }

  const today = new Date();
  const currentYear = today.getFullYear();
  const currentMonth = today.getMonth() + 1;
  const currentDay = today.getDate();

  let age = currentYear - birthYear;
  if (currentMonth < birthMonth || (currentMonth === birthMonth && currentDay < birthDay)) {
    age--;
  }

  return age;
};

/**
 * Formats a valid YYYY-MM-DD date string as "DD Month YYYY" (e.g., "12 March 1990").
 */
export const formatDisplayDate = (dob) => {
  if (!dob) return '';
  const parsed = parseUtcDate(dob);
  if (!parsed) return '';
  return `${parsed.day} ${MONTH_NAMES[parsed.month - 1]} ${parsed.year}`;
};

/**
 * Validates date of birth according to application rules:
 * - Format must be valid calendar date
 * - Must not be in the future
 * - Must not be more than 120 years ago
 * - Patient: minimum age 18
 * - Doctor: minimum age 23
 */
export const validateDob = (dob, role) => {
  if (!dob) {
    return { valid: false, error: 'Enter your date of birth', age: null };
  }

  const parsed = parseUtcDate(dob);
  if (!parsed) {
    return { valid: false, error: 'Please enter a valid calendar date', age: null };
  }

  const now = new Date();
  const todayUtc = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0));
  if (parsed.utc > todayUtc) {
    return { valid: false, error: 'Date of birth cannot be in the future', age: null };
  }

  const minDateUtc = new Date(Date.UTC(now.getFullYear() - 120, now.getMonth(), now.getDate(), 0, 0, 0, 0));
  if (parsed.utc < minDateUtc) {
    return { valid: false, error: 'Date of birth cannot be more than 120 years ago', age: null };
  }

  const age = calculateAge(dob);
  if (age === null || age < 0) {
    return { valid: false, error: 'Date of birth cannot be in the future', age: null };
  }

  if (role === 'PATIENT' && age < 18) {
    return { valid: false, error: 'Patients must be at least 18 years old', age };
  }

  if (role === 'DOCTOR' && age < 23) {
    return { valid: false, error: 'Doctors must be at least 23 years old', age };
  }

  return { valid: true, error: null, age };
};
