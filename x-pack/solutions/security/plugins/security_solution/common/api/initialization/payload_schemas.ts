/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import {
  INITIALIZATION_FLOW_CREATE_LIST_INDICES,
  INITIALIZATION_FLOW_SOURCERER_DATA_VIEWS,
} from './constants';
import { CreateListIndicesPayload } from './flows/create_list_indices';

export type { CreateListIndicesPayload } from './flows/create_list_indices';

// ---------------------------------------------------------------------------
// Registry: maps each InitializationFlowId to its payload zod schema.
// Add an entry here whenever a new flow is introduced.
// ---------------------------------------------------------------------------

export const InitializationFlowPayloadSchemas = {
  [INITIALIZATION_FLOW_CREATE_LIST_INDICES]: CreateListIndicesPayload,
  // TODO: payload schema will be added in a follow up PR
  [INITIALIZATION_FLOW_SOURCERER_DATA_VIEWS]: z.null(),
} as const;

/**
 * Central registry type: maps each flow ID to its payload TypeScript type.
 * Derived from the zod schemas — this is the single source of truth.
 */
export type InitializationFlowPayloadRegistry = {
  [K in keyof typeof InitializationFlowPayloadSchemas]: z.infer<
    (typeof InitializationFlowPayloadSchemas)[K]
  >;
};

/**
 * Parse and validate a flow's raw payload against its registered zod schema.
 * Throws a ZodError if validation fails.
 */
export const parseFlowPayload = <K extends keyof typeof InitializationFlowPayloadSchemas>(
  flowId: K,
  rawPayload: unknown
): InitializationFlowPayloadRegistry[K] =>
  InitializationFlowPayloadSchemas[flowId].parse(
    rawPayload
  ) as InitializationFlowPayloadRegistry[K];
