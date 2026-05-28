"use client";

import { useState } from "react";

interface FlagIconProps {
  iso2: string;
  countryName: string;
  /** sm = tile/table use, lg = hero use */
  size?: "sm" | "lg";
}

const SIZE_CLS = {
  sm: "h-4 w-6 rounded-sm",
  lg: "h-8 w-12 rounded",
};

const FALLBACK_CLS = {
  sm: "h-4 w-6 rounded-sm text-[9px]",
  lg: "h-8 w-12 rounded text-xs",
};

/**
 * Renders a country flag from flagcdn.com (no external package needed).
 * Falls back to an iso2 text badge if the image fails to load.
 */
export default function FlagIcon({
  iso2,
  countryName,
  size = "sm",
}: FlagIconProps) {
  const [failed, setFailed] = useState(false);

  if (!iso2 || failed) {
    return (
      <span
        className={`inline-flex items-center justify-center ${FALLBACK_CLS[size]}
                    bg-slate-200 text-slate-600 font-bold object-cover`}
      >
        {iso2 || "?"}
      </span>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={`https://flagcdn.com/w40/${iso2.toLowerCase()}.png`}
      alt={`${countryName} flag`}
      className={`${SIZE_CLS[size]} object-cover`}
      onError={() => setFailed(true)}
    />
  );
}
