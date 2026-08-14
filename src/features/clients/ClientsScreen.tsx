import { useState } from "react";

import type {
  ClientRecord,
  ClientRecordInput,
  MatterRecord,
  MatterRecordInput,
} from "@/features/time/types";
import type { UseTimeTrackerResult } from "@/features/time/useTimeTracker";
import { formatCurrency } from "@/features/time/utils";
import { PageHeader } from "@/shared/ui/PageHeader";

type ClientsScreenProps = {
  tracker: UseTimeTrackerResult;
};

export function ClientsScreen({ tracker }: ClientsScreenProps) {
  const [selectedClientId, setSelectedClientId] = useState(
    tracker.clientRecords[0]?.id ?? ""
  );

  const selectedClient =
    tracker.clientRecords.find((client) => client.id === selectedClientId) ??
    tracker.clientRecords[0] ??
    null;
  const selectedMatters = selectedClient
    ? tracker.matterRecords.filter(
        (matter) => matter.clientId === selectedClient.id
      )
    : [];

  function handleAddClient(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const form = event.currentTarget;
    const formData = new FormData(form);
    const newClientId = tracker.addClient(buildClientInput(formData));
    setSelectedClientId(newClientId);
    form.reset();
  }

  function handleUpdateClient(
    event: React.FormEvent<HTMLFormElement>,
    client: ClientRecord
  ) {
    event.preventDefault();

    const formData = new FormData(event.currentTarget);
    tracker.updateClient({
      ...client,
      ...buildClientInput(formData),
    });
  }

  function handleAddMatter(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!selectedClient) {
      return;
    }

    const form = event.currentTarget;
    const formData = new FormData(form);

    tracker.addMatter({
      ...buildMatterInput(formData),
      clientId: selectedClient.id,
    });
    form.reset();
  }

  function handleUpdateMatter(
    event: React.FormEvent<HTMLFormElement>,
    matter: MatterRecord
  ) {
    event.preventDefault();

    const formData = new FormData(event.currentTarget);
    tracker.updateMatter({
      ...matter,
      ...buildMatterInput(formData),
    });
  }

  return (
    <div className="screen-grid">
      <PageHeader
        eyebrow="Client records"
        title="Clients"
        description="Manage billing contacts, client rates, instructions, and matters from one directory."
      />

      <section className="records-layout">
        <aside className="records-directory-card">
          <div className="records-section-head">
            <div>
              <div className="eyebrow">Directory</div>
              <h3 className="records-section-title">Client list</h3>
              <p className="records-section-copy">
                Choose a client to edit or add a new one below.
              </p>
            </div>
            <div className="records-section-chip">Stored locally</div>
          </div>

          <div className="records-directory-list">
            {tracker.clientRecords.map((client) => (
              <button
                key={client.id}
                type="button"
                className={`records-directory-item${
                  client.id === selectedClient?.id ? " is-active" : ""
                }`}
                onClick={() => setSelectedClientId(client.id)}
              >
                <span className="records-directory-name">{client.name}</span>
                <span className="records-directory-meta">
                  {client.status === "archived"
                    ? "Archived"
                    : client.rateOverride
                      ? `Override ${formatCurrency(client.rateOverride)}/hr`
                      : `Standard ${tracker.getEstimatedRateLabel(null)}`}
                </span>
              </button>
            ))}
          </div>

          <form className="records-create-form" onSubmit={handleAddClient}>
            <div className="records-mini-head">Add client</div>
            <label className="field">
              <span className="field-label">Client name</span>
              <input
                className="text-input"
                name="name"
                placeholder="New client"
                required
              />
            </label>
            <label className="field">
              <span className="field-label">Contact name</span>
              <input
                className="text-input"
                name="contactName"
                placeholder="Billing contact"
              />
            </label>
            <label className="field">
              <span className="field-label">Rate override</span>
              <input
                className="text-input"
                min="0"
                name="rateOverride"
                placeholder="Optional"
                step="1"
                type="number"
              />
            </label>
            <button className="button-primary" type="submit">
              Save client
            </button>
          </form>
        </aside>

        <div className="records-main-column">
          {selectedClient ? (
            <>
              <section className="records-detail-card">
                <div className="records-section-head">
                  <div>
                    <div className="eyebrow">Selected client</div>
                    <h3 className="records-section-title">
                      {selectedClient.name}
                    </h3>
                    <p className="records-section-copy">
                      These billing and contact details flow into new invoice
                      records and PDFs.
                    </p>
                  </div>
                  <div className="records-header-actions">
                    <div className="records-section-chip">
                      {selectedClient.status === "archived"
                        ? "Archived"
                        : "Active"}
                    </div>
                    <button
                      aria-label={
                        selectedClient.status === "archived"
                          ? "Restore client"
                          : "Archive client"
                      }
                      className={
                        selectedClient.status === "archived"
                          ? "button-secondary"
                          : "icon-button-danger"
                      }
                      title={
                        selectedClient.status === "archived"
                          ? "Restore client"
                          : "Archive client"
                      }
                      type="button"
                      onClick={() => {
                        const nextStatus =
                          selectedClient.status === "archived"
                            ? "active"
                            : "archived";
                        const confirmed =
                          nextStatus === "active" ||
                          window.confirm(
                            `Archive ${selectedClient.name}? Historical time and invoices will be preserved.`
                          );
                        if (confirmed) {
                          tracker.updateClient({
                            ...selectedClient,
                            status: nextStatus,
                          });
                        }
                      }}
                    >
                      {selectedClient.status === "archived" ? (
                        "Restore"
                      ) : (
                        <TrashIcon />
                      )}
                    </button>
                  </div>
                </div>

                <form
                  key={selectedClient.id}
                  className="composer-form"
                  onSubmit={(event) =>
                    handleUpdateClient(event, selectedClient)
                  }
                >
                  <div className="field-grid">
                    <label className="field">
                      <span className="field-label">Client name</span>
                      <input
                        className="text-input"
                        defaultValue={selectedClient.name}
                        name="name"
                        required
                      />
                    </label>
                    <label className="field">
                      <span className="field-label">Status</span>
                      <select
                        className="text-input"
                        defaultValue={selectedClient.status}
                        name="status"
                      >
                        <option value="active">Active</option>
                        <option value="archived">Archived</option>
                      </select>
                    </label>
                  </div>

                  <div className="field-grid">
                    <label className="field">
                      <span className="field-label">Contact name</span>
                      <input
                        className="text-input"
                        defaultValue={selectedClient.contactName}
                        name="contactName"
                      />
                    </label>
                    <label className="field">
                      <span className="field-label">Contact email</span>
                      <input
                        className="text-input"
                        defaultValue={selectedClient.contactEmail}
                        name="contactEmail"
                      />
                    </label>
                  </div>

                  <div className="field-grid">
                    <label className="field">
                      <span className="field-label">Contact phone</span>
                      <input
                        className="text-input"
                        defaultValue={selectedClient.contactPhone}
                        name="contactPhone"
                      />
                    </label>
                    <label className="field">
                      <span className="field-label">Rate override</span>
                      <input
                        className="text-input"
                        defaultValue={selectedClient.rateOverride ?? ""}
                        min="0"
                        name="rateOverride"
                        placeholder={`Standard ${tracker.getEstimatedRateLabel(null)}`}
                        step="1"
                        type="number"
                      />
                    </label>
                  </div>

                  <label className="field">
                    <span className="field-label">Address</span>
                    <textarea
                      className="text-area"
                      defaultValue={selectedClient.address}
                      name="address"
                      rows={3}
                    />
                  </label>

                  <label className="field">
                    <span className="field-label">Billing instructions</span>
                    <textarea
                      className="text-area"
                      defaultValue={selectedClient.billingInstructions}
                      name="billingInstructions"
                      rows={3}
                    />
                  </label>

                  <label className="field">
                    <span className="field-label">Notes</span>
                    <textarea
                      className="text-area"
                      defaultValue={selectedClient.notes}
                      name="notes"
                      rows={3}
                    />
                  </label>

                  <div className="button-row">
                    <button className="button-primary" type="submit">
                      Save client changes
                    </button>
                  </div>
                </form>
              </section>

              <section className="records-detail-card">
                <div className="records-section-head">
                  <div>
                    <div className="eyebrow">Client matters</div>
                    <h3 className="records-section-title">Matters</h3>
                    <p className="records-section-copy">
                      Open matters are available during time and client-expense
                      entry.
                    </p>
                  </div>
                  <div className="records-section-chip">
                    {selectedMatters.length} matter
                    {selectedMatters.length === 1 ? "" : "s"}
                  </div>
                </div>

                <div className="records-matter-stack">
                  {selectedMatters.map((matter) => (
                    <form
                      key={matter.id}
                      className="records-matter-card"
                      onSubmit={(event) => handleUpdateMatter(event, matter)}
                    >
                      <div className="field-grid">
                        <label className="field">
                          <span className="field-label">Matter name</span>
                          <input
                            className="text-input"
                            defaultValue={matter.name}
                            name="name"
                            required
                          />
                        </label>
                        <label className="field">
                          <span className="field-label">Status</span>
                          <select
                            className="text-input"
                            defaultValue={matter.status}
                            name="status"
                          >
                            <option value="open">Open</option>
                            <option value="closed">Closed</option>
                            <option value="archived">Archived</option>
                          </select>
                        </label>
                      </div>

                      <div className="field-grid">
                        <label className="field">
                          <span className="field-label">
                            Default task/category
                          </span>
                          <input
                            className="text-input"
                            defaultValue={matter.defaultTaskCategory}
                            name="defaultTaskCategory"
                          />
                        </label>
                        <label className="field">
                          <span className="field-label">Description</span>
                          <input
                            className="text-input"
                            defaultValue={matter.description}
                            name="description"
                          />
                        </label>
                      </div>

                      <label className="field">
                        <span className="field-label">Notes</span>
                        <textarea
                          className="text-area"
                          defaultValue={matter.notes}
                          name="notes"
                          rows={3}
                        />
                      </label>

                      <div className="button-row">
                        <button className="button-secondary" type="submit">
                          Save matter
                        </button>
                      </div>
                    </form>
                  ))}
                </div>

                <form
                  className="records-create-form"
                  onSubmit={handleAddMatter}
                >
                  <div className="records-mini-head">
                    Add matter to {selectedClient.name}
                  </div>
                  <div className="field-grid">
                    <label className="field">
                      <span className="field-label">Matter name</span>
                      <input className="text-input" name="name" required />
                    </label>
                    <label className="field">
                      <span className="field-label">Default task/category</span>
                      <input
                        className="text-input"
                        name="defaultTaskCategory"
                      />
                    </label>
                  </div>
                  <label className="field">
                    <span className="field-label">Description</span>
                    <input className="text-input" name="description" />
                  </label>
                  <label className="field">
                    <span className="field-label">Notes</span>
                    <textarea className="text-area" name="notes" rows={3} />
                  </label>
                  <label className="field">
                    <span className="field-label">Status</span>
                    <select
                      className="text-input"
                      defaultValue="open"
                      name="status"
                    >
                      <option value="open">Open</option>
                      <option value="closed">Closed</option>
                      <option value="archived">Archived</option>
                    </select>
                  </label>
                  <button className="button-primary" type="submit">
                    Save matter
                  </button>
                </form>
              </section>
            </>
          ) : (
            <section className="records-detail-card">
              <div className="empty-state">
                Create your first client record to start organizing matters and
                tracking work against actual records.
              </div>
            </section>
          )}
        </div>
      </section>
    </div>
  );
}

