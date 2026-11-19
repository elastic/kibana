/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FeedOs, LoadFeedResult } from './fetch';
import { loadFeed as loadVendorFeed } from './fetch';

/*
 * Everything downstream of a feed (matcher, findings writer, run summary, KEV
 * stamping) consumes `AdvisorySnapshot` objects regardless of where the bytes came
 * from. The only implementation today is `vendor-direct` (fetch and parse from the
 * vendor); other delivery channels implement the same interface. Types stay
 * structurally identical to LoadFeedResult so existing callers keep working unchanged.
 */

export interface AdvisorySourceOptions {
  signal?: AbortSignal;
}

/** One release's advisory data, whatever the transport that produced it. */
export type AdvisorySnapshot = LoadFeedResult;

export interface AdvisorySource {
  /** Identifies the reader in logs and the run summary (e.g. `vendor-direct`). */
  readonly name: string;
  /**
   * Reads the advisory data for one OS release. `unavailable` means the vendor or
   * dataset publishes nothing for the release; the scan treats it as today.
   */
  readonly load: (os: FeedOs, options: AdvisorySourceOptions) => Promise<AdvisorySnapshot>;
}

/** Today's transport: the Kibana server downloads and parses the vendor feed itself. */
export const createVendorDirectSource = (): AdvisorySource => ({
  name: 'vendor-direct',
  load: (os, { signal }) => loadVendorFeed(os, { signal }),
});
