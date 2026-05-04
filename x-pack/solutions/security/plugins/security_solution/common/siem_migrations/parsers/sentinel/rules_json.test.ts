/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SentinelArmResource } from '../../model/vendor/rules/sentinel.gen';
import { SentinelRulesParser } from './rules_json';

const SCHEDULED_RULE: SentinelArmResource = {
  id: '/subscriptions/sub-id/resourceGroups/rg/providers/Microsoft.OperationalInsights/workspaces/ws/providers/Microsoft.SecurityInsights/alertRules/rule-guid',
  name: 'rule-guid',
  type: 'Microsoft.SecurityInsights/alertRules',
  kind: 'Scheduled',
  properties: {
    displayName: 'Suspicious Login Activity',
    description: 'Detects suspicious login attempts',
    query: 'SecurityEvent | where EventID == 4625 | summarize count() by Account',
    severity: 'Medium',
    tactics: ['InitialAccess'],
    techniques: ['T1078'],
  },
};

const FUSION_RULE: SentinelArmResource = {
  name: 'fusion-rule',
  kind: 'Fusion',
  properties: {
    displayName: 'Advanced Multistage Attack Detection',
    description: 'Fusion rule',
    query: 'placeholder',
    severity: 'High',
  },
};

describe('SentinelRulesParser', () => {
  describe('getRules', () => {
    it('parses Scheduled rules from resources', () => {
      const parser = new SentinelRulesParser([SCHEDULED_RULE]);
      const rules = parser.getRules();

      expect(rules).toHaveLength(1);
      expect(rules[0]).toMatchObject({
        id: 'rule-guid',
        displayName: 'Suspicious Login Activity',
        description: 'Detects suspicious login attempts',
        query: 'SecurityEvent | where EventID == 4625 | summarize count() by Account',
        severity: 'Medium',
        tactics: ['InitialAccess'],
        techniques: ['T1078'],
      });
    });

    it('filters out non-Scheduled rule kinds', () => {
      const parser = new SentinelRulesParser([SCHEDULED_RULE, FUSION_RULE]);
      const rules = parser.getRules();

      expect(rules).toHaveLength(1);
      expect(rules[0].displayName).toBe('Suspicious Login Activity');
    });

    it('filters out rules with missing displayName or query', () => {
      const incomplete: SentinelArmResource = {
        kind: 'Scheduled',
        properties: { displayName: 'No Query Rule', query: '' },
      };
      const parser = new SentinelRulesParser([incomplete]);
      const rules = parser.getRules();

      expect(rules).toHaveLength(0);
    });

    it('defaults severity to "medium" when missing', () => {
      const rule: SentinelArmResource = {
        name: 'no-severity',
        kind: 'Scheduled',
        properties: {
          displayName: 'Rule Without Severity',
          query: 'SecurityEvent | limit 10',
        },
      };
      const parser = new SentinelRulesParser([rule]);
      const rules = parser.getRules();

      expect(rules[0].severity).toBe('medium');
    });

    it('uses displayName as id when name and id are absent', () => {
      const rule: SentinelArmResource = {
        kind: 'Scheduled',
        properties: {
          displayName: 'Fallback Id Rule',
          query: 'SecurityEvent | limit 10',
        },
      };
      const parser = new SentinelRulesParser([rule]);
      const rules = parser.getRules();

      expect(rules[0].id).toBe('Fallback Id Rule');
    });

    it('handles rules without optional tactics and techniques', () => {
      const rule: SentinelArmResource = {
        name: 'no-mitre',
        kind: 'Scheduled',
        properties: {
          displayName: 'Rule Without MITRE',
          description: 'No MITRE mappings',
          query: 'AuditLogs | limit 10',
          severity: 'Informational',
        },
      };
      const parser = new SentinelRulesParser([rule]);
      const rules = parser.getRules();

      expect(rules[0].tactics).toBeUndefined();
      expect(rules[0].techniques).toBeUndefined();
    });
  });
});
