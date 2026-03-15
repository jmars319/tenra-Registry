import { ModulePage } from "../../src/components/module-page";

export default function SettingsPage() {
  return (
    <ModulePage
      title="Settings"
      summary="Organization defaults, operator access, and future integration configuration."
      statusNote="The shared auth package currently defines roles and session shape without committing to an auth provider."
    />
  );
}
