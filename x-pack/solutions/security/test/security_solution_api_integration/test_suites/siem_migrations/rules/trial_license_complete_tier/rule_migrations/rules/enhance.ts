/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from 'expect';
import type { Threat } from '@kbn/security-solution-plugin/common/api/detection_engine';
import { getMockQRadarXml } from '@kbn/security-solution-plugin/common/siem_migrations/parsers/qradar/mock/data';
import type { EnhanceRulesParams } from '../../../../utils';
import { deleteAllRuleMigrations, ruleMigrationRouteHelpersFactory } from '../../../../utils';
import type { FtrProviderContext } from '../../../../../../ftr_provider_context';

export default ({ getService }: FtrProviderContext) => {
  const es = getService('es');
  const supertest = getService('supertest');
  const migrationRulesRoutes = ruleMigrationRouteHelpersFactory(supertest);

  describe('@ess @serverless @serverlessQA Enhance Rules API', () => {
    let migrationId: string;
    const RULE_NAME = 'Test QRadar Rule';
    beforeEach(async () => {
      await deleteAllRuleMigrations(es);
      const response = await migrationRulesRoutes.create({});
      migrationId = response.body.migration_id;
    });

    it('should enhance rules with QRadar MITRE mappings', async () => {
      const { mockQradarXml } = getMockQRadarXml([RULE_NAME]);
      // Create a rule
      await migrationRulesRoutes.addQradarRulesToMigration({
        migrationId,
        payload: {
          xml: mockQradarXml,
        },
      });

      // Enhance the rule with MITRE mappings
      const enhancePayload: EnhanceRulesParams['payload'] = {
        vendor: 'qradar',
        type: 'mitre',
        data: {
          [RULE_NAME]: {
            id: 'rule_123',
            mapping: {
              TA0001: {
                enabled: true,
                name: 'Initial Access',
                techniques: {
                  T1078: {
                    enabled: true,
                    id: 'T1078',
                  },
                },
              },
              TA0002: {
                enabled: true,
                name: 'Execution',
                techniques: {
                  T1059: {
                    enabled: true,
                    id: 'T1059',
                  },
                },
              },
            },
          },
        },
      };

      const { body: enhanceResponse } = await migrationRulesRoutes.enhanceRules({
        migrationId,
        payload: enhancePayload,
      });

      // Verify response
      expect(enhanceResponse.updated).toBe(true);

      // Fetch the rule and verify threat field is populated
      const { body: rulesResponse } = await migrationRulesRoutes.getRules({ migrationId });
      expect(rulesResponse.total).toBe(1);

      const enhancedRule = rulesResponse.data[0];
      expect(enhancedRule.original_rule.threat).toBeDefined();
      expect(enhancedRule.original_rule.threat).toHaveLength(2);

      // Verify first tactic
      const initialAccessTactic = enhancedRule.original_rule.threat?.find(
        (t: Threat) => t.tactic.id === 'TA0001'
      );
      expect(initialAccessTactic).toBeDefined();
      expect(initialAccessTactic?.framework).toBe('MITRE ATT&CK');
      expect(initialAccessTactic?.tactic.name).toBe('Initial Access');
      expect(initialAccessTactic?.technique).toHaveLength(1);
      expect(initialAccessTactic?.technique?.[0]?.id).toBe('T1078');

      // Verify second tactic
      const executionTactic = enhancedRule.original_rule.threat?.find(
        (t: Threat) => t.tactic.id === 'TA0002'
      );
      expect(executionTactic).toBeDefined();
      expect(executionTactic?.tactic.name).toBe('Execution');
      expect(executionTactic?.technique?.[0]?.id).toBe('T1059');
    });

    it('should handle multiple rules enhancement', async () => {
      const rule1Name = 'QRadar Rule 1';
      const rule2Name = 'QRadar Rule 2';

      const { mockQradarXml } = getMockQRadarXml([rule1Name, rule2Name]);

      // Create multiple rules
      await migrationRulesRoutes.addQradarRulesToMigration({
        migrationId,
        payload: {
          xml: mockQradarXml,
        },
      });

      // Enhance both rules
      const enhancePayload: EnhanceRulesParams['payload'] = {
        vendor: 'qradar',
        type: 'mitre',
        data: {
          [rule1Name]: {
            id: 'rule_1',
            mapping: {
              TA0001: {
                enabled: true,
                name: 'Initial Access',
                techniques: {
                  T1078: { enabled: true, id: 'T1078' },
                },
              },
            },
          },
          [rule2Name]: {
            id: 'rule_2',
            mapping: {
              TA0003: {
                enabled: true,
                name: 'Persistence',
                techniques: {
                  T1098: { enabled: true, id: 'T1098' },
                },
              },
            },
          },
        },
      };

      const { body: enhanceResponse } = await migrationRulesRoutes.enhanceRules({
        migrationId,
        payload: enhancePayload,
      });

      expect(enhanceResponse.updated).toBe(true);
    });

    it('should skip disabled techniques', async () => {
      const ruleName = 'Test Rule with Disabled Techniques';
      const { mockQradarXml } = getMockQRadarXml([ruleName]);
      await migrationRulesRoutes.addQradarRulesToMigration({
        migrationId,
        payload: {
          xml: mockQradarXml,
        },
      });

      const enhancePayload: EnhanceRulesParams['payload'] = {
        vendor: 'qradar',
        type: 'mitre',
        data: {
          [ruleName]: {
            id: 'rule_123',
            mapping: {
              TA0001: {
                enabled: true,
                name: 'Initial Access',
                techniques: {
                  T1078: { enabled: true, id: 'T1078' },
                  T1190: { enabled: false, id: 'T1190' }, // Disabled technique
                },
              },
            },
          },
        },
      };

      await migrationRulesRoutes.enhanceRules({
        migrationId,
        payload: enhancePayload,
      });

      const { body: rulesResponse } = await migrationRulesRoutes.getRules({ migrationId });
      const enhancedRule = rulesResponse.data[0];
      const tactic = enhancedRule.original_rule?.threat?.[0];

      // Should only have the enabled technique
      expect(tactic?.technique).toHaveLength(1);
      expect(tactic?.technique?.[0].id).toBe('T1078');
    });

    it('should add tactic even if there are not techniques', async () => {
      const ruleName = 'Test Rule with Tactic Only';
      const { mockQradarXml } = getMockQRadarXml([ruleName]);
      await migrationRulesRoutes.addQradarRulesToMigration({
        migrationId,
        payload: {
          xml: mockQradarXml,
        },
      });

      const enhancePayload: EnhanceRulesParams['payload'] = {
        vendor: 'qradar',
        type: 'mitre',
        data: {
          [ruleName]: {
            id: 'rule_123',
            mapping: {
              TA0004: {
                enabled: true,
                name: 'Privilege Escalation',
                techniques: {
                  // No techniques enabled
                },
              },
            },
          },
        },
      };

      await migrationRulesRoutes.enhanceRules({
        migrationId,
        payload: enhancePayload,
      });

      const { body: rulesResponse } = await migrationRulesRoutes.getRules({ migrationId });
      const enhancedRule = rulesResponse.data[0];
      const tactic = enhancedRule.original_rule?.threat?.[0];
      expect(tactic).toBeDefined();
      expect(tactic?.tactic.id).toBe('TA0004');
      expect(tactic?.technique).toHaveLength(0);
    });

    describe('Error cases', () => {
      it('should return error when no rules are found for update', async () => {
        const enhancePayload: EnhanceRulesParams['payload'] = {
          vendor: 'qradar',
          type: 'mitre',
          data: {
            'Non-existent Rule': {
              id: 'rule_123',
              mapping: {
                TA0001: {
                  enabled: true,
                  name: 'Initial Access',
                  techniques: {
                    T1078: { enabled: true, id: 'T1078' },
                  },
                },
              },
            },
          },
        };

        await migrationRulesRoutes.enhanceRules({
          migrationId,
          payload: enhancePayload,
          expectStatusCode: 400,
        });
      });

      it('should return 400 for invalid vendor', async () => {
        await migrationRulesRoutes.enhanceRules({
          migrationId,
          payload: {
            // @ts-expect-error testing invalid vendor
            vendor: 'invalid_vendor',
            type: 'mitre',
            data: {},
          },
          expectStatusCode: 400,
        });
      });

      it('should return 404 for non-existent migration', async () => {
        await migrationRulesRoutes.enhanceRules({
          migrationId: 'non-existent-migration-id',
          payload: {
            vendor: 'qradar',
            type: 'mitre',
            data: {},
          },
          expectStatusCode: 404,
        });
      });
    });
  });
};
