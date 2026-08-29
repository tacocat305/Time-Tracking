import { fireEvent, render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import App from "../App";

describe("production workspace", () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.restoreAllMocks();
  });

  it("starts empty without fictional demo records", () => {
    render(<App />);

    expect(
      screen.getByText("Start with your first client")
    ).toBeInTheDocument();
    expect(screen.queryByText("Baker Holdings")).not.toBeInTheDocument();
    expect(screen.queryByText("Rowan Advisory")).not.toBeInTheDocument();
    expect(
      screen.getByText(
        "No entries yet today. Start a timer or save a manual entry and it will appear here immediately."
      )
    ).toBeInTheDocument();
  });

  it("accepts exact manual decimal hours without a spinner or rounding", () => {
    render(<App />);
    createClientAndMatter("Exact Hours Co.", "Advisory work");
    openScreen("Today");

    const hoursInput = screen.getByLabelText("Billable hours", {
      selector: "input[name='manual-billed-hours']",
    });
    expect(hoursInput).toHaveAttribute("type", "text");
    expect(hoursInput).toHaveValue("");

    createManualEntry(
      "Completed a short advisory task",
      "Exact Hours Co.",
      "Advisory work",
      "0.1"
    );

    expect(screen.getAllByText("0.1").length).toBeGreaterThan(0);
  });

  it("supports rapid manual entry with validation, keyboard save, and retained matter context", () => {
    render(<App />);
    createClientAndMatter("Rapid Entry Co.", "Daily advice");
    openScreen("Today");

    const clientSelect = screen.getByLabelText("Client", {
      selector: "select[name='manual-client']",
    });
    fireEvent.change(clientSelect, {
      target: {
        value: within(clientSelect)
          .getByRole("option", { name: "Rapid Entry Co." })
          .getAttribute("value"),
      },
    });
    const matterSelect = screen.getByLabelText("Matter", {
      selector: "select[name='manual-matter']",
    });
    expect(matterSelect).toHaveDisplayValue("Daily advice");
    fireEvent.change(
      screen.getByLabelText("Billable hours", {
        selector: "input[name='manual-billed-hours']",
      }),
      { target: { value: "25" } }
    );
    fireEvent.change(
      screen.getByLabelText("Narrative", {
        selector: "textarea[name='manual-narrative']",
      }),
      { target: { value: "Prepared employment advice" } }
    );
    fireEvent.click(screen.getByRole("button", { name: "Save manual entry" }));
    expect(
      screen.getByText(
        "Enter billable hours greater than 0 and no more than 24."
      )
    ).toBeInTheDocument();

    fireEvent.change(
      screen.getByLabelText("Billable hours", {
        selector: "input[name='manual-billed-hours']",
      }),
      { target: { value: ".25" } }
    );
    const form = screen
      .getByRole("button", { name: "Save manual entry" })
      .closest("form")!;
    fireEvent.keyDown(form, { key: "Enter", metaKey: true });

    expect(screen.getByText("Prepared employment advice")).toBeInTheDocument();
    expect(
      screen.getByText(/Saved 0.25 hours to Rapid Entry Co/)
    ).toBeInTheDocument();
    expect(clientSelect).toHaveDisplayValue("Rapid Entry Co.");
    expect(matterSelect).toHaveDisplayValue("Daily advice");
    expect(
      screen.getByLabelText("Billable hours", {
        selector: "input[name='manual-billed-hours']",
      })
    ).toHaveValue("");
  });

  it("warns before saving an identical manual entry twice", () => {
    render(<App />);
    createClientAndMatter("Duplicate Check Co.", "Daily counsel");
    openScreen("Today");
    createManualEntry(
      "Reviewed the same employment policy",
      "Duplicate Check Co.",
      "Daily counsel"
    );

    fireEvent.change(
      screen.getByLabelText("Billable hours", {
        selector: "input[name='manual-billed-hours']",
      }),
      { target: { value: "0.25" } }
    );
    fireEvent.change(
      screen.getByLabelText("Narrative", {
        selector: "textarea[name='manual-narrative']",
      }),
      { target: { value: "Reviewed the same employment policy" } }
    );
    fireEvent.click(screen.getByRole("button", { name: "Save manual entry" }));

    expect(
      screen.getByText(/An identical entry already exists/)
    ).toBeInTheDocument();
    expect(
      screen.getAllByText("Reviewed the same employment policy", {
        selector: ".activity-narrative",
      })
    ).toHaveLength(1);

    fireEvent.click(screen.getByRole("button", { name: "Save manual entry" }));
    expect(
      screen.getAllByText("Reviewed the same employment policy", {
        selector: ".activity-narrative",
      })
    ).toHaveLength(2);
  });

  it("creates real client and matter records, then edits and deletes time", () => {
    render(<App />);
    createClientAndMatter("North Shore Co.", "Handbook review");
    openScreen("Today");
    createManualEntry(
      "Reviewed handbook revisions",
      "North Shore Co.",
      "Handbook review"
    );

    expect(screen.getByText("Reviewed handbook revisions")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Edit" }));

    const dialog = screen.getByRole("dialog", { name: "Edit entry" });
    fireEvent.change(within(dialog).getByLabelText("Narrative"), {
      target: { value: "Revised handbook recommendations" },
    });
    fireEvent.change(within(dialog).getByLabelText("Billable hours"), {
      target: { value: "1.5" },
    });
    fireEvent.click(
      within(dialog).getByRole("button", { name: "Save entry changes" })
    );

    expect(
      screen.getByText("Revised handbook recommendations")
    ).toBeInTheDocument();
    expect(screen.getAllByText("1.5").length).toBeGreaterThan(0);

    vi.spyOn(window, "confirm").mockReturnValue(true);
    fireEvent.click(screen.getByRole("button", { name: "Delete" }));
    expect(
      screen.queryByText("Revised handbook recommendations")
    ).not.toBeInTheDocument();
  });

  it("edits a saved entry from the weekly historical review", () => {
    render(<App />);
    createClientAndMatter("Historical Review Co.", "Ongoing advice");
    openScreen("Today");
    createManualEntry(
      "Initial historical narrative",
      "Historical Review Co.",
      "Ongoing advice"
    );
    openScreen("Week");

    fireEvent.click(screen.getByRole("button", { name: "Edit" }));
    const dialog = screen.getByRole("dialog", { name: "Edit entry" });
    fireEvent.change(within(dialog).getByLabelText("Narrative"), {
      target: { value: "Corrected from weekly review" },
    });
    fireEvent.click(
      within(dialog).getByRole("button", { name: "Save entry changes" })
    );

    expect(
      screen.getByText("Corrected from weekly review")
    ).toBeInTheDocument();
  });

  it("archives and restores a client without deleting its history", () => {
    render(<App />);
    createClientAndMatter("Pine Legal Services", "Advisory support");

    vi.spyOn(window, "confirm").mockReturnValue(true);
    fireEvent.click(screen.getByRole("button", { name: "Archive client" }));
    expect(screen.getAllByText("Archived").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Pine Legal Services").length).toBeGreaterThan(
      0
    );

    fireEvent.click(screen.getByRole("button", { name: "Restore client" }));
    expect(screen.getAllByText("Active").length).toBeGreaterThan(0);
  });

  it("requires review before invoice creation and locks invoiced time", () => {
    render(<App />);
    createClientAndMatter("Cedar Consulting", "Policy advice");
    openScreen("Today");
    createManualEntry(
      "Prepared policy advice",
      "Cedar Consulting",
      "Policy advice"
    );
    openScreen("Billing");

    expect(
      screen.getByRole("button", { name: "Review time before invoicing" })
    ).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "Mark reviewed" }));
    fireEvent.click(screen.getByRole("button", { name: "Create invoice" }));

    expect(screen.getByText("Monthly invoices")).toBeInTheDocument();
    expect(
      (screen.getByLabelText("Invoice number") as HTMLInputElement).value
    ).toMatch(/^\d{2}-001$/);
    fireEvent.change(screen.getByLabelText("Invoice number"), {
      target: { value: "26-006" },
    });
    fireEvent.click(
      screen.getByRole("button", { name: "Save invoice details" })
    );
    expect(
      screen.getByText(/Invoice number and issue date saved/)
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Invoice status")).toHaveValue("draft");
    fireEvent.change(screen.getByLabelText("Invoice status"), {
      target: { value: "sent" },
    });
    fireEvent.click(
      screen.getByRole("button", { name: "Record and reconcile payment" })
    );
    expect(screen.getByLabelText("Invoice status")).toHaveValue("paid");
    expect(
      screen.getByText(
        "This invoice is fully reconciled. Remove a payment only if a correction or reversal is needed."
      )
    ).toBeInTheDocument();

    vi.spyOn(window, "confirm").mockReturnValue(true);
    fireEvent.click(screen.getByRole("button", { name: "Remove payment" }));
    expect(screen.getByLabelText("Invoice status")).toHaveValue("sent");
    openScreen("Today");
    expect(screen.getByRole("button", { name: "Invoiced" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Delete" })).toBeDisabled();
  });

  it("deletes a client-month and its source records from the billing queue", () => {
    render(<App />);
    createClientAndMatter("Queue Cleanup Co.", "Monthly advice");
    openScreen("Today");
    createManualEntry(
      "Billing item to remove",
      "Queue Cleanup Co.",
      "Monthly advice"
    );
    openScreen("Billing");

    fireEvent.click(screen.getByRole("button", { name: "Delete queue item" }));
    const dialog = screen.getByRole("dialog", { name: "Delete queue item?" });
    expect(
      within(dialog).getByText(/permanently deletes 1 time entry/)
    ).toBeInTheDocument();
    fireEvent.click(
      within(dialog).getByRole("button", { name: "Delete permanently" })
    );

    expect(
      screen.getByText(
        "Statement candidates will appear here as soon as tracked time or client expenses exist for a billing month."
      )
    ).toBeInTheDocument();
    openScreen("Today");
    expect(
      screen.queryByText("Billing item to remove")
    ).not.toBeInTheDocument();
  });

  it("keeps a detached expense excluded when a draft invoice refreshes", () => {
    render(<App />);
    createClientAndMatter("Harbor Works", "Contract support");
    openScreen("Expenses");

    fireEvent.change(screen.getAllByLabelText("Summary")[0]!, {
      target: { value: "Filing fee" },
    });
    fireEvent.change(screen.getAllByLabelText("Amount")[0]!, {
      target: { value: "75" },
    });
    fireEvent.change(screen.getAllByLabelText("Payee or vendor")[0]!, {
      target: { value: "State office" },
    });
    fireEvent.change(screen.getAllByLabelText("Category")[0]!, {
      target: { value: "Filing" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save expense" }));

    openScreen("Billing");
    fireEvent.click(screen.getByRole("button", { name: "Create invoice" }));
    const included = screen
      .getByText("Included on this invoice")
      .closest("section")!;
    fireEvent.click(
      within(included).getByRole("button", { name: "Detach expense" })
    );
    expect(within(included).queryByText("Filing fee")).not.toBeInTheDocument();

    fireEvent.click(
      screen.getByRole("button", { name: "Update draft from records" })
    );
    expect(within(included).queryByText("Filing fee")).not.toBeInTheDocument();
  });

  it("updates the app-wide rate and statement identity", () => {
    render(<App />);
    openScreen("Settings");

    fireEvent.change(screen.getByLabelText("Standard hourly rate"), {
      target: { value: "425" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save standard rate" }));
    expect(screen.getByText("$425/hr")).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Sender name"), {
      target: { value: "Connor Krewson" },
    });
    fireEvent.click(
      screen.getByRole("button", { name: "Save statement profile" })
    );
    expect(screen.getByText("Saved locally")).toBeInTheDocument();
    expect(screen.getAllByText("Connor Krewson").length).toBeGreaterThan(0);
  });
});

function openScreen(name: string) {
  fireEvent.click(screen.getByRole("button", { name: new RegExp(`^${name}`) }));
}

function createClientAndMatter(clientName: string, matterName: string) {
  openScreen("Clients");
  const addClientForm = screen.getByText("Add client").closest("form")!;
  fireEvent.change(within(addClientForm).getByLabelText("Client name"), {
    target: { value: clientName },
  });
  fireEvent.click(
    within(addClientForm).getByRole("button", { name: "Save client" })
  );

  const clientDetailsForm = screen
    .getByRole("button", { name: "Save client changes" })
    .closest("form")!;
  fireEvent.change(within(clientDetailsForm).getByLabelText("Address"), {
    target: { value: "100 Professional Plaza\nCleveland, OH 44114" },
  });
  fireEvent.click(
    within(clientDetailsForm).getByRole("button", {
      name: "Save client changes",
    })
  );

  const addMatterForm = screen
    .getByText(`Add matter to ${clientName}`)
    .closest("form")!;
  fireEvent.change(within(addMatterForm).getByLabelText("Matter name"), {
    target: { value: matterName },
  });
  fireEvent.click(
    within(addMatterForm).getByRole("button", { name: "Save matter" })
  );
}

function createManualEntry(
  narrative: string,
  clientName: string,
  matterName: string,
  billedHours = "0.25"
) {
  fireEvent.change(
    screen.getByLabelText("Billable hours", {
      selector: "input[name='manual-billed-hours']",
    }),
    { target: { value: billedHours } }
  );
  const clientSelect = screen.getByLabelText("Client", {
    selector: "select[name='manual-client']",
  });
  fireEvent.change(
    screen.getByLabelText("Narrative", {
      selector: "textarea[name='manual-narrative']",
    }),
    { target: { value: narrative } }
  );
  fireEvent.change(clientSelect, {
    target: {
      value: within(clientSelect)
        .getByRole("option", { name: clientName })
        .getAttribute("value"),
    },
  });
  const matterSelect = screen.getByLabelText("Matter", {
    selector: "select[name='manual-matter']",
  });
  fireEvent.change(matterSelect, {
    target: {
      value: within(matterSelect)
        .getByRole("option", { name: matterName })
        .getAttribute("value"),
    },
  });
  fireEvent.click(screen.getByRole("button", { name: "Save manual entry" }));
}
