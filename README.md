# WH-347 Davis-Bacon fringe calculator

Reconcile cash wages, overtime premium, and fringe for one worker in a single classification on a single covered federal project and workweek. Pure ESM, MIT licensed, and dependency-free. [Open the workweek calculator](https://shihaowei49-cloud.github.io/wh347-davis-bacon-fringe-calc/).

## Use it

Run this under Node.js 20+ from the repository root. The package entry point also works in an installed copy.

```js
import { calculateWeek, parseHourlyRateCents } from 'wh347-davis-bacon-fringe-calc';

const payroll = calculateWeek({
  workedMinutes: 46 * 60,
  baseCentsPerHour: parseHourlyRateCents('32.00'),
  requiredFringeCentsPerHour: 1450,
  eligibleCreditCentsPerHour: 900,
});

console.log(payroll.overtimeMinutes); // 360
console.log(payroll.cashInLieuCents); // 25300
console.log(payroll.benefitCreditCents); // 41400
console.log(payroll.grossCashWagesCents); // 182100
```

`calculateWeek(input)` accepts integer minutes from 0 to 10,080 and safe integer hourly rates in cents. The basic cash rate must be positive. Enter a substantiated hourly credit and the required hourly fringe from the applicable wage determination. Set `overtimeBaseCentsPerHour` to a higher, independently determined premium basis when appropriate. The default is the basic cash rate. Account for any additional earnings that raised the basis in your payroll ledger.

| Returned field | Calculation |
| --- | --- |
| `straightTimeMinutes`, `overtimeMinutes` | First 40 covered hours and covered minutes above 40 hours |
| `basicWagesCents` | All worked minutes at the basic cash rate |
| `overtimePremiumCents` | Overtime minutes at half the premium basis, in addition to basic pay already counted |
| `claimedCreditCentsPerHour`, `cashInLieuCentsPerHour` | Credit capped at required fringe, with the remainder paid as cash in lieu |
| `benefitCreditCents` | The capped credit rate applied across all worked minutes |
| `cashInLieuCents` | Rounded required fringe for all worked minutes minus rounded benefit credit, with a minimum of zero |
| `grossCashWagesCents` | Basic wages plus the overtime premium and cash in lieu |
| `overtimeBaseCentsPerHour` | The basis actually used for the premium |

Basic wages, overtime premium, total required fringe, and benefit credit are each rounded to the nearest cent, with ties up. Gross cash sums basic wages, overtime premium, and the resulting cash in lieu. All values are JSON-safe numbers. Invalid input and out-of-range results throw. `parseHourlyRateCents(text)` converts unsigned plain dollar strings with up to two fractional digits into safe integer cents.

The worksheet assumes the full required basic wage is paid in cash and that cash in lieu is genuine, separately identified fringe. It covers weekly overtime under the stated single-project assumptions. Classification and coverage determinations, mixed work, calculating a regular rate from other earnings, benefit-plan eligibility and annualization, state or daily overtime, taxes and deductions, and completing or certifying the form require separate calculations or review. [DOL fringe benefit requirements](https://www.dol.gov/agencies/whd/fact-sheets/66E-DBRA-compliance-fringe-benefit-requirements) and [DOL WH-347 instructions](https://www.dol.gov/agencies/whd/forms/wh347)

## Test and preview

```sh
node --test
```

When updating the source, copy `src/index.js` to `docs/lib.js` before testing. The suite checks byte parity. Serve `docs/` via static HTTP or select **Deploy from a branch** and **/docs** in GitHub Pages.

For the certified payroll handoff, see [WH347Pack](https://wh347.shihaoeth.site/?utm_source=github_oss&utm_medium=repo_pages&utm_campaign=quality_wave_a). To prepare the project's progress billing documents, see [PayApp Pack](https://payapp.shihaoeth.site/?utm_source=github_oss&utm_medium=repo_pages&utm_campaign=quality_wave_a).
