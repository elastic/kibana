/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from 'expect';
import type SuperTest from 'supertest';
import { ModeEnum } from '@kbn/security-solution-plugin/common/api/detection_engine';
import { setUpRuleUpgrade } from '../../../../../utils/rules/prebuilt_rules/set_up_rule_upgrade';
import { FtrProviderContext } from '../../../../../../../ftr_provider_context';
import { performUpgradePrebuiltRules, getWebHookAction } from '../../../../../utils';

export function upgradeOnePrebuiltRule({ getService }: FtrProviderContext): void {
  const es = getService('es');
  const supertest = getService('supertest');
  const log = getService('log');
  const securitySolutionApi = getService('securitySolutionApi');
  const deps = {
    es,
    supertest,
    log,
  };

  describe('one rule with historical versions', () => {
    const RULE_TYPES = [
      'query',
      'saved_query',
      'eql',
      'esql',
      'threat_match',
      'threshold',
      'machine_learning',
      'new_terms',
    ] as const;

    for (const ruleType of RULE_TYPES) {
      it(`upgrades non-customized ${ruleType} rule`, async () => {
        await setUpRuleUpgrade({
          assets: {
            installed: {
              type: ruleType,
              name: 'Initial name',
              rule_id: 'rule_1',
              version: 1,
            },
            patch: {},
            upgrade: {
              type: ruleType,
              name: 'Updated name',
              rule_id: 'rule_1',
              version: 2,
            },
          },
          deps,
        });

        const response = await performUpgradePrebuiltRules(es, supertest, {
          mode: ModeEnum.SPECIFIC_RULES,
          rules: [
            {
              rule_id: 'rule_1',
              revision: 0,
              version: 2,
              pick_version: 'TARGET',
            },
          ],
        });

        expect(response.results.updated).toMatchObject([
          {
            rule_id: 'rule_1',
            version: 2,
            name: 'Updated name',
          },
        ]);
      });

      it(`upgrades customized ${ruleType} rule`, async () => {
        await setUpRuleUpgrade({
          assets: {
            installed: {
              type: ruleType,
              name: 'Initial name',
              rule_id: 'rule_1',
              version: 1,
            },
            patch: {
              rule_id: 'rule_1',
              name: 'Customized name',
            },
            upgrade: {
              type: ruleType,
              name: 'Updated name',
              rule_id: 'rule_1',
              version: 2,
            },
          },
          deps,
        });

        const response = await performUpgradePrebuiltRules(es, supertest, {
          mode: ModeEnum.SPECIFIC_RULES,
          rules: [
            {
              rule_id: 'rule_1',
              revision: 1,
              version: 2,
              pick_version: 'TARGET',
            },
          ],
        });

        expect(response.results.updated).toMatchObject([
          {
            rule_id: 'rule_1',
            version: 2,
            name: 'Updated name',
          },
        ]);
      });
    }

    const RULE_TYPE_CHANGES = RULE_TYPES.flatMap((ruleTypeA) =>
      RULE_TYPES.map((ruleTypeB) => [ruleTypeA, ruleTypeB] as const)
    ).filter(([ruleTypeA, ruleTypeB]) => ruleTypeA !== ruleTypeB);

    for (const [ruleTypeA, ruleTypeB] of RULE_TYPE_CHANGES) {
      it(`upgrades non-customized ${ruleTypeA} rule to ${ruleTypeB} rule`, async () => {
        await setUpRuleUpgrade({
          assets: {
            installed: {
              type: ruleTypeA,
              name: 'Initial name',
              rule_id: 'rule_1',
              version: 1,
            },
            patch: {},
            upgrade: {
              type: ruleTypeB,
              name: 'Updated name',
              rule_id: 'rule_1',
              version: 2,
            },
          },
          deps,
        });

        const response = await performUpgradePrebuiltRules(es, supertest, {
          mode: ModeEnum.SPECIFIC_RULES,
          rules: [
            {
              rule_id: 'rule_1',
              revision: 0,
              version: 2,
              pick_version: 'TARGET',
            },
          ],
        });

        expect(response.results.updated).toMatchObject([
          {
            rule_id: 'rule_1',
            version: 2,
            type: ruleTypeB,
            name: 'Updated name',
          },
        ]);
      });

      it(`upgrades customized ${ruleTypeA} rule to ${ruleTypeB} rule type`, async () => {
        await setUpRuleUpgrade({
          assets: {
            installed: {
              type: ruleTypeA,
              name: 'Initial name',
              rule_id: 'rule_1',
              version: 1,
            },
            patch: {
              rule_id: 'rule_1',
              name: 'Customized name',
            },
            upgrade: {
              type: ruleTypeB,
              name: 'Updated name',
              rule_id: 'rule_1',
              version: 2,
            },
          },
          deps,
        });

        const response = await performUpgradePrebuiltRules(es, supertest, {
          mode: ModeEnum.SPECIFIC_RULES,
          rules: [
            {
              rule_id: 'rule_1',
              revision: 1,
              version: 2,
              pick_version: 'TARGET',
            },
          ],
        });

        expect(response.results.updated).toMatchObject([
          {
            rule_id: 'rule_1',
            version: 2,
            type: ruleTypeB,
            name: 'Updated name',
          },
        ]);
      });
    }

    for (const pickVersion of ['BASE', 'CURRENT', 'MERGED'] as const) {
      it(`UNABLE to upgrade rule when rule type changed and <pick version> is ${pickVersion}`, async () => {
        await setUpRuleUpgrade({
          assets: {
            installed: {
              type: 'query',
              name: 'Initial name',
              rule_id: 'rule_1',
              version: 1,
            },
            patch: {
              rule_id: 'rule_1',
              name: 'Customized name',
            },
            upgrade: {
              type: 'saved_query',
              name: 'Updated name',
              rule_id: 'rule_1',
              version: 2,
            },
          },
          deps,
        });

        const response = await performUpgradePrebuiltRules(es, supertest, {
          mode: ModeEnum.SPECIFIC_RULES,
          rules: [
            {
              rule_id: 'rule_1',
              revision: 1,
              version: 2,
              pick_version: pickVersion,
            },
          ],
        });

        expect(response.summary).toMatchObject({
          total: 1,
          succeeded: 0,
          skipped: 0,
          failed: 1,
        });
        expect(response.errors).toHaveLength(1);
      });
    }

    for (const ruleType of RULE_TYPES) {
      it(`UNABLE to upgrade non-upgradable fields for ${ruleType} rule`, async () => {
        const NON_UPGRADABLE_FIELDS = {
          enabled: true,
          exceptions_list: [
            {
              id: 'test-list',
              list_id: 'test-list',
              type: 'detection',
              namespace_type: 'single',
            } as const,
          ],
          actions: [await createAction(supertest)],
          response_actions: [
            {
              params: {
                command: 'isolate' as const,
                comment: 'comment',
              },
              action_type_id: '.endpoint' as const,
            },
          ],
          meta: { some_key: 'some_value' },
          output_index: '.siem-signals-default',
          namespace: 'default',
          ...(ruleType === 'threat_match' ? { concurrent_searches: 5, items_per_search: 100 } : {}),
        };

        await setUpRuleUpgrade({
          assets: {
            installed: {
              rule_id: 'rule_1',
              version: 1,
              type: ruleType,
            },
            patch: {
              rule_id: 'rule_1',
              type: ruleType,
              ...NON_UPGRADABLE_FIELDS,
              // Patch for Threshold rules fails without threshold specified
              ...(ruleType === 'threshold' ? { threshold: { value: 10, field: 'fieldA' } } : {}),
            },
            upgrade: {
              rule_id: 'rule_1',
              version: 2,
              type: ruleType,
            },
          },
          deps,
        });

        const response = await performUpgradePrebuiltRules(es, supertest, {
          mode: ModeEnum.ALL_RULES,
          pick_version: 'TARGET',
        });
        const upgradedRule = await securitySolutionApi.readRule({
          query: { rule_id: 'rule_1' },
        });

        expect(response.results.updated).toMatchObject([
          {
            ...NON_UPGRADABLE_FIELDS,
            version: 2,
          },
        ]);
        expect(upgradedRule.body).toMatchObject({
          ...NON_UPGRADABLE_FIELDS,
          version: 2,
        });
      });
    }
  });
}

async function createAction(supertest: SuperTest.Agent) {
  const createConnector = async (payload: Record<string, unknown>) =>
    (
      await supertest
        .post('/api/actions/connector')
        .set('kbn-xsrf', 'true')
        .send(payload)
        .expect(200)
    ).body;

  const createWebHookConnector = () => createConnector(getWebHookAction());

  const webHookAction = await createWebHookConnector();

  const defaultRuleAction = {
    id: webHookAction.id,
    action_type_id: '.webhook' as const,
    group: 'default' as const,
    params: {
      body: '{"test":"a default action"}',
    },
    frequency: {
      notifyWhen: 'onThrottleInterval' as const,
      summary: true,
      throttle: '1h' as const,
    },
    uuid: 'd487ec3d-05f2-44ad-8a68-11c97dc92202',
  };

  return defaultRuleAction;
}