function TrashIcon() {
  return (
    <svg
      aria-hidden="true"
      fill="none"
      height="18"
      viewBox="0 0 24 24"
      width="18"
    >
      <path
        d="M4 7h16M9 7V4h6v3m3 0-1 13H7L6 7m4 4v5m4-5v5"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}

function buildClientInput(formData: FormData): ClientRecordInput {
  const rateOverrideValue = `${formData.get("rateOverride") ?? ""}`.trim();

  return {
    address: `${formData.get("address") ?? ""}`.trim(),
    billingInstructions: `${formData.get("billingInstructions") ?? ""}`.trim(),
    contactEmail: `${formData.get("contactEmail") ?? ""}`.trim(),
    contactName: `${formData.get("contactName") ?? ""}`.trim(),
    contactPhone: `${formData.get("contactPhone") ?? ""}`.trim(),
    name: `${formData.get("name") ?? ""}`.trim(),
    notes: `${formData.get("notes") ?? ""}`.trim(),
    rateOverride: rateOverrideValue ? Number(rateOverrideValue) : null,
    status:
      `${formData.get("status") ?? "active"}` === "archived"
        ? "archived"
        : "active",
  };
}

function buildMatterInput(
  formData: FormData
): Omit<MatterRecordInput, "clientId"> {
  const statusValue = `${formData.get("status") ?? "open"}`;

  return {
    defaultTaskCategory: `${formData.get("defaultTaskCategory") ?? ""}`.trim(),
    description: `${formData.get("description") ?? ""}`.trim(),
    name: `${formData.get("name") ?? ""}`.trim(),
    notes: `${formData.get("notes") ?? ""}`.trim(),
    status:
      statusValue === "closed" || statusValue === "archived"
        ? statusValue
        : "open",
  };
}
