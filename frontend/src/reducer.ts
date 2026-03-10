import { claimFrame } from "./demoFrames";
import type { AdapterMode, DemoAppState, DemoFrame, UIState } from "./types";

type DemoAction =
  | { type: "load_start" }
  | { type: "load_success"; frame: DemoFrame; status: UIState }
  | { type: "load_error"; message: string; unavailable?: boolean }
  | { type: "set_adapter_mode"; adapterMode: AdapterMode }
  | { type: "toggle_proof_drawer"; open: boolean }
  | { type: "set_reduced_motion"; value: boolean }
  | { type: "claim_reward" };

export const initialState: DemoAppState = {
  status: "loading",
  adapterMode: "mock",
  frame: null,
  error: null,
  proofDrawerOpen: false,
  liveAdapterUnavailable: false,
  reducedMotion: false
};

export function resolveStatus(frame: DemoFrame, intent: "initial" | "replay"): UIState {
  if (intent === "initial") {
    return "idle";
  }

  return frame.threshold.dispatched ? "triggered" : "no_trigger";
}

export function demoReducer(state: DemoAppState, action: DemoAction): DemoAppState {
  switch (action.type) {
    case "load_start":
      return {
        ...state,
        status: "replaying",
        error: null
      };
    case "load_success":
      return {
        ...state,
        frame: action.frame,
        status: action.status,
        error: null,
        liveAdapterUnavailable: false
      };
    case "load_error":
      return {
        ...state,
        status: "error",
        error: action.message,
        liveAdapterUnavailable: action.unavailable ?? false
      };
    case "set_adapter_mode":
      return {
        ...state,
        adapterMode: action.adapterMode,
        error: null,
        liveAdapterUnavailable: false,
        status: "loading"
      };
    case "toggle_proof_drawer":
      return {
        ...state,
        proofDrawerOpen: action.open
      };
    case "set_reduced_motion":
      return {
        ...state,
        reducedMotion: action.value
      };
    case "claim_reward":
      if (!state.frame || !state.frame.rewardState.credited || state.frame.rewardState.claimed) {
        return state;
      }

      return {
        ...state,
        frame: claimFrame(state.frame),
        status: "claimed"
      };
    default:
      return state;
  }
}
