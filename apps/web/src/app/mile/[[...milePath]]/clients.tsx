"use client";

import "@milejs/core/mile.css";
import { Mile } from "@milejs/core";
import { useRouter } from "next/navigation";
import { mileconfig } from "../../../mile.config";
import { MileProvider } from "@milejs/core/client";

export default function MileClient({ data, params, searchParams }: { data: any; params: Promise<{ milePath?: string[] }>; searchParams: Promise<{ [key: string]: string | string[] | undefined }> }) {
  const router = useRouter();

  return (
    <MileProvider config={mileconfig}>
      <Mile data={data} params={params} searchParams={searchParams} router={router} />
    </MileProvider>
  );
}

