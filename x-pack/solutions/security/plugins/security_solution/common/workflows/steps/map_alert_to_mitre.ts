/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import type { CommonStepDefinition } from '@kbn/workflows-extensions/common';

/**
 * Step ID for MITRE ATT&CK auto-mapping workflow step.
 * Maps security alerts to MITRE ATT&CK techniques using LLM reasoning.
 */
export const MAP_ALERT_TO_MITRE_STEP_ID = 'security-solution.mapAlertToMitre' as const;

/**
 * Input schema for MITRE mapping step.
 * Requires alert ID and index to fetch and update the alert.
 */
export const mapAlertToMitreInputSchema = z.object({
  /** Alert ID to enrich */
  alertId: z.string().describe('Alert document ID to enrich with MITRE tags'),

  /** Index where alert is stored */
  index: z.string().describe('Elasticsearch index containing the alert'),
});

/**
 * Output schema for MITRE mapping step.
 * Returns success status and discovered MITRE techniques/tactics.
 */
export const mapAlertToMitreOutputSchema = z.object({
  /** Whether mapping succeeded */
  success: z.boolean().describe('True if MITRE mapping completed successfully'),

  /** Array of discovered technique IDs (e.g., ["T1059.001", "T1071.001"]) */
  techniqueIds: z.array(z.string()).optional().describe('MITRE technique IDs discovered'),

  /** Array of discovered tactic names (e.g., ["Execution", "Command and Control"]) */
  tacticNames: z.array(z.string()).optional().describe('MITRE tactic names discovered'),

  /** Attack phase (e.g., "Execution", "Exfiltration") */
  phase: z.string().optional().describe('MITRE ATT&CK attack phase'),

  /** LLM reasoning for mapping */
  reasoning: z.string().optional().describe('Brief explanation of why techniques were chosen'),

  /** Whether result came from cache */
  cached: z.boolean().optional().describe('True if mapping was retrieved from cache'),

  /** Error message if mapping failed */
  error: z.string().optional().describe('Error message if mapping failed'),
});

export type MapAlertToMitreInput = z.infer<typeof mapAlertToMitreInputSchema>;
export type MapAlertToMitreOutput = z.infer<typeof mapAlertToMitreOutputSchema>;

/**
 * Common step definition (server + public).
 * Defines the step ID and input/output schemas.
 */
export const commonMapAlertToMitreStepDefinition: CommonStepDefinition = {
  id: MAP_ALERT_TO_MITRE_STEP_ID,
  inputSchema: mapAlertToMitreInputSchema,
  outputSchema: mapAlertToMitreOutputSchema,
};
