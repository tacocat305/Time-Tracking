import { describe, expect, it } from "vitest";

import type { TrackerState } from "./types";
import { createDefaultTrackerState, normalizeTrackerState } from "./utils";

describe("legacy demo migration", () => {
  it("removes an invoice derived only from fictional demo expenses", () => {
    const state = createDefaultTrackerState();
    const legacyState = {
      ...state,
      clients: [
        {
          address: "88 Mercer Avenue\nBoston, MA 02110",
          billingInstructions: "Include matter summaries.",
          contactEmail: "finance@rowanadvisory.com",
          contactName: "Alex Rowan",
          contactPhone: "",
          id: "client-rowan-advisory",
          name: "Rowan Advisory",
          notes: "",
          rateOverride: null,
          status: "active" as const,
        },
      ],
      invoices: [
        {
          billingInstructions: "Include matter summaries.",
          clientAddress: "88 Mercer Avenue\nBoston, MA 02110",
          clientId: "client-rowan-advisory",
          clientName: "Rowan Advisory",
          contactEmail: "finance@rowanadvisory.com",
          contactName: "Alex Rowan",
          deliveries: [],
          excludedExpenseIds: [],
          id: "legacy-demo-invoice",
          issuedOn: "2026-07-10",
          lineItems: [
            {
              amount: 82.5,
              billedMinutes: 0,
              category: "Filing",
              entryId: "expense-rowan-filing-fee",
              kind: "expense" as const,
              matterId: "matter-vendor-dispute",
              matterName: "Vendor dispute",
              narrative: "Vendor dispute filing fee",
              payee: "New York County Clerk",
              taskCategory: "",
              workDate: "2026-07-02",
            },
          ],
          matterSummaries: [],
          notes: "",
          paidOn: null,
          payments: [],
          periodKey: "2026-07",
          periodLabel: "July 2026",
          reviewedCount: 0,
          statementExportedAt: null,
          statementPdfPath: null,
          statementNumber: "LTT-202607-ROWAN-ADVISORY",
          status: "draft" as const,
          totalAmount: 82.5,
          totalBilledMinutes: 0,
          unreviewedCount: 0,
        },
      ],
      matters: [
        {
          clientId: "client-rowan-advisory",
          defaultTaskCategory: "Filing",
          description: "",
          id: "matter-vendor-dispute",
          name: "Vendor dispute",
          notes: "",
          status: "open" as const,
        },
      ],
      statementProfile: {
        firmName: "Independent Counsel",
        footerNote: "Thank you for the opportunity to support this matter.",
        senderAddress: "",
        senderEmail: "",
        senderName: "",
        senderPhone: "",
        senderTitle: "Independent legal contractor",
      },
    } satisfies TrackerState;

    const normalized = normalizeTrackerState(legacyState);

    expect(normalized.clients).toEqual([]);
    expect(normalized.matters).toEqual([]);
    expect(normalized.invoices).toEqual([]);
    expect(normalized.statementProfile.firmName).toBe("Krewson Law LLC");
    expect(normalized.statementProfile.senderTitle).toBe(
      "Employment Law & HR Consulting"
    );
  });
});
