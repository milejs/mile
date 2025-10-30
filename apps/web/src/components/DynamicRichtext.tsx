"use client";
import dynamic from "next/dynamic";

// import Richtext on the client side only
export const Richtext = dynamic(() => import("./Richtext"), { ssr: false });
