import { ModulePage } from "../../src/components/module-page";

export default function InvoicesPage() {
  return (
    <ModulePage
      title="Invoices"
      summary="Issued invoices, line items, balances, and a stable billing state model."
      statusNote="The initial scaffold includes contracts and validation for invoice creation and listing, ready for a future API surface."
    />
  );
}
