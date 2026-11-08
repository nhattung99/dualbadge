import { notFound } from "next/navigation";
import Link from "next/link";
import { BadgeDetail } from "@/components/badge-views";
export const metadata = { title: "Badge details" };
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[1-9]\d{0,77}$/.test(id) || BigInt(id) >= 1n << 256n) notFound();
  return <><Link className="text-button back" href="/">← Explore badges</Link><BadgeDetail id={id} /></>;
}
