/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';

export const InitializationFlowId = z.enum([
  'bootstrap-prebuilt-rules',
  'create-list-indices',
  'rule-monitoring-setup',
]);

export type InitializationFlowId = z.infer<typeof InitializationFlowId>;

export const InitializeSecuritySolutionRequestBody = z.object({
  flows: z.array(InitializationFlowId).min(1),
});

export type InitializeSecuritySolutionRequestBody = z.infer<
  typeof InitializeSecuritySolutionRequestBody
>;

export const InitializationFlowStatus = z.enum(['ready', 'error']);

export type InitializationFlowStatus = z.infer<typeof InitializationFlowStatus>;

export const InitializationFlowResult = z.object({
  status: InitializationFlowStatus,
  error: z.string().optional(),
  payload: z.record(z.string(), z.unknown()).optional(),
});

export type InitializationFlowResult = z.infer<typeof InitializationFlowResult>;

export const InitializeSecuritySolutionResponse = z.object({
  flows: z.record(InitializationFlowId, InitializationFlowResult),
});

export type InitializeSecuritySolutionResponse = z.infer<
  typeof InitializeSecuritySolutionResponse
>;
