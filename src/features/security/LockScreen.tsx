import { useState } from "react";

import krewsonLawLogo from "@/assets/krewson-law-logo.jpg";

type LockScreenProps = {
  checking: boolean;
  onUnlock: (passphrase: string) => Promise<boolean>;
};

export function LockScreen({ checking, onUnlock }: LockScreenProps) {
  const [error, setError] = useState<string | null>(null);
  const [isUnlocking, setIsUnlocking] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const passphrase = `${new FormData(form).get("passphrase") ?? ""}`;
    setIsUnlocking(true);
    setError(null);
    const unlocked = await onUnlock(passphrase);
    setIsUnlocking(false);
    if (!unlocked) {
      setError("That passphrase did not unlock this workspace.");
      form.reset();
    }
  }

  return (
    <main className="security-gate">
      <section className="security-gate-card" aria-live="polite">
        <img
          alt="Krewson Law LLC, Employment Law and HR Consulting"
          className="security-gate-logo"
          src={krewsonLawLogo}
        />
        <div className="security-gate-mark" aria-hidden="true">
          KL
        </div>
        <div>
          <div className="eyebrow">Protected workspace</div>
          <h1>{checking ? "Opening securely" : "Welcome back"}</h1>
          <p>
            {checking
              ? "Checking the local protection status before loading client records."
              : "Enter the local passphrase to decrypt time, client, invoice, and backup records."}
          </p>
        </div>

        {checking ? (
          <div className="security-gate-progress" role="status">
            <span className="status-dot" aria-hidden="true" />
            Checking encrypted storage
          </div>
        ) : (
          <form className="security-gate-form" onSubmit={handleSubmit}>
            <label className="field">
              <span className="field-label">Workspace passphrase</span>
              <input
                autoFocus
                autoComplete="current-password"
                className="text-input"
                disabled={isUnlocking}
                name="passphrase"
                required
                type="password"
              />
            </label>
            {error ? (
              <div
                className="billing-export-status"
                data-tone="danger"
                role="alert"
              >
                {error}
              </div>
            ) : null}
            <button
              className="button-primary"
              disabled={isUnlocking}
              type="submit"
            >
              {isUnlocking ? "Decrypting..." : "Unlock workspace"}
            </button>
          </form>
        )}
      </section>
    </main>
  );
}
