import { Buffer } from "buffer";

// The official MagicBlock web3 SDK expects Node's Buffer global while its module
// is being evaluated. Load this module before importing the SDK-backed client.
(globalThis as typeof globalThis & { Buffer: typeof Buffer }).Buffer = Buffer;
