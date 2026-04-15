import { ReviewIqDemoShell } from "@/components/reviewiq/reviewiq-demo-shell";
import { getDemoCustomers } from "@/lib/reviewiq/demo-store";

export const dynamic = "force-dynamic";

export default function HomePage() {
  const customers = getDemoCustomers();

  return <ReviewIqDemoShell customers={customers} />;
}
