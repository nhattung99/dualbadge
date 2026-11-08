import { Catalog } from "@/components/badge-views";
export const metadata = { title: "Dashboard" };
export default function Page() {
  return <><div className="page-heading"><span className="eyebrow">Wallet workspace</span><h1>Dashboard</h1><p>Review your wallet identity and achievements.</p></div><Catalog dashboard /></>;
}
