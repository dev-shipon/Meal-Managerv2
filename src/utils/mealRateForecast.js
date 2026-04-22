/** Safe number for forecast math */
function n(v) {
  const x = Number(v);
  return Number.isFinite(x) ? x : 0;
}

/**
 * One row per calendar day in `selectedMonth` (YYYY-MM).
 */
export function buildDailySnapshotsForMonth(selectedMonth, meals, monthlyBazarList) {
  const parts = String(selectedMonth).split('-');
  const y = Number(parts[0]);
  const m = Number(parts[1]);
  if (!y || !m) return [];
  const dim = new Date(y, m, 0).getDate();
  const ym = `${y}-${String(m).padStart(2, '0')}`;
  const out = [];
  for (let d = 1; d <= dim; d++) {
    const key = `${ym}-${String(d).padStart(2, '0')}`;
    const dayMeals = meals[key];
    let mealSum = 0;
    if (dayMeals && typeof dayMeals === 'object') {
      mealSum = Object.values(dayMeals).reduce((s, v) => s + n(v), 0);
    }
    const bazarSum = monthlyBazarList
      .filter((b) => String(b.date || '').slice(0, 10) === key)
      .reduce((s, b) => s + n(b.amount), 0);
    out.push({ key, mealSum, bazarSum });
  }
  return out;
}

function trailingWeightedAverage(rows, getVal, halfLife = 3.5) {
  if (!rows.length) return 0;
  let num = 0;
  let den = 0;
  rows.forEach((row, idx) => {
    const age = rows.length - 1 - idx;
    const wi = Math.pow(0.5, age / halfLife);
    const val = n(getVal(row));
    num += wi * val;
    den += wi;
  });
  return den > 0 ? num / den : 0;
}

/**
 * Month-end meal rate projection using:
 * - calendar linear pace,
 * - trailing (recency-weighted) daily meals & bazar,
 * - bazar "shopping day" frequency (many zero-bazar days in messes).
 */
export function computeAdvancedMealRateProjection({
  selectedMonth,
  meals,
  monthlyBazarList,
  totalMealsFromRecords,
  totalFineMeals,
  totalBazarAmount,
  timeline,
}) {
  const dim = timeline.daysInMonth;
  const elapsed = Math.max(1, Math.min(timeline.calendarDaysElapsed, dim));
  const observedMealDays = Math.max(1, timeline.observedMealDays);
  const isCurrent = timeline.isCurrentMonth;
  const rem = isCurrent ? Math.max(0, dim - elapsed) : 0;

  const daily = buildDailySnapshotsForMonth(selectedMonth, meals, monthlyBazarList);
  const past = daily.slice(0, elapsed);

  const coverage = Math.min(1, observedMealDays / elapsed);

  const linearMealDaily = totalMealsFromRecords / elapsed;
  const trailMealDaily = trailingWeightedAverage(past, (d) => d.mealSum, 3.5);
  const mealDailyBlend =
    coverage >= 0.72 ? 0.58 * trailMealDaily + 0.42 * linearMealDaily : 0.32 * trailMealDaily + 0.68 * linearMealDaily;

  const bazarActive = past.filter((d) => d.bazarSum > 0);
  const bazarActiveCount = bazarActive.length;
  const avgBazarWhenPurchase =
    bazarActiveCount > 0
      ? bazarActive.reduce((s, d) => s + d.bazarSum, 0) / bazarActiveCount
      : totalBazarAmount / elapsed;
  const purchaseDayRate = elapsed > 0 ? bazarActiveCount / elapsed : 0;
  const bazarDailyExpect = avgBazarWhenPurchase * purchaseDayRate;

  const linearBazarDaily = totalBazarAmount / elapsed;
  const trailBazarDaily = trailingWeightedAverage(past, (d) => d.bazarSum, 4);
  const bazarDailyBlend =
    coverage >= 0.55
      ? 0.48 * trailBazarDaily + 0.32 * bazarDailyExpect + 0.2 * linearBazarDaily
      : 0.26 * trailBazarDaily + 0.36 * bazarDailyExpect + 0.38 * linearBazarDaily;

  const projRegularMeals = totalMealsFromRecords + rem * Math.max(0, mealDailyBlend);
  const projectedTotalMeals = Math.round(
    Math.max(totalMealsFromRecords + totalFineMeals, projRegularMeals + totalFineMeals)
  );

  const projectedBazarRaw = totalBazarAmount + rem * Math.max(0, bazarDailyBlend);
  const projectedTotalBazar = Math.max(totalBazarAmount, Number(projectedBazarRaw.toFixed(2)));

  const estimatedMealRate = projectedTotalMeals > 0 ? projectedTotalBazar / projectedTotalMeals : 0;

  return {
    estimatedMealRate,
    projectedTotalMeals,
    projectedTotalBazar,
    meta: {
      coverage: Number(coverage.toFixed(3)),
      mealDailyBlend: Number(mealDailyBlend.toFixed(4)),
      bazarDailyBlend: Number(bazarDailyBlend.toFixed(2)),
      linearMealDaily: Number(linearMealDaily.toFixed(4)),
      trailMealDaily: Number(trailMealDaily.toFixed(4)),
      purchaseDayRate: Number(purchaseDayRate.toFixed(3)),
      bazarActiveDays: bazarActiveCount,
      remainingDays: rem,
    },
  };
}
