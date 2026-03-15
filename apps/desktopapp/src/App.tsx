import { registryModules, REGISTRY_APP_NAME } from "@registry/config";
import { registryCssVariables } from "@registry/ui";
import type { CSSProperties } from "react";

export function App() {
  return (
    <div className="desktop-shell" style={registryCssVariables as CSSProperties}>
      <div className="desktop-shell__panel">
        <p className="desktop-shell__eyebrow">Desktop Placeholder</p>
        <h1>{REGISTRY_APP_NAME}</h1>
        <p className="desktop-shell__summary">
          Tauri shell for future offline-adjacent and operator-focused desktop workflows.
        </p>

        <div className="desktop-shell__modules">
          {registryModules.map((module) => (
            <article className="desktop-shell__module" key={module.key}>
              <h2>{module.title}</h2>
              <p>{module.description}</p>
            </article>
          ))}
        </div>

        <div className="desktop-shell__status">
          <span>Vite shell verified now</span>
          <span>Tauri runtime ready when native tooling is available</span>
        </div>
      </div>
    </div>
  );
}
