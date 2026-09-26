/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Ad2IndexedAlert, Ad2IndexedRawEvent } from '../scenario_registry';

export type FpTpTwinVariant = 'tp' | 'fp';

export type FpTpClassification = 'true_positive' | 'false_positive' | 'inconclusive';

export type FpTpMustRetrieve = 'entity_store' | 'raw_events';

export interface FpTpIndexedEntity {
  readonly index: string;
  readonly id: string;
  readonly source: Record<string, unknown>;
}

export interface FpTpGold {
  readonly classification: FpTpClassification;
  readonly why: string;
  readonly mustRetrieve: readonly FpTpMustRetrieve[];
  readonly evidenceIds: {
    readonly entity: readonly string[];
    readonly event: readonly string[];
  };
  readonly mustNotCite: readonly string[];
}

export interface FpTpTwin {
  readonly id: `encoded-powershell.${FpTpTwinVariant}`;
  readonly alerts: readonly Ad2IndexedAlert[];
  readonly events: readonly Ad2IndexedRawEvent[];
  readonly entities: readonly FpTpIndexedEntity[];
  readonly attack: Record<string, unknown>;
  readonly gold: FpTpGold;
}
