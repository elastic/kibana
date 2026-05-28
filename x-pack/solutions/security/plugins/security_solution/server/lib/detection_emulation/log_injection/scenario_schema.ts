/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Scenario Schema — Phase 4
 *
 * Zod-based schema for detection emulation scenarios. A scenario
 * describes a complete attack narrative: which rules to trigger,
 * what host/user context, noise parameters, and expected outcomes.
 *
 * Scenarios can be authored by LLMs, loaded from a library, or
 * created interactively by analysts.
 */

import { z } from '@kbn/zod';

// ─── Scenario definition ──────────────────────────────────────────────

export const ScenarioHostSchema = z.object({
  id: z.string().describe('Unique host identifier'),
  name: z.string().describe('Hostname'),
  os: z.enum(['windows', 'linux', 'macos']).default('windows'),
});

export const ScenarioUserSchema = z.object({
  name: z.string().describe('Username'),
  domain: z.string().optional().describe('AD domain'),
});

export const ScenarioRuleTargetSchema = z.object({
  /** Prebuilt rule ID (rule_id field, not the SO id). */
  ruleId: z.string().describe('Rule ID to target'),
  /** Expected alert count. Used by quality evaluator. */
  expectedAlerts: z.number().int().min(1).default(1),
  /** Override constraints (merged on top of inverted query). */
  constraintOverrides: z
    .record(z.string(), z.unknown())
    .optional()
    .describe('Field→value overrides applied after query inversion'),
});

export const ScenarioNoiseConfigSchema = z.object({
  /** Number of noise documents to inject. 0 = no noise. */
  count: z.number().int().min(0).default(20),
  /** Time spread for noise around the attack chain (ms). */
  spreadMs: z.number().int().min(0).default(60000),
  /** Include red herrings (suspicious-but-benign activities). */
  includeRedHerrings: z.boolean().default(false),
});

export const ScenarioSchema = z.object({
  /** Unique scenario identifier. */
  id: z.string().describe('Scenario UUID'),
  /** Human-readable scenario name. */
  name: z.string().describe('Scenario display name'),
  /** Longer description of the attack narrative. */
  description: z.string().describe('Attack narrative description'),
  /** MITRE ATT&CK technique IDs covered. */
  techniqueIds: z.array(z.string()).min(1),
  /** Target host for the scenario. */
  host: ScenarioHostSchema,
  /** Target user for the scenario. */
  user: ScenarioUserSchema,
  /** Rules to target (invert and generate docs for). */
  rules: z.array(ScenarioRuleTargetSchema).min(1),
  /** Background noise configuration. */
  noise: ScenarioNoiseConfigSchema.default({ count: 20, spreadMs: 60000, includeRedHerrings: false }),
  /** Tags for categorization. */
  tags: z.array(z.string()).default([]),
  /** Scenario version for library management. */
  version: z.string().default('1.0.0'),
  /** ISO timestamp of creation. */
  createdAt: z.string().optional(),
  /** ISO timestamp of last modification. */
  updatedAt: z.string().optional(),
});

export type Scenario = z.infer<typeof ScenarioSchema>;
export type ScenarioHost = z.infer<typeof ScenarioHostSchema>;
export type ScenarioUser = z.infer<typeof ScenarioUserSchema>;
export type ScenarioRuleTarget = z.infer<typeof ScenarioRuleTargetSchema>;
export type ScenarioNoiseConfig = z.infer<typeof ScenarioNoiseConfigSchema>;

// ─── Ground truth document ─────────────────────────────────────────────

export const GroundTruthSchema = z.object({
  scenarioId: z.string(),
  /** Which rules were targeted. */
  targetedRules: z.array(z.object({
    ruleId: z.string(),
    ruleName: z.string(),
    expectedAlerts: z.number().int().min(0),
  })),
  /** Which documents were injected (doc IDs). */
  injectedDocIds: z.array(z.string()),
  /** Total noise documents injected. */
  noiseDocCount: z.number().int().min(0),
  /** Timestamp of scenario execution. */
  executedAt: z.string(),
  /** Fingerprint for matching alerts back to this run. */
  scenarioFingerprint: z.string(),
});

export type GroundTruth = z.infer<typeof GroundTruthSchema>;

// ─── Scenario validation helpers ───────────────────────────────────────

/**
 * Validate a scenario object. Returns the validated scenario or throws.
 */
export function validateScenario(input: unknown): Scenario {
  return ScenarioSchema.parse(input);
}

/**
 * Safe validation — returns { success, data, error }.
 */
export function safeValidateScenario(input: unknown) {
  return ScenarioSchema.safeParse(input);
}
