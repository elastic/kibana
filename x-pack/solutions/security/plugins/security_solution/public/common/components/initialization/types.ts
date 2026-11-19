/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  InitializationFlowId,
  InitializationFlowsResultType,
  INITIALIZATION_FLOW_STATUS_READY,
  INITIALIZATION_FLOW_STATUS_ERROR,
} from '../../../../common/api/initialization';

// ---------------------------------------------------------------------------
// Utility types derived from the generated OpenAPI schema
// ---------------------------------------------------------------------------

/**
 * Extracts the payload type from a flow's ready result union.
 * - If the ready variant has a `payload` property, infer its type.
 * - If the ready variant has no `payload` (e.g. CreateListIndicesReadyResult),
 *   the payload is `null`.
 */
type ExtractReadyPayload<T> = T extends { status: 'ready'; payload: infer P }
  ? P
  : T extends { status: 'ready' }
  ? null
  : never;

/** The typed payload for a given flow ID, derived from the generated schema. */
export type FlowPayload<K extends InitializationFlowId> = ExtractReadyPayload<
  NonNullable<InitializationFlowsResultType[K]>
>;

// ---------------------------------------------------------------------------
// State types
// ---------------------------------------------------------------------------

export type InitializationFlowResult<T> =
  | { status: typeof INITIALIZATION_FLOW_STATUS_READY; payload: T }
  | { status: typeof INITIALIZATION_FLOW_STATUS_ERROR; error: string | null };

export interface InitializationFlowState<T> {
  /** True while a request is in flight or retries are pending. */
  loading: boolean;
  /**
   * Null while loading. Once settled, a discriminated union:
   * - { status: 'ready', payload } on success
   * - { status: 'error', error } when all retries are exhausted
   */
  result: InitializationFlowResult<T> | null;
}

/**
 * The raw settled outcomes stored by the provider. A flow is absent until it
 * reaches a terminal state (success or error). Payloads are stored as `unknown`
 * because the provider validates them at parse time; the hook narrows the type.
 */
export type SettledInitializationState = Partial<
  Record<InitializationFlowId, InitializationFlowResult<unknown>>
>;
