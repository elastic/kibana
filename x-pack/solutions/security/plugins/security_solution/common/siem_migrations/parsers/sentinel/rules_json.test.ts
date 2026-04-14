/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SentinelRulesJsonParser } from './rules_json';

const SCHEDULED_RULE = {
  id: '/subscriptions/sub-id/resourceGroups/rg/providers/Microsoft.OperationalInsights/workspaces/ws/providers/Microsoft.SecurityInsights/alertRules/rule-guid',
  name: 'rule-guid',
  type: 'Microsoft.SecurityInsights/alertRules',
  kind: 'Scheduled',
  properties: {
    displayName: 'Suspicious Login Activity',
    description: 'Detects suspicious login attempts',
    severity: 'Medium',
    enabled: true,
    query: 'SecurityEvent | where EventID == 4625 | summarize count() by Account',
    queryFrequency: 'PT5M',
    queryPeriod: 'PT5M',
    tactics: ['InitialAccess'],
    techniques: ['T1078'],
  },
};

const FUSION_RULE = {
  name: 'fusion-rule',
  kind: 'Fusion',
  properties: {
    displayName: 'Advanced Multistage Attack Detection',
    description: 'Fusion rule',
    severity: 'High',
    enabled: true,
  },
};

describe('SentinelRulesJsonParser', () => {
  describe('getRules', () => {
    it('parses rules from an ARM template wrapper', () => {
      const json = JSON.stringify({ resources: [SCHEDULED_RULE] });
      const parser = new SentinelRulesJsonParser(json);
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

    it('parses rules from a direct array', () => {
      const json = JSON.stringify([SCHEDULED_RULE]);
      const parser = new SentinelRulesJsonParser(json);
      const rules = parser.getRules();

      expect(rules).toHaveLength(1);
      expect(rules[0].id).toBe('rule-guid');
    });

    it('filters out non-Scheduled rule kinds', () => {
      const json = JSON.stringify({ resources: [SCHEDULED_RULE, FUSION_RULE] });
      const parser = new SentinelRulesJsonParser(json);
      const rules = parser.getRules();

      expect(rules).toHaveLength(1);
      expect(rules[0].displayName).toBe('Suspicious Login Activity');
    });

    it('filters out rules with missing displayName or query', () => {
      const incomplete = {
        kind: 'Scheduled',
        properties: { displayName: 'No Query Rule', severity: 'Low' },
      };
      const json = JSON.stringify([incomplete]);
      const parser = new SentinelRulesJsonParser(json);
      const rules = parser.getRules();

      expect(rules).toHaveLength(0);
    });

    it('defaults severity to "medium" when missing', () => {
      const rule = {
        name: 'no-severity',
        kind: 'Scheduled',
        properties: {
          displayName: 'Rule Without Severity',
          query: 'SecurityEvent | limit 10',
        },
      };
      const json = JSON.stringify([rule]);
      const parser = new SentinelRulesJsonParser(json);
      const rules = parser.getRules();

      expect(rules[0].severity).toBe('medium');
    });

    it('uses displayName as id when name and id are absent', () => {
      const rule = {
        kind: 'Scheduled',
        properties: {
          displayName: 'Fallback Id Rule',
          query: 'SecurityEvent | limit 10',
          severity: 'Low',
        },
      };
      const json = JSON.stringify([rule]);
      const parser = new SentinelRulesJsonParser(json);
      const rules = parser.getRules();

      expect(rules[0].id).toBe('Fallback Id Rule');
    });

    it('throws on invalid JSON', () => {
      const parser = new SentinelRulesJsonParser('{invalid json}');
      expect(() => parser.getRules()).toThrow('Failed to parse Sentinel JSON');
    });

    it('throws on unrecognized format', () => {
      const parser = new SentinelRulesJsonParser(JSON.stringify({ something: 'else' }));
      expect(() => parser.getRules()).toThrow('Unrecognized Sentinel export format');
    });

    it('handles rules without optional tactics and techniques', () => {
      const rule = {
        name: 'no-mitre',
        kind: 'Scheduled',
        properties: {
          displayName: 'Rule Without MITRE',
          description: 'No MITRE mappings',
          query: 'AuditLogs | limit 10',
          severity: 'Informational',
        },
      };
      const json = JSON.stringify([rule]);
      const parser = new SentinelRulesJsonParser(json);
      const rules = parser.getRules();

      expect(rules[0].tactics).toBeUndefined();
      expect(rules[0].techniques).toBeUndefined();
    });
  });
});
