import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { LockScreen } from "./LockScreen";

describe("LockScreen", () => {
  it("does not request a passphrase while storage protection is being checked", () => {
    render(<LockScreen checking onUnlock={vi.fn()} />);

    expect(screen.getByText("Opening securely")).toBeInTheDocument();
    expect(
      screen.queryByLabelText("Workspace passphrase")
    ).not.toBeInTheDocument();
  });

  it("clears the input and reports a failed unlock", async () => {
    const onUnlock = vi.fn().mockResolvedValue(false);
    render(<LockScreen checking={false} onUnlock={onUnlock} />);

    const input = screen.getByLabelText("Workspace passphrase");
    fireEvent.change(input, { target: { value: "incorrect passphrase" } });
    fireEvent.click(screen.getByRole("button", { name: "Unlock workspace" }));

    await waitFor(() =>
      expect(onUnlock).toHaveBeenCalledWith("incorrect passphrase")
    );
    expect(
      await screen.findByText("That passphrase did not unlock this workspace.")
    ).toBeInTheDocument();
    expect(input).toHaveValue("");
  });

  it("submits a valid passphrase without displaying an error", async () => {
    const onUnlock = vi.fn().mockResolvedValue(true);
    render(<LockScreen checking={false} onUnlock={onUnlock} />);

    fireEvent.change(screen.getByLabelText("Workspace passphrase"), {
      target: { value: "correct horse battery staple" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Unlock workspace" }));

    await waitFor(() =>
      expect(onUnlock).toHaveBeenCalledWith("correct horse battery staple")
    );
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});
