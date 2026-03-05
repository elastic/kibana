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

export const InitializationFlowStatus = z.enum([
  'not_requested',
  'pending',
  'running',
  'ready',
  'error',
]);

export type InitializationFlowStatus = z.infer<typeof InitializationFlowStatus>;

export const InitializationFlowResult = z.object({
  status: InitializationFlowStatus,
  error: z.string().optional(),
});

export type InitializationFlowResult = z.infer<typeof InitializationFlowResult>;

export const InitializeSecuritySolutionRequestBody = z.object({
  flows: z.array(InitializationFlowId).min(1),
  force: z.boolean().optional(),
});

export type InitializeSecuritySolutionRequestBody = z.infer<
  typeof InitializeSecuritySolutionRequestBody
>;

export const InitializeFlowScheduleResult = z.object({
  scheduled: z.boolean(),
  reason: z.string().optional(),
});

export type InitializeFlowScheduleResult = z.infer<typeof InitializeFlowScheduleResult>;

export const InitializeSecuritySolutionResponse = z.object({
  flows: z.record(InitializationFlowId, InitializeFlowScheduleResult),
});

export type InitializeSecuritySolutionResponse = z.infer<typeof InitializeSecuritySolutionResponse>;

export const InitializationStatusResponse = z.object({
  flows: z.record(InitializationFlowId, InitializationFlowResult),
});

export type InitializationStatusResponse = z.infer<typeof InitializationStatusResponse>;
