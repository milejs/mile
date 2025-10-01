"use client";

import { MileProvider } from "@milejs/core/client";
import { ReactNode } from "react";
import { mileconfig } from "../mile.config"

export function Providers({ children }: { children: ReactNode }) {
  return <MileProvider config={mileconfig}>{children}</MileProvider>;
}
