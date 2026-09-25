/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  Ad2IndexedAlert,
  Ad2IndexedRawEvent,
} from '@kbn/evals-suite-attack-discovery-agent-builder';
import type { FpTpVerdict } from '../constants';

export type FpTpMustRetrieve = 'entity_store' | 'raw_events';

export interface FpTpIndexedEntity {
  readonly index: string;
  readonly id: string;
  readonly source: Record<string, unknown>;
}

export interface FpTpGold {
  readonly classification: FpTpVerdict;
  readonly why: string;
  readonly mustRetrieve: readonly FpTpMustRetrieve[];
  readonly evidenceIds: {
    readonly entity: readonly string[];
    readonly event: readonly string[];
  };
  readonly mustNotCite: readonly string[];
}

/**
 * What one run seeds. `attack` is undefined when the world deliberately has no
 * Attack Discovery document, so the workflow is run against an id that names nothing.
 */
export interface FpTpWorld {
  readonly attackId: string;
  readonly attack?: Record<string, unknown>;
  readonly alerts: readonly Ad2IndexedAlert[];
  readonly events: readonly Ad2IndexedRawEvent[];
  readonly entities: readonly FpTpIndexedEntity[];
}

/** A complete authored world plus its gold, as a person seeds it by hand. */
export interface FpTpTwin {
  readonly id: string;
  readonly alerts: readonly Ad2IndexedAlert[];
  readonly events: readonly Ad2IndexedRawEvent[];
  readonly entities: readonly FpTpIndexedEntity[];
  readonly attack: Record<string, unknown>;
  readonly gold: FpTpGold;
}
