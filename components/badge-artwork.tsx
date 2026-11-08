import { useId } from "react";
import type { Artwork } from "@/lib/badge-presets";

const designs = {
  compass: { light: "#e0f2fe", dark: "#2563eb", icon: "M32 59 44 44 64 32 52 53 32 59ZM44 44l8 9M48 25v5M71 48h-5M48 71v-5M25 48h5" },
  torch: { light: "#fef3c7", dark: "#b45309", icon: "M49 69v-9M42 69h14M48 58c-12 0-15-12-9-19 1 5 5 5 6 4-1-9 5-14 10-17-1 8 3 11 5 15 4 9-2 17-12 17Z" },
  orbit: { light: "#dcfce7", dark: "#047857", icon: "M55 48a7 7 0 1 1-14 0 7 7 0 0 1 14 0ZM29 53c-2-5 4-12 15-17 11-5 21-6 23-1s-4 12-15 17c-11 5-21 6-23 1Zm5-19c5-3 14 1 22 10 8 8 11 17 7 20-4 4-14 0-22-8-8-9-11-18-7-22Z" },
  registry: { light: "#e0e7ff", dark: "#4338ca", icon: "m28 40 20-12 20 12-20 12-20-12Zm0 9 20 12 20-12M28 58l20 12 20-12" },
  rome: { light: "#ffedd5", dark: "#a44416", icon: "m29 42 19-12 19 12H29Zm3 23h32M36 45v16m12-16v16m12-16v16" },
  creator: { light: "#f3e8ff", dark: "#7e22ce", icon: "m48 27 5 13 14 1-11 9 4 14-12-8-12 8 4-14-11-9 14-1 5-13ZM66 29v10m-5-5h10M27 58v10m-5-5h10" },
  spark: { light: "#fef9c3", dark: "#a16207", icon: "m53 27-17 24h12l-5 18 18-25H49l4-17Z" },
  swap: { light: "#ccfbf1", dark: "#0f766e", icon: "M27 40h40m-8-8 8 8-8 8M69 56H29m8-8-8 8 8 8" },
  bridge: { light: "#e0f2fe", dark: "#0369a1", icon: "M26 62h44M33 60V37m30 23V37M33 41c9 12 21 12 30 0M42 50v10m12-10v10" },
  crown: { light: "#ffe4e6", dark: "#be123c", icon: "m28 36 10 9 10-14 10 14 10-9-5 25H33l-5-25Zm7 31h26" },
} satisfies Record<Artwork, { light: string; dark: string; icon: string }>;

export function BadgeArtwork({ artwork }: { artwork: Artwork }) {
  const gradient = useId();
  const { light, dark, icon } = designs[artwork];
  return <svg viewBox="0 0 96 96" fill="none" aria-hidden="true">
    <defs><linearGradient id={gradient} x1="15" y1="8" x2="77" y2="88" gradientUnits="userSpaceOnUse">
      <stop stopColor="#fff" /><stop offset="1" stopColor={light} />
    </linearGradient></defs>
    <path d="M48 4 86 26v44L48 92 10 70V26Z" fill={light} stroke={dark} strokeWidth="2" />
    <path d="M48 12 79 30v36L48 84 17 66V30Z" fill={"url(#" + gradient + ")"} stroke={dark} strokeWidth="1" />
    <path d="M48 18v4m0 52v4M22 48h4m44 0h4" stroke={dark} strokeWidth="1.5" strokeLinecap="round" />
    <path d={icon} stroke={dark} strokeWidth="2.7" strokeLinecap="round" strokeLinejoin="round" />
  </svg>;
}
