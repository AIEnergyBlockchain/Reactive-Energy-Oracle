export interface LocalChainManifest {
  generatedAt: string;
  sourceChain: {
    chainId: number;
    name: string;
    rpcUrl: string;
    sourceFeedEmitter: string;
  };
  destinationChain: {
    chainId: number;
    name: string;
    rpcUrl: string;
    destinationActionVault: string;
  };
  reactive: {
    subscriber: string;
    callbackGasLimit: number;
    threshold: number;
  };
}

declare global {
  interface Window {
    __REO_LOCAL_MANIFEST__?: LocalChainManifest;
  }
}

export async function getLocalManifest(): Promise<LocalChainManifest | null> {
  if (typeof window !== "undefined" && window.__REO_LOCAL_MANIFEST__) {
    return window.__REO_LOCAL_MANIFEST__;
  }

  try {
    const response = await fetch("/local-anvil.manifest.json", { cache: "no-store" });
    if (!response.ok) {
      return null;
    }
    return (await response.json()) as LocalChainManifest;
  } catch {
    return null;
  }
}
