/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SignificantEvent } from '@kbn/significant-events-schema';

interface LegacyNestedSource {
  stream_name?: string;
  source_id?: string;
}

const readNestedSourceId = <T extends { source_id?: string }>(entry: T): T => {
  const { stream_name: legacySourceId, ...rest } = entry as T & LegacyNestedSource;
  if (legacySourceId === undefined) return entry;
  return { ...rest, source_id: rest.source_id ?? legacySourceId } as T;
};

/**
 * Versions written before the `source_id` rename keep their source ids under `stream_names` and
 * nested `stream_name`. Reading them under the new keys keeps those events valid when a new version
 * is written, since signals and blast radius entries now require `source_id`.
 */
export const readLegacySourceFields = (event: SignificantEvent): SignificantEvent => {
  const { stream_names: legacySourceIds, ...rest } = event as SignificantEvent & {
    stream_names?: string[];
  };

  return {
    ...rest,
    source_ids: rest.source_ids ?? legacySourceIds ?? [],
    ...(rest.signals ? { signals: rest.signals.map(readNestedSourceId) } : {}),
    ...(rest.causal_features
      ? { causal_features: rest.causal_features.map(readNestedSourceId) }
      : {}),
    ...(rest.blast_radius ? { blast_radius: rest.blast_radius.map(readNestedSourceId) } : {}),
  };
};
