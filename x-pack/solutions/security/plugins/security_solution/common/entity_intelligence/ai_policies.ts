/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';

export const AI_POLICIES_URL = '/internal/entity_analytics/ai_policies';
export const AI_POLICY_STATUS_URL = `${AI_POLICIES_URL}/status`;
export const MAX_AI_POLICIES = 500;

export const aiPolicyProviderSchema = z.enum([
  'cursor',
  'agent_builder',
  'codex',
  'claude_desktop',
  'google_adk',
]);
export type AiPolicyProvider = z.infer<typeof aiPolicyProviderSchema>;

const policyFields = {
  name: z.string().trim().min(1).max(120),
  description: z.string().trim().max(1000),
  enabled: z.boolean(),
  mode: z.literal('monitor'),
  providers: z
    .array(aiPolicyProviderSchema)
    .min(1)
    .max(5)
    .refine((providers) => new Set(providers).size === providers.length, 'Duplicate providers.'),
  activityType: z.enum(['protected_file_access', 'unapproved_export', 'restricted_tool_use']),
  severity: z.enum(['low', 'medium', 'high', 'critical']),
  toolNames: z
    .array(z.string().trim().min(1).max(200))
    .max(20)
    .refine((names) => new Set(names).size === names.length, 'Duplicate tool names.'),
  inputContains: z.string().trim().max(500),
};

export const aiPolicyInputSchema = z
  .strictObject(policyFields)
  .refine((policy) => policy.toolNames.length > 0 || policy.inputContains.length > 0, {
    message: 'Add at least one tool name or input text condition.',
    path: ['inputContains'],
  });

export type AiPolicyInput = z.infer<typeof aiPolicyInputSchema>;

export const updateAiPolicyRequestSchema = z
  .strictObject({
    ...policyFields,
    expectedVersion: z.number().int().min(1).max(Number.MAX_SAFE_INTEGER),
  })
  .refine((policy) => policy.toolNames.length > 0 || policy.inputContains.length > 0, {
    message: 'Add at least one tool name or input text condition.',
    path: ['inputContains'],
  });

export type UpdateAiPolicyRequest = z.infer<typeof updateAiPolicyRequestSchema>;

export const aiPolicyParamsSchema = z.strictObject({ id: z.string().uuid().max(36) });

export interface AiPolicy extends AiPolicyInput {
  id: string;
  version: number;
  createdAt: string;
  updatedAt: string;
  effectiveFrom: string;
  createdBy: string;
  updatedBy: string;
}

export interface AiPoliciesResponse {
  policies: AiPolicy[];
  total: number;
}

export const aiPolicyDetectorSourceSchema = z.strictObject({
  provider: aiPolicyProviderSchema,
  status: z.enum(['healthy', 'partial', 'error', 'unavailable']),
  observationsScanned: z.number().int().min(0).max(Number.MAX_SAFE_INTEGER),
  findingsCreated: z.number().int().min(0).max(Number.MAX_SAFE_INTEGER),
  lastSuccessAt: z.string().datetime().max(40).optional(),
  message: z.string().trim().max(512).optional(),
});

export type AiPolicyDetectorSource = z.infer<typeof aiPolicyDetectorSourceSchema>;

export const aiPolicyDetectorHeartbeatSchema = z
  .strictObject({
    collectorId: z.string().trim().min(1).max(100),
    runStartedAt: z.string().datetime().max(40),
    runCompletedAt: z.string().datetime().max(40),
    intervalSeconds: z.number().int().min(1).max(600),
    policiesLoaded: z.number().int().min(0).max(MAX_AI_POLICIES),
    sources: z
      .array(aiPolicyDetectorSourceSchema)
      .min(1)
      .max(5)
      .refine(
        (sources) => new Set(sources.map(({ provider }) => provider)).size === sources.length,
        'Duplicate provider status.'
      ),
  })
  .refine((status) => Date.parse(status.runCompletedAt) >= Date.parse(status.runStartedAt), {
    message: 'Run completion must not precede its start.',
    path: ['runCompletedAt'],
  });

export type AiPolicyDetectorHeartbeat = z.infer<typeof aiPolicyDetectorHeartbeatSchema>;

export interface AiPolicyDetectorStatus extends AiPolicyDetectorHeartbeat {
  receivedAt: string;
  reportedBy: string;
}

export interface AiPolicyDetectorStatusResponse {
  status: AiPolicyDetectorStatus | null;
  stale: boolean;
}
