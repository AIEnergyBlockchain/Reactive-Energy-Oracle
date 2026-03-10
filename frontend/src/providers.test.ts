import { describe, expect, it } from "vitest";
import { LocalAnvilDemoDataProvider, LocalAnvilUnavailableError, MockDemoDataProvider } from "./providers";

describe("MockDemoDataProvider", () => {
  it("loads the initial frame and cycles through deterministic replay frames", async () => {
    const provider = new MockDemoDataProvider();

    const initial = await provider.load();
    const next = await provider.next();

    expect(initial.snapshot.version).toBe(1);
    expect(next.snapshot.version).toBe(2);
    expect(next.threshold.dispatched).toBe(true);
  });

  it("jumps to a deterministic trigger case and resets back to frame one", async () => {
    const provider = new MockDemoDataProvider();

    const triggered = await provider.jumpTo("triggered");
    const reset = await provider.reset();

    expect(triggered.snapshot.version).toBe(2);
    expect(triggered.rewardState.credited).toBe(true);
    expect(reset.snapshot.version).toBe(1);
  });
});

describe("LocalAnvilDemoDataProvider", () => {
  it("fails closed until a local manifest adapter is provided", async () => {
    const provider = new LocalAnvilDemoDataProvider();

    await expect(provider.load()).rejects.toBeInstanceOf(LocalAnvilUnavailableError);
  });
});
