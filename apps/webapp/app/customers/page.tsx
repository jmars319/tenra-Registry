import { ModulePage } from "../../src/components/module-page";

export default function CustomersPage() {
  return (
    <ModulePage
      title="Customers"
      summary="Customer records, billing contacts, operating notes, and future account history."
      statusNote="The initial scaffold establishes the route and shared package wiring. Real customer persistence comes in the next pass."
    />
  );
}
