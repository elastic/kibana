/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FpTpWorld } from './types';

interface SeededDocument {
  readonly id: string;
  readonly source: Record<string, unknown>;
}

/** The documents a run seeded, for graders that check the summary invents nothing. */
export interface FpTpSeededEvidence {
  readonly attackDiscovery?: Record<string, unknown>;
  readonly alerts: SeededDocument[];
  readonly entities: SeededDocument[];
  readonly events: SeededDocument[];
}

const toDocuments = (documents: readonly SeededDocument[]): SeededDocument[] =>
  documents.map(({ id, source }) => ({ id, source }));

export const toSeededEvidence = (world: FpTpWorld): FpTpSeededEvidence => ({
  ...(world.attack ? { attackDiscovery: world.attack } : {}),
  alerts: toDocuments(world.alerts),
  entities: toDocuments(world.entities),
  events: toDocuments(world.events),
});
