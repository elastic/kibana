/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HuntForThreatResult, HuntIoc, HuntScope } from '@kbn/alertzero-common';

export interface HuntForThreatParams {
  /**
   * What Tier 1 searches: a list of index patterns and nothing else. Every searched
   * index counts towards the hit bar. `window` and `row_limit` are the defaults the
   * run's `time_range` and `size` override.
   */
  scope: Pick<HuntScope, 'window' | 'row_limit'> & { search_patterns: string[] };
  iocs?: HuntIoc[];
  techniques?: string[];
  /** Overrides the scope's window when the caller wants a narrower/wider range for this run. */
  time_range?: { from: string; to: string };
  /** Overrides the scope's row_limit for this run. */
  size?: number;
  maxAssets?: number;
}

/**
 * Service return: wire `HuntForThreatResult` plus internal digests for Tier 2
 * grounding. Digests are built from `_source` before hits are slimmed; HTTP
 * responses omit this field (not in the OpenAPI schema).
 */
export type HuntForThreatServiceResult = HuntForThreatResult & {
  sample_event_summaries?: string[];
};
