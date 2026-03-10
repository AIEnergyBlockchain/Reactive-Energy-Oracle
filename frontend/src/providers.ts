import { cloneFrame, demoFrames } from "./demoFrames";
import { loadLocalChainFrame } from "./adapters/localAnvil";
import { getLocalManifest } from "./adapters/localManifest";
import type { DemoCaseId, DemoDataProvider, DemoFrame } from "./types";

export class MockDemoDataProvider implements DemoDataProvider {
  readonly mode = "mock" as const;
  private cursor = 0;

  async load(): Promise<DemoFrame> {
    return cloneFrame(demoFrames[this.cursor]);
  }

  async next(): Promise<DemoFrame> {
    this.cursor = (this.cursor + 1) % demoFrames.length;
    return cloneFrame(demoFrames[this.cursor]);
  }

  async jumpTo(caseId: DemoCaseId): Promise<DemoFrame> {
    const matchIndex = demoFrames.findIndex((frame) => frame.caseId === caseId);
    this.cursor = matchIndex === -1 ? 0 : matchIndex;
    return cloneFrame(demoFrames[this.cursor]);
  }

  async reset(): Promise<DemoFrame> {
    this.cursor = 0;
    return cloneFrame(demoFrames[this.cursor]);
  }
}

export class LocalAnvilUnavailableError extends Error {
  constructor(message = "LOCAL_ANVIL_UNAVAILABLE") {
    super(message);
    this.name = "LocalAnvilUnavailableError";
  }
}

export class LocalAnvilDemoDataProvider implements DemoDataProvider {
  readonly mode = "local-anvil" as const;

  async load(): Promise<DemoFrame> {
    const manifest = await getLocalManifest();
    if (!manifest) {
      throw new LocalAnvilUnavailableError();
    }
    try {
      return await loadLocalChainFrame(manifest);
    } catch (error) {
      if (error instanceof Error && error.message === "LOCAL_ANVIL_NO_FEED") {
        throw new LocalAnvilUnavailableError("Local Anvil has no feed data yet.");
      }
      throw error;
    }
  }

  async next(): Promise<DemoFrame> {
    const manifest = await getLocalManifest();
    if (!manifest) {
      throw new LocalAnvilUnavailableError();
    }
    return this.load();
  }

  async jumpTo(): Promise<DemoFrame> {
    const manifest = await getLocalManifest();
    if (!manifest) {
      throw new LocalAnvilUnavailableError();
    }
    return this.load();
  }

  async reset(): Promise<DemoFrame> {
    const manifest = await getLocalManifest();
    if (!manifest) {
      throw new LocalAnvilUnavailableError();
    }
    return this.load();
  }
}
