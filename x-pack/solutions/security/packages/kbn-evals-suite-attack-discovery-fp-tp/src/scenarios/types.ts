/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FpTpOutcome } from '../constants';
import type { FpTpTwin, FpTpWorld, FpTpWorldChecks } from '../world';

/** Eval situations from the security-team#19280 contract (§3). */
export type FpTpSituation = 'U1' | 'U2' | 'U3' | 'U4' | 'U5' | 'U6';

/** Which evidence the example's world makes available to the analysis. */
export type FpTpEvidenceState =
  | 'complete'
  | 'entities_missing'
  | 'events_missing'
  | 'mixed'
  | 'attack_discovery_missing'
  | 'cited_alert_missing';

/**
 * Where the world came from: written by hand, replayed from a published attack chain,
 * or a replayed chain with one fact changed.
 */
export type FpTpLabelProvenance = 'authored' | 'replay' | 'adversarial-mutation';

export interface FpTpExample {
  /** Unique across all scenarios; prefixed with the scenario key. */
  readonly id: string;
  readonly situation: FpTpSituation;
  readonly evidenceState: FpTpEvidenceState;
  readonly expectedOutcome: FpTpOutcome;
  readonly labelProvenance: FpTpLabelProvenance;
  /** The gold is not agreed yet; report the example's score separately. */
  readonly provisional?: boolean;
  /** Check results the world is authored to produce. The gold must follow from them. */
  readonly checks?: FpTpWorldChecks;
  /**
   * Set when the world changes one fact of the scenario's `.tp` world. A mutation must
   * change at least one check result, or it tests nothing the base world does not.
   */
  readonly mutation?: string;
  /**
   * Builds the world one run seeds. Every id in it must be a digest of `runMarker`
   * or contain one of the scenario's `sharedNames`, so runs never share a document.
   */
  readonly buildWorld: (runMarker: string) => FpTpWorld;
}

/** One authored world and the eval examples derived from it. */
export interface FpTpScenario {
  readonly key: string;
  /** The published write-up a replayed scenario renders. */
  readonly sourceRef?: string;
  /** Names the run marker does not make unique: the attack id, host names, user names. */
  readonly sharedNames: readonly string[];
  /** Complete worlds for manual seeding (`scripts/load_fp_tp_twin.js`), keyed by variant. */
  readonly twins: Readonly<Record<string, (runMarker: string) => FpTpTwin>>;
  readonly examples: readonly FpTpExample[];
}

export interface FpTpRegisteredExample extends FpTpExample {
  readonly scenarioKey: string;
}
