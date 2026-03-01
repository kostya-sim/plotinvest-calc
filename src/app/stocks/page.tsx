"use client";

import { useMemo, useState } from "react";
import { calculateFV } from "@/lib/calc";

export default function StocksPage() {
  const [starting, setStarting] = useState(10000);
  const [monthly, setMonthly] = useState(500);
  const [years, setYears] = useState(10);
  const [returnPct, setReturnPct] = useState(8);
  const [inflation, setInflation] = useState(3);

  const result = useMemo(() => {
    return calculateFV({
      startingAmount: starting,
      monthlyContribution: monthly,
      years,
      annualReturnPct: returnPct,
      inflationPct: inflation,
    });
  }, [starting, monthly, years, returnPct, inflation]);

  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
      <div className="w-full max-w-xl bg-white rounded-xl shadow p-6 space-y-6">
        <h1 className="text-2xl font-semibold">
          PlotInvest Future Value Calculator
        </h1>

        <div className="grid gap-4">
          <Input label="Starting Amount" value={starting} setValue={setStarting} />
          <Input label="Monthly Contribution" value={monthly} setValue={setMonthly} />
          <Input label="Years" value={years} setValue={setYears} />
          <Input label="Expected Return (%)" value={returnPct} setValue={setReturnPct} />
          <Input label="Inflation (%)" value={inflation} setValue={setInflation} />
        </div>

        <div className="border-t pt-4 space-y-2">
          <div className="flex justify-between">
            <span>Future Value (Nominal)</span>
            <span className="font-semibold">
              ${result.nominal.toLocaleString(undefined, { maximumFractionDigits: 0 })}
            </span>
          </div>
          <div className="flex justify-between">
            <span>Future Value (Real)</span>
            <span className="font-semibold">
              ${result.real.toLocaleString(undefined, { maximumFractionDigits: 0 })}
            </span>
          </div>
        </div>
      </div>
    </main>
  );
}

function Input({
  label,
  value,
  setValue,
}: {
  label: string;
  value: number;
  setValue: (v: number) => void;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-sm text-gray-600">{label}</label>
      <input
        type="number"
        value={value}
        onChange={(e) => setValue(Number(e.target.value))}
        className="border rounded-md px-3 py-2"
      />
    </div>
  );
}
