/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from 'expect';
import { DETECTION_ENGINE_RULES_IMPORT_URL } from '@kbn/security-solution-plugin/common/constants';
import { createRule, deleteAllRules } from '@kbn/detections-response-ftr-services';
import { PRECONFIGURED_EMAIL_ACTION_CONNECTOR_ID } from '../../../../../config/shared';
import {
  fetchRule,
  getCustomQueryRuleParams,
  getThresholdRuleForAlertTesting,
  importRules,
  importRulesWithSuccess,
} from '../../../utils';
import type { FtrProviderContext } from '../../../../../ftr_provider_context';

const RULE_TO_IMPORT_RULE_ID = 'imported-rule';
const RULE_TO_IMPORT_RULE_ID_2 = 'another-imported-rule';

export default ({ getService }: FtrProviderContext): void => {
  const supertest = getService('supertest');
  const detectionsApi = getService('detectionsApi');
  const log = getService('log');
  const spacesServices = getService('spaces');

  describe('@ess @serverless @skipInServerlessMKI import custom rules', () => {
    const spaceId = '4567-space';

    before(async () => {
      await spacesServices.delete(spaceId);
      await spacesServices.create({
        id: spaceId,
        name: spaceId,
      });
    });

    beforeEach(async () => {
      await deleteAllRules(supertest, log);
      await deleteAllRules(supertest, log, spaceId);
    });

    it('returns the full import response shape on success', async () => {
      const ruleId = 'import-response-shape-rule';
      const importResponse = await importRules({
        getService,
        rules: [
          getCustomQueryRuleParams({
            rule_id: ruleId,
            name: 'Response shape',
            enabled: false,
          }),
        ],
        overwrite: false,
      });

      expect(importResponse).toEqual({
        success: true,
        success_count: 1,
        rules_count: 1,
        errors: [],
        exceptions_success: true,
        exceptions_success_count: 0,
        exceptions_errors: [],
        action_connectors_success: true,
        action_connectors_success_count: 0,
        action_connectors_errors: [],
        action_connectors_warnings: [],
      });

      const { body: imported } = await detectionsApi
        .readRule({ query: { rule_id: ruleId } })
        .expect(200);
      expect(imported.name).toBe('Response shape');
    });

    describe('validation', () => {
      it('rejects with an error if the file type is not that of a ndjson', async () => {
        const { body } = await supertest
          .post(DETECTION_ENGINE_RULES_IMPORT_URL)
          .set('kbn-xsrf', 'true')
          .set('elastic-api-version', '2023-10-31')
          .attach('file', Buffer.from(''), 'rules.txt')
          .expect(400);

        expect(body).toEqual({
          status_code: 400,
          message: 'Invalid file extension .txt',
        });
      });

      describe('threshold rule type', () => {
        it('results in partial success if no threshold-specific fields are provided', async () => {
          const { threshold, ...rule } = getThresholdRuleForAlertTesting(['*']);

          const importResponse = await importRules({
            getService,
            rules: [rule],
            overwrite: false,
          });

          expect(importResponse.errors[0]).toEqual({
            error: {
              status_code: 400,
              message: 'threshold: Invalid input: expected object, received undefined',
            },
          });
        });

        it('results in partial success if more than 5 threshold fields', async () => {
          const baseRule = getThresholdRuleForAlertTesting(['*']);
          const rule = {
            ...baseRule,
            threshold: {
              ...baseRule.threshold,
              field: ['field-1', 'field-2', 'field-3', 'field-4', 'field-5', 'field-6'],
            },
          };

          const importResponse = await importRules({
            getService,
            rules: [rule],
            overwrite: false,
          });

          expect(importResponse.errors[0]).toEqual({
            error: {
              message: 'threshold.field: Too big: expected array to have <=5 items',
              status_code: 400,
            },
          });
        });

        it('results in partial success if threshold value is less than 1', async () => {
          const baseRule = getThresholdRuleForAlertTesting(['*']);
          const rule = {
            ...baseRule,
            threshold: {
              ...baseRule.threshold,
              value: 0,
            },
          };

          const importResponse = await importRules({
            getService,
            rules: [rule],
            overwrite: false,
          });

          expect(importResponse.errors[0]).toEqual({
            error: {
              message: 'threshold.value: Too small: expected number to be >=1',
              status_code: 400,
            },
          });
        });

        it('results in 400 error if cardinality is also an agg field', async () => {
          const baseRule = getThresholdRuleForAlertTesting(['*']);
          const rule = {
            ...baseRule,
            threshold: {
              ...baseRule.threshold,
              cardinality: [
                {
                  field: 'process.name',
                  value: 5,
                },
              ],
            },
          };

          const importResponse = await importRules({
            getService,
            rules: [rule],
            overwrite: false,
          });

          expect(importResponse.errors[0]).toEqual({
            error: {
              message: 'Cardinality of a field that is being aggregated on is always 1',
              status_code: 400,
            },
          });
        });
      });
    });

    const testImportingInSpace = (kibanaSpaceId?: string) => {
      describe('only rules', () => {
        it('imports a custom query rule', async () => {
          const IMPORT_PAYLOAD = [
            getCustomQueryRuleParams({
              rule_id: RULE_TO_IMPORT_RULE_ID,
            }),
          ];

          await importRulesWithSuccess({
            getService,
            rules: IMPORT_PAYLOAD,
            overwrite: false,
            spaceId: kibanaSpaceId,
          });

          const { body: importedRule } = await detectionsApi.readRule(
            {
              query: { rule_id: RULE_TO_IMPORT_RULE_ID },
            },
            kibanaSpaceId
          );

          expect(importedRule).toMatchObject(IMPORT_PAYLOAD[0]);
        });

        it('imports a rule with defined optional fields', async () => {
          const IMPORT_PAYLOAD = [
            getCustomQueryRuleParams({
              rule_id: RULE_TO_IMPORT_RULE_ID,
              investigation_fields: { field_names: ['foo'] },
              related_integrations: [
                {
                  package: 'somePackage',
                  version: '^1.0.0',
                },
              ],
              required_fields: [
                {
                  name: 'fieldA',
                  type: 'string',
                },
              ],
            }),
          ];

          await importRulesWithSuccess({
            getService,
            rules: IMPORT_PAYLOAD,
            overwrite: false,
            spaceId: kibanaSpaceId,
          });

          const { body: importedRule } = await detectionsApi.readRule(
            {
              query: { rule_id: RULE_TO_IMPORT_RULE_ID },
            },
            kibanaSpaceId
          );

          expect(importedRule).toMatchObject({
            investigation_fields: { field_names: ['foo'] },
            related_integrations: [
              {
                package: 'somePackage',
                version: '^1.0.0',
              },
            ],
            required_fields: [
              {
                name: 'fieldA',
                type: 'string',
              },
            ],
          });
        });

        it('imports rules in bulk', async () => {
          const IMPORT_PAYLOAD = [
            getCustomQueryRuleParams({ rule_id: RULE_TO_IMPORT_RULE_ID }),
            getCustomQueryRuleParams({ rule_id: RULE_TO_IMPORT_RULE_ID_2 }),
          ];

          await importRulesWithSuccess({
            getService,
            rules: IMPORT_PAYLOAD,
            overwrite: false,
            spaceId: kibanaSpaceId,
          });

          const { body: importedRule1 } = await detectionsApi.readRule(
            {
              query: { rule_id: RULE_TO_IMPORT_RULE_ID },
            },
            kibanaSpaceId
          );

          expect(importedRule1).toMatchObject(IMPORT_PAYLOAD[0]);

          const { body: importedRule2 } = await detectionsApi.readRule(
            {
              query: { rule_id: RULE_TO_IMPORT_RULE_ID_2 },
            },
            kibanaSpaceId
          );

          expect(importedRule2).toMatchObject(IMPORT_PAYLOAD[1]);
        });
      });
    };

    describe('importing in default space', () => {
      testImportingInSpace();
    });

    describe('importing in non-default space', () => {
      testImportingInSpace(spaceId);

      it('creates and overwrites a rule without affecting the default space', async () => {
        const ruleId = 'space-isolated-rule';

        await createRule(
          supertest,
          log,
          getCustomQueryRuleParams({
            rule_id: ruleId,
            name: 'Default space rule',
            enabled: false,
          })
        );

        await importRulesWithSuccess({
          getService,
          rules: [
            getCustomQueryRuleParams({
              rule_id: ruleId,
              name: 'Space create',
              enabled: false,
            }),
          ],
          overwrite: false,
          spaceId,
        });

        await importRulesWithSuccess({
          getService,
          rules: [
            getCustomQueryRuleParams({
              rule_id: ruleId,
              name: 'Space overwrite',
              enabled: false,
            }),
          ],
          overwrite: true,
          spaceId,
        });

        const { body: defaultRule } = await detectionsApi
          .readRule({ query: { rule_id: ruleId } })
          .expect(200);
        expect(defaultRule.name).toBe('Default space rule');

        const { body: spaceRule } = await detectionsApi
          .readRule({ query: { rule_id: ruleId } }, spaceId)
          .expect(200);
        expect(spaceRule.name).toBe('Space overwrite');
        expect(spaceRule.id).not.toBe(defaultRule.id);
      });
    });

    describe('forward compatibility', () => {
      it('removes any extra rule fields when importing', async () => {
        const rule = getCustomQueryRuleParams({
          rule_id: RULE_TO_IMPORT_RULE_ID,
          extraField: true,
          risk_score_mapping: [
            {
              field: 'host.name',
              value: 'host.name',
              operator: 'equals',
              risk_score: 50,
              // @ts-expect-error
              extraField: true,
            },
          ],
          severity_mapping: [
            {
              field: 'host.name',
              value: 'host.name',
              operator: 'equals',
              severity: 'low',
              // @ts-expect-error
              extraField: true,
            },
          ],
          threat: [
            {
              framework: 'MITRE ATT&CK',
              extraField: true,
              tactic: {
                id: 'TA0001',
                name: 'Initial Access',
                reference: 'https://attack.mitre.org/tactics/TA0001',
                // @ts-expect-error
                extraField: true,
              },
              technique: [],
            },
          ],
          investigation_fields: {
            field_names: ['host.name'],
            // @ts-expect-error
            extraField: true,
          },
        });

        await importRulesWithSuccess({
          getService,
          rules: [rule],
          overwrite: false,
        });

        const importedRule = await fetchRule(supertest, { ruleId: RULE_TO_IMPORT_RULE_ID });

        expect(Object.hasOwn(importedRule, 'extraField')).toBeFalsy();
        expect(Object.hasOwn(importedRule.risk_score_mapping[0], 'extraField')).toBeFalsy();
        expect(Object.hasOwn(importedRule.severity_mapping[0], 'extraField')).toBeFalsy();
        expect(Object.hasOwn(importedRule.threat[0], 'extraField')).toBeFalsy();
        expect(Object.hasOwn(importedRule.threat[0].tactic, 'extraField')).toBeFalsy();
        expect(Object.hasOwn(importedRule.investigation_fields!, 'extraField')).toBeFalsy();
      });
    });

    describe('backward compatibility', () => {
      describe('importing in default space', () => {
        it('migrates rule level throttle', async () => {
          const IMPORT_PAYLOAD = [
            getCustomQueryRuleParams({
              rule_id: RULE_TO_IMPORT_RULE_ID,
              throttle: '1d',
              actions: [
                {
                  group: 'default',
                  id: PRECONFIGURED_EMAIL_ACTION_CONNECTOR_ID,
                  params: {
                    message: 'Rule {{context.rule.name}} generated {{state.signals_count}} alerts',
                  },
                  action_type_id: '.email',
                },
              ],
            }),
          ];

          await importRulesWithSuccess({
            getService,
            rules: IMPORT_PAYLOAD,
            overwrite: false,
          });

          const { body: importedRule } = await detectionsApi.readRule({
            query: { rule_id: RULE_TO_IMPORT_RULE_ID },
          });

          expect(importedRule.throttle).toBeUndefined();
          expect(importedRule.actions[0]).toMatchObject({
            frequency: { summary: true, notifyWhen: 'onThrottleInterval', throttle: '1d' },
          });
        });
      });

      describe('importing in non-default space', () => {
        it('imports a rule from Kibana v7.14 to the non-default space', async () => {
          const IMPORT_PAYLOAD = [
            getCustomQueryRuleParams({
              rule_id: RULE_TO_IMPORT_RULE_ID,
              throttle: '1d',
              actions: [
                {
                  group: 'default',
                  id: PRECONFIGURED_EMAIL_ACTION_CONNECTOR_ID,
                  params: {
                    message: 'Rule {{context.rule.name}} generated {{state.signals_count}} alerts',
                  },
                  action_type_id: '.email',
                },
              ],
            }),
          ];

          await importRulesWithSuccess({
            getService,
            rules: IMPORT_PAYLOAD,
            overwrite: false,
            spaceId,
          });

          const { body: importedRule } = await detectionsApi.readRule(
            {
              query: { rule_id: RULE_TO_IMPORT_RULE_ID },
            },
            spaceId
          );

          expect(importedRule.throttle).toBeUndefined();
          expect(importedRule.actions[0]).toMatchObject({
            frequency: { summary: true, notifyWhen: 'onThrottleInterval', throttle: '1d' },
          });
        });
      });
    });
  });
};
