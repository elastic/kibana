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
 */
export function transformSentinelMitreMapping(
  tactics: string[] | undefined,
  techniques: string[] | undefined
): Threat[] {
  if (!tactics || tactics.length === 0) {
    return [];
  }

  return tactics.reduce<Threat[]>((acc, tacticName) => {
    const tacticId = SENTINEL_TACTIC_NAME_TO_ID[tacticName];
    if (!tacticId) {
      return acc;
    }

    const tacticDisplayName = SENTINEL_TACTIC_NAME_TO_DISPLAY[tacticName] ?? tacticName;

    const ruleTechniques = (techniques ?? []).map((techniqueId) => ({
      id: techniqueId,
      reference: `${TECHNIQUES_BASE_URL}${techniqueId}/`,
      name: techniqueId,
    }));

    acc.push({
      framework: 'MITRE ATT&CK',
      tactic: {
        id: tacticId,
        reference: `${TACTICS_BASE_URL}${tacticId}/`,
        name: tacticDisplayName,
      },
      technique: ruleTechniques,
    });

    return acc;
  }, []);
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
