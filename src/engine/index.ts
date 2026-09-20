// src/engine/index.ts

export { runSoundtrackDetectors, detectRepeatListening, detectLateWindow, detectBusiestMonth } from './detectors/soundtrack';
export { runLedgerDetectors } from './detectors/ledger';
export { runTransactionDetectors } from './detectors/transactions';
export { buildCrossStreamComparisons } from './crossStream';
export type { CrossStreamComparison } from './crossStream';
