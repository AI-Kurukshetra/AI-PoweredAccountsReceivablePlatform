import { render, screen } from "@testing-library/react";
import { StatusPill } from "@/components/ui/status-pill";

describe("StatusPill", () => {
  it("renders new role labels with human-readable spacing", () => {
    render(<StatusPill label="finance_manager" />);

    expect(screen.getByText("finance manager")).toBeInTheDocument();
  });

  it("renders health statuses introduced for integrations", () => {
    render(<StatusPill label="healthy" />);

    expect(screen.getByText("healthy")).toBeInTheDocument();
  });
});
