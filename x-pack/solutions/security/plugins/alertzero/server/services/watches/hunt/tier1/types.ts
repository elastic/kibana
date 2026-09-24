/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HuntIoc, ResolvedIndexScope } from '@kbn/alertzero-common';

export interface HuntForThreatParams {
  /**
   * The resolved index scope from A2 (required and optional patterns, plus
   * row_limit/window defaults). Accepts a single-technology scope or the merged
   * multi-technology hunt scope; Tier 1 never reads the technology itself.
   */
  scope: Omit<ResolvedIndexScope, 'technology'>;
  iocs?: HuntIoc[];
  techniques?: string[];
  /** Overrides the scope's window when the caller wants a narrower/wider range for this run. */
  time_range?: { from: string; to: string };
  /** Overrides the scope's row_limit for this run. */
  size?: number;
  maxAssets?: number;
}
