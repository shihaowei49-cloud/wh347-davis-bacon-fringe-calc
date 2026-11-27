import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { calculateWeek, parseHourlyRateCents } from '../src/index.js';

const week = {
  workedMinutes: 2760,
  baseCentsPerHour: 3200,
  requiredFringeCentsPerHour: 1450,
  eligibleCreditCentsPerHour: 900,
};

test('ties exactly to straight time, overtime, in-lieu cash and benefit credit', () => {
  assert.deepEqual(calculateWeek(week), {
    straightTimeMinutes: 2400,
    overtimeMinutes: 360,
    basicWagesCents: 147200,
    overtimePremiumCents: 9600,
    cashInLieuCents: 25300,
    benefitCreditCents: 41400,
    grossCashWagesCents: 182100,
    overtimeBaseCentsPerHour: 3200,
    claimedCreditCentsPerHour: 900,
    cashInLieuCentsPerHour: 550,
  });
});

test('holds the 40-hour threshold and covers fractional hours', () => {
  for (const [minutes, straight, overtime, premium, cash] of [
    [0, 0, 0, 0, 0], [2399, 2399, 0, 0, 21991], [2400, 2400, 0, 0, 22000],
    [2401, 2400, 1, 27, 22009], [2430, 2400, 30, 800, 22275],
  ]) {
    const result = calculateWeek({ ...week, workedMinutes: minutes });
    assert.deepEqual([
      result.straightTimeMinutes, result.overtimeMinutes, result.overtimePremiumCents, result.cashInLieuCents,
    ], [straight, overtime, premium, cash]);
  }
});

test('caps reimbursable credit at the fringe rate and covers all hours with no credit', () => {
  const noCredit = calculateWeek({ ...week, eligibleCreditCentsPerHour: 0 });
  assert.equal(noCredit.cashInLieuCents, 66700);
  assert.equal(noCredit.benefitCreditCents, 0);
  for (const rate of [1450, 1600]) {
    const covered = calculateWeek({ ...week, eligibleCreditCentsPerHour: rate });
    assert.equal(covered.claimedCreditCentsPerHour, 1450);
    assert.equal(covered.benefitCreditCents, 66700);
    assert.equal(covered.cashInLieuCents, 0);
    assert.equal(covered.grossCashWagesCents, 156800);
  }
  const noFringe = calculateWeek({ ...week, requiredFringeCentsPerHour: 0 });
  assert.equal(noFringe.benefitCreditCents, 0);
  assert.equal(noFringe.cashInLieuCents, 0);
});

test('accepts a caller-determined higher overtime basis without changing basic wages', () => {
  const result = calculateWeek({ ...week, overtimeBaseCentsPerHour: 4000 });
  assert.equal(result.basicWagesCents, 147200);
  assert.equal(result.overtimePremiumCents, 12000);
  assert.equal(result.cashInLieuCents, 25300);
  assert.equal(result.grossCashWagesCents, 184500);
});

test('rounds exact ties up and reconciles cash and credit to total fringe', () => {
  const result = calculateWeek({
    workedMinutes: 2430, baseCentsPerHour: 3002,
    requiredFringeCentsPerHour: 1000, eligibleCreditCentsPerHour: 333,
  });
  assert.equal(result.overtimePremiumCents, 751);
  assert.equal(result.cashInLieuCents, 27013);
  assert.equal(result.benefitCreditCents, 13487);
  assert.equal(result.grossCashWagesCents, 149345);
});

test('covers rounded total fringe for a one-minute partial hour', () => {
  for (const [rate, required, cash] of [[80, 3201, 2401], [100, 4002, 3202]]) {
    const { cashInLieuCents, benefitCreditCents } = calculateWeek({
      ...week,
      workedMinutes: 2401,
      requiredFringeCentsPerHour: rate,
      eligibleCreditCentsPerHour: 20,
    });
    assert.deepEqual([cashInLieuCents, benefitCreditCents, cashInLieuCents + benefitCreditCents],
      [cash, 800, required]);
  }
});

test('validates inputs, rejects weeks longer than 168 hours and detects overflow', () => {
  for (const value of [-1, 0.5, 10081, null, '2400', NaN, Infinity]) {
    assert.throws(() => calculateWeek({ ...week, workedMinutes: value }), /workedMinutes/);
  }
  assert.throws(() => calculateWeek(null), TypeError);
  assert.throws(() => calculateWeek({ ...week, baseCentsPerHour: 0 }), /positive/);
  assert.throws(() => calculateWeek({ ...week, requiredFringeCentsPerHour: -1 }), /requiredFringe/);
  assert.throws(() => calculateWeek({ ...week, eligibleCreditCentsPerHour: '0' }), /eligibleCredit/);
  assert.throws(() => calculateWeek({ ...week, overtimeBaseCentsPerHour: 3199 }), /overtimeBase/);
  assert.throws(() => calculateWeek({ ...week, overtimeBaseCentsPerHour: null }), /overtimeBase/);
  assert.throws(() => calculateWeek({ ...week, baseCentsPerHour: Number.MAX_SAFE_INTEGER }), /safe integer range/);
  assert.equal(calculateWeek({ ...week, workedMinutes: 10080 }).overtimeMinutes, 7680);
});

test('parses exact dollar strings for user interfaces', () => {
  assert.equal(parseHourlyRateCents(' 32.05 '), 3205);
  assert.equal(parseHourlyRateCents('001.5'), 150);
  assert.equal(parseHourlyRateCents('0'), 0);
  for (const value of ['90071992547409.92', '1.001', '-1', '1e2', '$2', '', '1.']) {
    assert.throws(() => parseHourlyRateCents(value), RangeError);
  }
  assert.throws(() => parseHourlyRateCents(1), TypeError);
});

test('GitHub Pages module matches the package source byte for byte', () => {
  assert.deepEqual(readFileSync(new URL('../docs/lib.js', import.meta.url)),
    readFileSync(new URL('../src/index.js', import.meta.url)));
});
