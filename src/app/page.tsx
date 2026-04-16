import { ReviewIqDemoShell } from "@/components/reviewiq/reviewiq-demo-shell";
import { getDemoCustomers } from "@/lib/reviewiq/demo-store";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const customers = await getDemoCustomers();

  return <ReviewIqDemoShell customers={customers} />;
}
