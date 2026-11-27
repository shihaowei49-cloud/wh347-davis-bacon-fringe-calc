const MINUTES_PER_HOUR = 60n;
const STRAIGHT_TIME_LIMIT = 40n * MINUTES_PER_HOUR;
const MAX_WEEK_MINUTES = 168 * Number(MINUTES_PER_HOUR);
const SAFE_INTEGER_LIMIT = BigInt(Number.MAX_SAFE_INTEGER);

function nonnegativeInteger(value, field) {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new RangeError(`${field} must be a nonnegative safe integer.`);
  }
  return BigInt(value);
}

function roundCents(numerator, denominator) {
  return (2n * numerator + denominator) / (2n * denominator);
}

function safeNumber(value, field) {
  if (value > SAFE_INTEGER_LIMIT) throw new RangeError(`${field} exceeds the safe integer range.`);
  return Number(value);
}

/** Parse a nonnegative decimal dollar string with at most two fractional digits. */
export function parseHourlyRateCents(value) {
  if (typeof value !== 'string') throw new TypeError('Expected a dollar amount as text.');
  const match = /^(\d+)(?:\.(\d{1,2}))?$/.exec(value.trim());
  if (!match) throw new RangeError('Expected nonnegative dollars with at most two fractional digits.');
  const dollars = match[1].replace(/^0+(?=\d)/, '');
  if (dollars.length > 14) throw new RangeError('Hourly rate exceeds the safe integer range.');
  return safeNumber(BigInt(dollars) * 100n + BigInt((match[2] ?? '').padEnd(2, '0')), 'Hourly rate');
}

/**
 * Compute one employee's workweek for a single covered project/classification.
 * Inputs and outputs use integer minutes and cents. The caller supplies the
 * approved benefit credit and any independently determined higher premium basis.
 */
export function calculateWeek(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw new TypeError('Expected a workweek object.');
  }
  const {
    workedMinutes, baseCentsPerHour, requiredFringeCentsPerHour,
    eligibleCreditCentsPerHour, overtimeBaseCentsPerHour = baseCentsPerHour,
  } = input;
  const minutes = nonnegativeInteger(workedMinutes, 'workedMinutes');
  const base = nonnegativeInteger(baseCentsPerHour, 'baseCentsPerHour');
  const fringe = nonnegativeInteger(requiredFringeCentsPerHour, 'requiredFringeCentsPerHour');
  const credit = nonnegativeInteger(eligibleCreditCentsPerHour, 'eligibleCreditCentsPerHour');
  const overtimeBase = nonnegativeInteger(overtimeBaseCentsPerHour, 'overtimeBaseCentsPerHour');
  if (workedMinutes > MAX_WEEK_MINUTES) throw new RangeError('workedMinutes cannot exceed 168 hours.');
  if (base === 0n) throw new RangeError('baseCentsPerHour must be positive.');
  if (overtimeBase < base) throw new RangeError('overtimeBaseCentsPerHour cannot be below the basic cash rate.');

  const overtime = minutes > STRAIGHT_TIME_LIMIT ? minutes - STRAIGHT_TIME_LIMIT : 0n;
  const creditRate = credit < fringe ? credit : fringe;
  const cashInLieuRate = fringe - creditRate;
  const basicWages = roundCents(minutes * base, MINUTES_PER_HOUR);
  const premium = roundCents(overtime * overtimeBase, 2n * MINUTES_PER_HOUR);
  const totalRequiredFringe = roundCents(minutes * fringe, MINUTES_PER_HOUR);
  const benefitCredit = roundCents(minutes * creditRate, MINUTES_PER_HOUR);
  const cashInLieu = totalRequiredFringe > benefitCredit ? totalRequiredFringe - benefitCredit : 0n;

  return {
    straightTimeMinutes: Number(minutes - overtime),
    overtimeMinutes: Number(overtime),
    basicWagesCents: safeNumber(basicWages, 'Basic wages'),
    overtimePremiumCents: safeNumber(premium, 'Overtime premium'),
    cashInLieuCents: safeNumber(cashInLieu, 'Cash in lieu'),
    benefitCreditCents: safeNumber(benefitCredit, 'Benefit credit'),
    grossCashWagesCents: safeNumber(basicWages + premium + cashInLieu, 'Gross cash wages'),
    overtimeBaseCentsPerHour,
    claimedCreditCentsPerHour: Number(creditRate),
    cashInLieuCentsPerHour: Number(cashInLieuRate),
  };
}
