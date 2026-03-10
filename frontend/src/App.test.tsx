import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "./App";

describe("App", () => {
  it("renders the initial hero and loads the first deterministic frame", async () => {
    render(<App />);

    expect(screen.getByRole("heading", { name: /energy data becomes a cross-chain action surface/i })).toBeInTheDocument();
    await screen.findByText(/version 1 with signed payload proof/i);
    expect(screen.getByText(/below threshold/i)).toBeInTheDocument();
  });

  it("can jump directly to the triggered case and open the proof drawer", async () => {
    const user = userEvent.setup();
    render(<App />);

    await screen.findByText(/version 1 with signed payload proof/i);
    await user.click(screen.getByRole("button", { name: /trigger case/i }));

    await screen.findByText(/threshold hit/i);
    expect(screen.getAllByText(/reward credited/i).length).toBeGreaterThan(0);

    await user.click(screen.getByRole("button", { name: /view proof/i }));
    expect(screen.getByRole("region", { name: /proof drawer/i })).toBeInTheDocument();
  });

  it("shows explicit unavailability when local anvil mode is selected", async () => {
    const user = userEvent.setup();
    render(<App />);

    await screen.findByText(/version 1 with signed payload proof/i);
    await user.click(screen.getByRole("button", { name: /local anvil/i }));

    await waitFor(() => {
      expect(screen.getByText(/local anvil adapter unavailable/i)).toBeInTheDocument();
    });
  });
});
