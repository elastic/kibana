/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Threat } from '../../../../../../common/api/detection_engine';
import type { OriginalRule } from '../../../../../../common/siem_migrations/model/rule_migration.gen';
import type { SentinelRule } from '../../../../../../common/siem_migrations/parsers/sentinel/types';
import {
  TACTICS_BASE_URL,
  TECHNIQUES_BASE_URL,
  SENTINEL_TACTIC_NAME_TO_ID,
  SENTINEL_TACTIC_NAME_TO_DISPLAY,
} from './constants';

/**
 * Transforms Sentinel tactic and technique arrays (as exported in ARM templates)
 * into the Elastic Threat format used by detection rules.
 *
 * Sentinel exports tactic names like "InitialAccess" and technique IDs like "T1078".
 *
 * Note: Sentinel ARM templates export tactics and techniques as separate flat arrays
 * with no correlation between them. When only one tactic is present, all techniques
 * are associated with it (unambiguous). When multiple tactics are present, techniques
 * are omitted from individual tactic entries to avoid creating false tactic-technique
 * associations (e.g., claiming T1078 applies to Execution when it does not).
 */
export function transformSentinelMitreMapping(
  tactics: string[] | undefined,
  techniques: string[] | undefined
): Threat[] {
  if (!tactics || tactics.length === 0) {
    return [];
  }

  const validTactics = tactics.filter((name) => SENTINEL_TACTIC_NAME_TO_ID[name]);

  // Only associate techniques when there is a single tactic (mapping is unambiguous)
  const ruleTechniques =
    validTactics.length === 1
      ? (techniques ?? []).map((techniqueId) => ({
          id: techniqueId,
          reference: `${TECHNIQUES_BASE_URL}${techniqueId}/`,
          name: techniqueId,
        }))
      : [];

  return validTactics.map((tacticName) => {
    const tacticId = SENTINEL_TACTIC_NAME_TO_ID[tacticName];
    const tacticDisplayName = SENTINEL_TACTIC_NAME_TO_DISPLAY[tacticName] ?? tacticName;

    return {
      framework: 'MITRE ATT&CK',
      tactic: {
        id: tacticId,
        reference: `${TACTICS_BASE_URL}${tacticId}/`,
        name: tacticDisplayName,
      },
      technique: ruleTechniques,
    };
  });
}

/**
 * Transforms a parsed Sentinel rule into the OriginalRule format
 * used by the SIEM migrations pipeline.
 */
export function transformSentinelRuleToOriginalRule(rule: SentinelRule): OriginalRule {
  const threat = transformSentinelMitreMapping(rule.tactics, rule.techniques);

  const originalRule: OriginalRule = {
    id: rule.id,
    vendor: 'microsoft-sentinel',
    title: rule.displayName,
    description: rule.description,
    query: rule.query,
    query_language: 'kql',
    severity: rule.severity.toLowerCase(),
  };

  if (threat.length > 0) {
    originalRule.threat = threat;
  }

  return originalRule;
}
