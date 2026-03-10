import { describe, expect, it } from "vitest";
import { demoFrames } from "./demoFrames";
import { demoReducer, initialState, resolveStatus } from "./reducer";

describe("demoReducer", () => {
  it("starts idle after the first frame loads", () => {
    const nextState = demoReducer(initialState, {
      type: "load_success",
      frame: demoFrames[0],
      status: resolveStatus(demoFrames[0], "initial")
    });

    expect(nextState.status).toBe("idle");
    expect(nextState.frame?.snapshot.version).toBe(1);
  });

  it("enters triggered state when a threshold hit frame is loaded", () => {
    const nextState = demoReducer(initialState, {
      type: "load_success",
      frame: demoFrames[1],
      status: resolveStatus(demoFrames[1], "replay")
    });

    expect(nextState.status).toBe("triggered");
    expect(nextState.frame?.rewardState.credited).toBe(true);
  });

  it("marks reward as claimed without mutating the original demo frame", () => {
    const loadedState = demoReducer(initialState, {
      type: "load_success",
      frame: demoFrames[1],
      status: resolveStatus(demoFrames[1], "replay")
    });

    const claimedState = demoReducer(loadedState, { type: "claim_reward" });

    expect(claimedState.status).toBe("claimed");
    expect(claimedState.frame?.rewardState.claimed).toBe(true);
    expect(demoFrames[1].rewardState.claimed).toBe(false);
  });

  it("surfaces adapter unavailability as an explicit error state", () => {
    const erroredState = demoReducer(initialState, {
      type: "load_error",
      message: "LOCAL_ANVIL_UNAVAILABLE",
      unavailable: true
    });

    expect(erroredState.status).toBe("error");
    expect(erroredState.liveAdapterUnavailable).toBe(true);
  });
});
