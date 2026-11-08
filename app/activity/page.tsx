import { Activity } from "@/components/badge-views";
export const metadata = { title: "Activity" };
export default function Page() {
  return <><div className="page-heading"><span className="eyebrow">On-chain activity</span><h1>Activity</h1><p>Browse registry events and inspect their transactions in Rome Via.</p></div><Activity /></>;
}
