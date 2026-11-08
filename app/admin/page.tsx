import { Admin } from "@/components/badge-views";
export const metadata = { title: "Admin" };
export default function Page() {
  return <><div className="page-heading"><span className="eyebrow">Registry owner</span><h1>Badge administration</h1><p>Publish badge types and control mint availability.</p></div><Admin /></>;
}
