/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import type { ActionsClient } from '@kbn/actions-plugin/server';
import type { PublicMethodsOf } from '@kbn/utility-types';
import type { NormalizedReport } from '../../../common/threat_intel/workflows/step_types/fetch_source/fetch_source_common';
import type { SourceType } from '../../../common/threat_intel';
import type { DnsLookupFn } from './http_client';

/**
 * The runtime shape of an `ActionsClient` returned by
 * `getActionsClientWithRequest()` — public methods only. The actions
 * plugin exposes the public-method-only flavor at every call site
 * (see `request_context_factory.ts`); aliasing it here keeps adapter
 * code agnostic of whether the caller hands us the full class or the
 * narrowed handle.
 */
export type ScopedActionsClient = PublicMethodsOf<ActionsClient>;

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
  /**
   * Scoped Elasticsearch client, for adapters that need to read or write source
   * state such as TAXII cursors. No adapter uses it yet.
   *
   * It runs as the requesting user, so it CANNOT touch the plugin-owned
   * `.kibana-threat-*` indices: those are system indices, and a Kibana feature
   * privilege is not an Elasticsearch privilege, so every non-superuser gets a
   * security_exception. Anything reading or writing those has to go through the
   * internal user, as the routes and tasks do.
   */
  esClient: ElasticsearchClient;
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
  /**
   * Lazy resolver for an `ActionsClient` scoped to the workflow's fake
   * request. Adapters that need to invoke a configured Connectors v2
   * connector (e.g. `.taxii` for credentialed TAXII feeds) call this
   * on demand. Resolves to `undefined` when the actions plugin is not
   * available — callers MUST treat that as a hard error if the source
   * configuration requires a connector (anonymous paths can ignore).
   *
   * Returning a factory rather than a pre-resolved client keeps the
   * step handler's startup cost flat for adapters that don't need
   * actions (RSS, anonymous STIX, anonymous TAXII).
   */
  getActionsClient?: () => Promise<ScopedActionsClient | undefined>;
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
   * Adapters that don't apply to a specific source (e.g. an unknown
   * vendor under `vendor_api`) should return `[]` and log a `warn`
   * rather than throw — the workflow distinguishes "ran successfully,
   * nothing new" from "errored" and we want the no-content path to
   * keep the per-source `on-failure: continue: true` honest.
   */
  run(source: SourceHit, context: AdapterRunContext): Promise<NormalizedReport[]>;
}

export type { NormalizedReport };
