/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createHash } from 'crypto';
import type { RulesClient } from '@kbn/alerting-plugin/server';
import type { Threat } from '../../../common/api/detection_engine/model/rule_schema';
import type { ResponseActionAgentType } from '../../../common/endpoint/service/response_actions/constants';
import { getRuleByRuleId } from '../detection_engine/rule_management/logic/detection_rules_client/methods/get_rule_by_rule_id';
import type { EmulationPayload } from './payloads';
import { findByTechniqueIds } from './payloads';

// ─── Public types ─────────────────────────────────────────────────────────────

export type GenerateScenarioFailureReason =
  | 'rule_not_found'
  | 'no_mitre_tags'
  | 'no_supported_techniques';

export interface GenerateScenarioSuccess {
  ok: true;
  scenarioId: string;
  ruleId: string;
  ruleMitreTechniques: string[];
  selectedPayloads: EmulationPayload[];
  expectedSignals: string[];
}

export interface GenerateScenarioFailure {
  ok: false;
  reason: GenerateScenarioFailureReason;
}

export type GenerateScenarioResult = GenerateScenarioSuccess | GenerateScenarioFailure;

export interface GenerateScenarioInput {
  ruleId: string;
  endpointIds: string[];
  agentType?: ResponseActionAgentType;
  mode?: 'real_execution' | 'log_injection';
}

export interface GenerateScenarioDeps {
  rulesClient: RulesClient;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const extractMitreTechniqueIds = (threat: Threat[] | undefined): string[] => {
  if (!threat?.length) return [];

  const ids: string[] = [];
  for (const entry of threat) {
    for (const technique of entry.technique ?? []) {
      ids.push(technique.id);
      for (const sub of technique.subtechnique ?? []) {
        ids.push(sub.id);
      }
    }
  }
  // Deduplicate and sort for deterministic hashing downstream.
  return [...new Set(ids)].sort();
};

/**
 * Returns a stable, human-readable identifier for a (rule, techniques) pair.
 * Prefix keeps it distinguishable from raw hex hashes in logs.
 */
const computeScenarioId = (ruleId: string, techniqueIds: readonly string[]): string => {
  const serialized = JSON.stringify({ ruleId, techniqueIds });
  return `sha256-${createHash('sha256').update(serialized).digest('hex')}`;
};

// ─── Core ─────────────────────────────────────────────────────────────────────

/**
 * Builds a deterministic scenario from a detection rule.
 *
 * Failure modes:
 *   `rule_not_found`          — ruleId does not match any alert rule.
 *   `no_mitre_tags`           — rule has no threat[] entries with technique IDs.
 *   `no_supported_techniques` — techniques were found but none have a payload
 *                               in the library (filtered further by agentType
 *                               when provided).
 */
export const generateScenario = async (
  input: GenerateScenarioInput,
  deps: GenerateScenarioDeps
): Promise<GenerateScenarioResult> => {
  const { ruleId, agentType } = input;
  const { rulesClient } = deps;

  const rule = await getRuleByRuleId({ rulesClient, ruleId });
  if (!rule) {
    return { ok: false, reason: 'rule_not_found' };
  }

  const ruleMitreTechniques = extractMitreTechniqueIds(rule.threat);
  if (ruleMitreTechniques.length === 0) {
    return { ok: false, reason: 'no_mitre_tags' };
  }

  let selectedPayloads = findByTechniqueIds(ruleMitreTechniques);
  if (agentType) {
    selectedPayloads = selectedPayloads.filter((p) => p.agentTypes.includes(agentType));
  }

  if (selectedPayloads.length === 0) {
    return { ok: false, reason: 'no_supported_techniques' };
  }

  const scenarioId = computeScenarioId(ruleId, ruleMitreTechniques);
  const expectedSignals = [...new Set(selectedPayloads.flatMap((p) => p.expectedSignals))];

  return {
    ok: true,
    scenarioId,
    ruleId,
    ruleMitreTechniques,
    selectedPayloads,
    expectedSignals,
  };
};
