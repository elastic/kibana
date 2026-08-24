/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SourceType } from '../../../common/threat_intel';
import { rssAdapter } from './rss/rss_adapter';
import { stixAdapter } from './stix/stix_adapter';
import { taxiiAdapter } from './taxii/taxii_adapter';
import { vendorApiAdapter } from './vendor_api/vendor_api_adapter';
import { textIndicatorListAdapter } from './text_indicator_list/text_indicator_list_adapter';
import { kevAdapter } from './kev/kev_adapter';
import type { AdapterRunContext, FetchAdapter, NormalizedReport, SourceHit } from './types';

const ADAPTERS: Partial<Record<SourceType, FetchAdapter>> = {
  rss: rssAdapter,
  stix: stixAdapter,
  taxii: taxiiAdapter,
  vendor_api: vendorApiAdapter,
  text_indicator_list: textIndicatorListAdapter,
  kev: kevAdapter,
};

export class UnknownAdapterError extends Error {
  constructor(public readonly adapterType: string, public readonly sourceId: string) {
    super(
      `No adapter registered for source ${sourceId} (adapter_type=${adapterType}). ` +
        `Known adapter types: ${Object.keys(ADAPTERS).join(', ')}.`
    );
    this.name = 'UnknownAdapterError';
  }
}

/**
 * Resolve and run the adapter for a given source.
 *
 * Errors thrown by an adapter propagate up — the step handler converts
 * them to `StepHandlerResult.error`, which the workflow engine then
 * routes through the per-step `on-failure: continue: true` so a single
 * misbehaving source can't break the rest of the run. Adapters that
 * succeed but produce no reports return `[]`; the step output's
 * `total_fetched: 0` is the signal for "ran cleanly, nothing new".
 */
export const runAdapter = async (
  source: SourceHit,
  context: AdapterRunContext
): Promise<NormalizedReport[]> => {
  const adapter = ADAPTERS[source._source.adapter_type];
  if (!adapter) {
    throw new UnknownAdapterError(source._source.adapter_type, source._id);
  }
  return adapter.run(source, context);
};

/** Test helper — exposes the registry without forcing tests to import each adapter module. */
export const __getRegisteredAdapterTypesForTest = (): SourceType[] =>
  Object.keys(ADAPTERS) as SourceType[];
