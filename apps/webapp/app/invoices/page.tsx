import { registryWebRoutes } from "@registry/config";
import { redirect } from "next/navigation";

export default function InvoicesPage() {
  redirect(registryWebRoutes.receivables);
}
