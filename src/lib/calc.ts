export type Inputs = {
  startingAmount: number;
  monthlyContribution: number;
  years: number;
  annualReturnPct: number;
  inflationPct: number;
};

export function calculateFV({
  startingAmount,
  monthlyContribution,
  years,
  annualReturnPct,
  inflationPct,
}: Inputs) {
  const months = years * 12;
  const r = annualReturnPct / 100 / 12;
  const inflation = inflationPct / 100 / 12;

  const growth = Math.pow(1 + r, months);

  const futureLump = startingAmount * growth;
  const futureContrib =
    r === 0
      ? monthlyContribution * months
      : monthlyContribution * ((growth - 1) / r);

  const nominal = futureLump + futureContrib;

  const inflationFactor = Math.pow(1 + inflation, months);
  const real = nominal / inflationFactor;

  return {
    nominal,
    real,
  };
}