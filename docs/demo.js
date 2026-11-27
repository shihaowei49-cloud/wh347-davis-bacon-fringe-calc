import { calculateWeek, parseHourlyRateCents } from './lib.js';

const byId = (id) => document.getElementById(id);
const form = byId('week-form');
const status = byId('status');
const outputIds = ['gross', 'overtime', 'basic', 'premium', 'cash', 'benefits'];
const wholeDollars = new Intl.NumberFormat('en-US');

function currency(cents) {
  const value = BigInt(cents);
  return `$${wholeDollars.format(value / 100n)}.${String(value % 100n).padStart(2, '0')}`;
}

function duration(minutes) {
  return `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
}

function clearOutput() {
  for (const id of outputIds) byId(id).textContent = '—';
}

function render() {
  status.className = 'status';
  try {
    const extraRate = byId('overtime-base').value.trim();
    const payroll = calculateWeek({
      workedMinutes: byId('hours').valueAsNumber * 60 + byId('minutes').valueAsNumber,
      baseCentsPerHour: parseHourlyRateCents(byId('base').value),
      requiredFringeCentsPerHour: parseHourlyRateCents(byId('fringe').value),
      eligibleCreditCentsPerHour: parseHourlyRateCents(byId('credit').value),
      overtimeBaseCentsPerHour: extraRate ? parseHourlyRateCents(extraRate) : undefined,
    });
    const amounts = {
      gross: payroll.grossCashWagesCents, basic: payroll.basicWagesCents,
      premium: payroll.overtimePremiumCents, cash: payroll.cashInLieuCents, benefits: payroll.benefitCreditCents,
    };
    for (const [id, cents] of Object.entries(amounts)) byId(id).textContent = currency(cents);
    byId('overtime').textContent = duration(payroll.overtimeMinutes);
    status.textContent = `${duration(payroll.straightTimeMinutes)} straight time / ${currency(payroll.cashInLieuCentsPerHour)}/hr cash in lieu`;
  } catch (error) {
    clearOutput();
    status.textContent = error.message;
    status.classList.add('error');
  }
}

function loadSample() {
  form.reset();
  render();
}
form.addEventListener('submit', (event) => {
  event.preventDefault();
  render();
});
form.addEventListener('input', () => {
  clearOutput();
  status.className = 'status';
  status.textContent = 'Calculate the workweek to update the ledger.';
});
byId('sample').addEventListener('click', loadSample);
loadSample();
