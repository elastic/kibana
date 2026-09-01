/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import type { NormalizedReport } from '../../../common/threat_intel/workflows/step_types/fetch_source/fetch_source_common';
import type { SourceType } from '../../../common/threat_intel';
import type { DnsLookupFn } from './http_client';

/**
 * The `.kibana-threat-intel-sources` hit shape an adapter sees.
 *
 * Re-declared here (instead of importing the Zod-inferred type from
 * `common/`) so adapter implementations don't have to depend on
 * `@kbn/zod/v4`. Tracks the schema in
 * `common/.../fetch_source_common.ts:sourceHitSchema` — keep them in
 * lock-step.
 */
export interface SourceHit {
  _id: string;
  _index?: string;
  _source: {
    adapter_type: SourceType;
    name: string;
    enabled?: boolean;
    config: Record<string, unknown>;
    tags?: string[];
    space_id?: string;
  };
}

/**
 * Runtime context passed to every adapter. Mirrors what the workflow
 * step's `StepHandlerContext` exposes, narrowed to just what an adapter
 * actually needs.
 */
export interface AdapterRunContext {
  /** Step-scoped logger. Per-adapter messages are tagged with the adapter type. */
  logger: Logger;
  /** Cancellation signal from the workflow engine. Adapters MUST honor it on outbound HTTP. */
  abortSignal: AbortSignal;
  /** Wall-clock for `@timestamp` and `lineage.ingested_at`. Injected for tests. */
  now: () => Date;
  /** Optional fetch override for tests. Defaults to `globalThis.fetch`. */
  fetchFn?: typeof fetch;
  /**
   * Optional DNS override for the SSRF pre-flight. Defaults to real
   * resolution. Tests that stub `fetchFn` must stub this too, otherwise the
   * guard tries to resolve the fixture hostname for real.
   */
  lookupFn?: DnsLookupFn;
}

/**
 * The single contract every adapter implements. Adapters are pure (no
 * Elasticsearch writes) — they normalize upstream content into report
 * documents and let the workflow handle dedup-and-write.
 */
export interface FetchAdapter {
  /** Discriminator on the source's `adapter_type`. */
  readonly adapterType: SourceType;
  /**
   * Fetch the source and return zero or more normalized reports.
   *
   * Return `[]` when the source contains no usable reports. Throw on fetch
   * or parse failure so the workflow records a failed source run.
   */
  run(source: SourceHit, context: AdapterRunContext): Promise<NormalizedReport[]>;
}

export type { NormalizedReport };
