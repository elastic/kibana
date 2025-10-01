/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import expect from 'expect';
import type { RuleResponse } from '@kbn/security-solution-plugin/common/api/detection_engine';
import { getPrebuiltRuleMockOfType } from '@kbn/security-solution-plugin/server/lib/detection_engine/prebuilt_rules/mocks';
import { deleteAllRules } from '../../../../../../config/services/detections_response';
import type { FtrProviderContext } from '../../../../../../ftr_provider_context';
import {
  createPrebuiltRuleAssetSavedObjects,
  createRuleAssetSavedObject,
  deleteAllPrebuiltRuleAssets,
  installPrebuiltRules,
} from '../../../../utils';

export default ({ getService }: FtrProviderContext): void => {
  const es = getService('es');
  const supertest = getService('supertest');
  const detectionsApi = getService('detectionsApi');
  const log = getService('log');

  describe('@ess @serverless @skipInServerlessMKI Detect prebuilt rule customization (base version exists)', () => {
    beforeEach(async () => {
      await deleteAllRules(supertest, log);
      await deleteAllPrebuiltRuleAssets(es, log);
    });

    const testFieldCustomization = async ({
      fieldName,
      customizedValue,
      ruleType,
    }: {
      fieldName: string;
      customizedValue: unknown;
      // Rule type shouldn't be required to customize prebuilt rules.
      // However prebuilt rules customization doesn't work as expected when rule type
      // isn't provided for non custom query rule types.
      ruleType?: RuleResponse['type'];
    }) => {
      const { body: nonCustomizedRule } = await detectionsApi
        .readRule({
          query: { rule_id: PREBUILT_RULE_ID },
        })
        .expect(200);

      // Assert the customization for "fieldName" works
      const { body: customizedResponse } = await detectionsApi
        .patchRule({
          body: { rule_id: PREBUILT_RULE_ID, type: ruleType, [fieldName]: customizedValue },
        })
        .expect(200);

      expect(customizedResponse.rule_source).toMatchObject({
        type: 'external',
        is_customized: true,
      });

      // Assert that patching the "fieldName" to its original value reverts the customization
      const { body: customizationRevertedResponse } = await detectionsApi
        .updateRule({
          body: { ...nonCustomizedRule, id: undefined },
        })
        .expect(200);

      expect(customizationRevertedResponse.rule_source).toMatchObject({
        type: 'external',
        is_customized: false,
      });
    };

    describe('common rule fields', () => {
      beforeEach(async () => {
        await createPrebuiltRuleAssetSavedObjects(es, [QUERY_PREBUILT_RULE_ASSET]);
        await installPrebuiltRules(es, supertest);
      });

      it('"name" field', () =>
        testFieldCustomization({
          fieldName: 'name',
          customizedValue: 'some other name',
        }));

      it('"description" field', () =>
        testFieldCustomization({
          fieldName: 'description',
          customizedValue: 'some other description',
        }));

      it('"note" field', () =>
        testFieldCustomization({
          fieldName: 'note',
          customizedValue: '# some note markdown',
        }));

      it('"severity" field', () =>
        testFieldCustomization({
          fieldName: 'severity',
          customizedValue: 'medium',
        }));

      it('"tags" field', () =>
        testFieldCustomization({
          fieldName: 'tags',
          customizedValue: ['red fish', 'blue fish'],
        }));

      it('"severity_mapping" field', () =>
        testFieldCustomization({
          fieldName: 'severity_mapping',
          customizedValue: [
            {
              field: 'event.severity',
              operator: 'equals',
              severity: 'low',
              value: 'LOW',
            },
          ],
        }));

      it('"risk_score" field', () =>
        testFieldCustomization({
          fieldName: 'risk_score',
          customizedValue: 72,
        }));

      it('"risk_score_mapping" field', () =>
        testFieldCustomization({
          fieldName: 'risk_score_mapping',
          customizedValue: [{ field: 'event.risk_score', operator: 'equals', value: '' }],
        }));

      it('"references" field', () =>
        testFieldCustomization({
          fieldName: 'references',
          customizedValue: ['http://test.test'],
        }));

      it('"false_positives" field', () =>
        testFieldCustomization({
          fieldName: 'false_positives',
          customizedValue: ['false positive example'],
        }));

      it('"threat" field', () =>
        testFieldCustomization({
          fieldName: 'threat',
          customizedValue: [
            {
              framework: 'MITRE ATT&CK',
              tactic: {
                id: 'TA0000',
                name: 'test tactic',
                reference: 'https://attack.mitre.org/tactics/TA0000/',
              },
            },
          ],
        }));

      it('"setup" field', () =>
        testFieldCustomization({
          fieldName: 'setup',
          customizedValue: '# some setup markdown',
        }));

      it('"related_integrations" field', () =>
        testFieldCustomization({
          fieldName: 'related_integrations',
          customizedValue: [{ package: 'package-a', version: '^1.2.3' }],
        }));

      it('"required_fields" field', () =>
        testFieldCustomization({
          fieldName: 'required_fields',
          customizedValue: [{ name: '@timestamp', type: 'date' }],
        }));

      it('"max_signals" field', () =>
        testFieldCustomization({
          fieldName: 'max_signals',
          customizedValue: 42,
        }));

      it('"investigation_fields" field', () =>
        testFieldCustomization({
          fieldName: 'investigation_fields',
          customizedValue: { field_names: ['blob', 'boop'] },
        }));

      it('"rule_name_override" field', () =>
        testFieldCustomization({
          fieldName: 'rule_name_override',
          customizedValue: 'override string',
        }));

      it('"timestamp_override" field', () =>
        testFieldCustomization({
          fieldName: 'timestamp_override',
          customizedValue: 'event.ingested',
        }));

      it('"timeline_template" fields', async () => {
        const { body: nonCustomizedRule } = await detectionsApi
          .readRule({
            query: { rule_id: PREBUILT_RULE_ID },
          })
          .expect(200);

        const { body: customizedResponse } = await detectionsApi
          .patchRule({
            body: {
              rule_id: PREBUILT_RULE_ID,
              timeline_id: '123',
              timeline_title: 'timeline title',
            },
          })
          .expect(200);

        expect(customizedResponse.rule_source).toMatchObject({
          type: 'external',
          is_customized: true,
        });

        const { body: customizationRevertedResponse } = await detectionsApi
          .updateRule({
            body: {
              ...nonCustomizedRule,
              id: undefined,
            },
          })
          .expect(200);

        expect(customizationRevertedResponse.rule_source).toMatchObject({
          type: 'external',
          is_customized: false,
        });
      });

      it('"building_block_type" field', () =>
        testFieldCustomization({
          fieldName: 'building_block_type',
          customizedValue: 'building block string',
        }));

      describe('rule schedule', () => {
        it('"interval" field', () =>
          testFieldCustomization({
            fieldName: 'interval',
            customizedValue: '30m',
          }));

        it('"from" field', () =>
          testFieldCustomization({
            fieldName: 'from',
            customizedValue: 'now-10m',
          }));

        it('"to" field', () =>
          testFieldCustomization({
            fieldName: 'to',
            customizedValue: 'now-1m',
          }));
      });
    });

    describe('custom query rule fields', () => {
      beforeEach(async () => {
        await createPrebuiltRuleAssetSavedObjects(es, [QUERY_PREBUILT_RULE_ASSET]);
        await installPrebuiltRules(es, supertest);
      });

      it('"query" field', () =>
        testFieldCustomization({
          fieldName: 'query',
          customizedValue: 'event.action: *',
        }));

      it('"language" field', () =>
        testFieldCustomization({
          fieldName: 'language',
          customizedValue: 'lucene',
        }));

      it('"filters" field', () =>
        testFieldCustomization({
          fieldName: 'filters',
          customizedValue: [
            {
              meta: {
                negate: false,
                disabled: false,
                type: 'phrase',
                key: 'test',
                params: {
                  query: 'value',
                },
              },
              query: {
                term: {
                  field: 'value',
                },
              },
            },
          ],
        }));

      it('"index" field', () =>
        testFieldCustomization({
          fieldName: 'index',
          customizedValue: ['new-index-pattern-*'],
        }));

      it('"data_view_id" field', async () => {
        const { body: nonCustomizedRule } = await detectionsApi
          .readRule({
            query: { rule_id: PREBUILT_RULE_ID },
          })
          .expect(200);

        const { body: customizedResponse } = await detectionsApi
          .patchRule({
            body: { rule_id: PREBUILT_RULE_ID, data_view_id: 'new-data-view', index: [] },
          })
          .expect(200);

        expect(customizedResponse.rule_source).toMatchObject({
          type: 'external',
          is_customized: true,
        });

        const { body: customizationRevertedResponse } = await detectionsApi
          .updateRule({
            body: {
              ...nonCustomizedRule,
              id: undefined,
            },
          })
          .expect(200);

        expect(customizationRevertedResponse.rule_source).toMatchObject({
          type: 'external',
          is_customized: false,
        });
      });

      it('"alert_suppression" field', () =>
        testFieldCustomization({
          fieldName: 'alert_suppression',
          customizedValue: {
            group_by: ['host.name'],
            duration: { value: 5, unit: 'm' },
            missing_fields_strategy: 'suppress',
          },
        }));
    });

    describe('saved query rule type fields', () => {
      beforeEach(async () => {
        await createPrebuiltRuleAssetSavedObjects(es, [SAVED_QUERY_PREBUILT_RULE_ASSET]);
        await installPrebuiltRules(es, supertest);
      });

      it('"saved_id" field', () =>
        testFieldCustomization({
          fieldName: 'saved_id',
          customizedValue: 'customized-saved-query-id',
          ruleType: 'saved_query',
        }));

      it('"alert_suppression" field', () =>
        testFieldCustomization({
          fieldName: 'alert_suppression',
          customizedValue: {
            group_by: ['host.name'],
            duration: { value: 5, unit: 'm' },
            missing_fields_strategy: 'suppress',
          },
        }));
    });

    describe('EQL rule type fields', () => {
      beforeEach(async () => {
        await createPrebuiltRuleAssetSavedObjects(es, [EQL_PREBUILT_RULE_ASSET]);
        await installPrebuiltRules(es, supertest);
      });

      it('"query" field', () =>
        testFieldCustomization({
          fieldName: 'query',
          customizedValue: 'process where process.name == "some_process"',
        }));

      it('"event_category_override" field', () =>
        testFieldCustomization({
          fieldName: 'event_category_override',
          customizedValue: 'host.name',
        }));

      it('"timestamp_field" field', () =>
        testFieldCustomization({
          fieldName: 'timestamp_field',
          customizedValue: 'event.ingested',
        }));

      it('"tiebreaker_field" field', () =>
        testFieldCustomization({
          fieldName: 'tiebreaker_field',
          customizedValue: 'event.ingested',
        }));

      it('"alert_suppression" field', () =>
        testFieldCustomization({
          fieldName: 'alert_suppression',
          customizedValue: {
            group_by: ['host.name'],
            duration: { value: 5, unit: 'm' },
            missing_fields_strategy: 'suppress',
          },
        }));
    });

    describe('threat match rule type fields', () => {
      beforeEach(async () => {
        await createPrebuiltRuleAssetSavedObjects(es, [THREAT_MATCH_PREBUILT_RULE_ASSET]);
        await installPrebuiltRules(es, supertest);
      });

      it('"threat_index" field', () =>
        testFieldCustomization({
          fieldName: 'threat_index',
          customizedValue: ['blue fish', 'red fish'],
          ruleType: 'threat_match',
        }));

      it('"threat_mapping" field', () =>
        testFieldCustomization({
          fieldName: 'threat_mapping',
          customizedValue: [
            {
              entries: [
                {
                  field: 'Endpoint.capabilities',
                  type: 'mapping',
                  value: 'Target.dll.pe.description',
                },
              ],
            },
          ],
          ruleType: 'threat_match',
        }));

      it('"threat_indicator_path" field', () =>
        testFieldCustomization({
          fieldName: 'threat_indicator_path',
          customizedValue: 'C:over/there.exe',
          ruleType: 'threat_match',
        }));

      it('"threat_query" field', () =>
        testFieldCustomization({
          fieldName: 'threat_query',
          customizedValue: 'event.action: *',
          ruleType: 'threat_match',
        }));

      it('"threat_language" field', () =>
        testFieldCustomization({
          fieldName: 'threat_language',
          customizedValue: 'lucene',
          ruleType: 'threat_match',
        }));

      it('"threat_filters" field', () =>
        testFieldCustomization({
          fieldName: 'threat_filters',
          customizedValue: [
            {
              meta: {
                negate: false,
                disabled: false,
                type: 'phrase',
                key: 'test',
                params: {
                  query: 'value',
                },
              },
              query: {
                term: {
                  field: 'value',
                },
              },
            },
          ],
          ruleType: 'threat_match',
        }));

      it('"alert_suppression" field', () =>
        testFieldCustomization({
          fieldName: 'alert_suppression',
          customizedValue: {
            group_by: ['host.name'],
            duration: { value: 5, unit: 'm' },
            missing_fields_strategy: 'suppress',
          },
        }));
    });

    describe('threshold rule type fields', () => {
      beforeEach(async () => {
        await createPrebuiltRuleAssetSavedObjects(es, [THRESHOLD_PREBUILT_RULE_ASSET]);
        await installPrebuiltRules(es, supertest);
      });

      it('"threshold" field', () =>
        testFieldCustomization({
          fieldName: 'threshold',
          customizedValue: {
            field: ['Responses.process.pid'],
            value: 100,
            cardinality: [{ field: 'host.id', value: 2 }],
          },
          ruleType: 'threshold',
        }));

      it('"alert_suppression" field', () =>
        testFieldCustomization({
          fieldName: 'alert_suppression',
          customizedValue: {
            group_by: ['host.name'],
            duration: { value: 5, unit: 'm' },
            missing_fields_strategy: 'suppress',
          },
        }));
    });

    describe('machine learning rule type fields', () => {
      beforeEach(async () => {
        await createPrebuiltRuleAssetSavedObjects(es, [MACHINE_LEARNING_PREBUILT_RULE_ASSET]);
        await installPrebuiltRules(es, supertest);
      });

      it('"machine_learning_job_id" field', () =>
        testFieldCustomization({
          fieldName: 'machine_learning_job_id',
          customizedValue: '123',
          ruleType: 'machine_learning',
        }));

      it('"anomaly_threshold" field', () =>
        testFieldCustomization({
          fieldName: 'anomaly_threshold',
          customizedValue: 20,
          ruleType: 'machine_learning',
        }));

      it('"alert_suppression" field', () =>
        testFieldCustomization({
          fieldName: 'alert_suppression',
          customizedValue: {
            group_by: ['host.name'],
            duration: { value: 5, unit: 'm' },
            missing_fields_strategy: 'suppress',
          },
        }));
    });

    describe('new terms rule type fields', () => {
      beforeEach(async () => {
        await createPrebuiltRuleAssetSavedObjects(es, [NEW_TERMS_PREBUILT_RULE_ASSET]);
        await installPrebuiltRules(es, supertest);
      });

      it('"new_terms_fields" field', () =>
        testFieldCustomization({
          fieldName: 'new_terms_fields',
          customizedValue: ['event.action'],
          ruleType: 'new_terms',
        }));

      it('"history_window_start" field', () =>
        testFieldCustomization({
          fieldName: 'history_window_start',
          customizedValue: 'now-7d',
          ruleType: 'new_terms',
        }));

      it('"alert_suppression" field', () =>
        testFieldCustomization({
          fieldName: 'alert_suppression',
          customizedValue: {
            group_by: ['host.name'],
            duration: { value: 5, unit: 'm' },
            missing_fields_strategy: 'suppress',
          },
        }));
    });

    describe('ES|QL rule type fields', () => {
      beforeEach(async () => {
        await createPrebuiltRuleAssetSavedObjects(es, [ESQL_PREBUILT_RULE_ASSET]);
        await installPrebuiltRules(es, supertest);
      });

      it('"query" field', () =>
        testFieldCustomization({
          fieldName: 'query',
          customizedValue: 'FROM sample_data | SORT @timestamp DESC | LIMIT 3',
        }));

      it('"alert_suppression" field', () =>
        testFieldCustomization({
          fieldName: 'alert_suppression',
          customizedValue: {
            group_by: ['host.name'],
            duration: { value: 5, unit: 'm' },
            missing_fields_strategy: 'suppress',
          },
        }));
    });
  });
};

const PREBUILT_RULE_ID = 'test-prebuilt-rule';
const QUERY_PREBUILT_RULE_ASSET = createRuleAssetSavedObject({
  rule_id: PREBUILT_RULE_ID,
  version: 3,
});
const SAVED_QUERY_PREBUILT_RULE_ASSET = createRuleAssetSavedObject({
  type: 'saved_query',
  saved_id: 'saved-query-id',
  rule_id: PREBUILT_RULE_ID,
  version: 3,
});
const EQL_PREBUILT_RULE_ASSET = createRuleAssetSavedObject({
  ...getPrebuiltRuleMockOfType('eql'),
  rule_id: PREBUILT_RULE_ID,
  version: 3,
});
const THREAT_MATCH_PREBUILT_RULE_ASSET = createRuleAssetSavedObject({
  ...getPrebuiltRuleMockOfType('threat_match'),
  rule_id: PREBUILT_RULE_ID,
  version: 3,
});
const THRESHOLD_PREBUILT_RULE_ASSET = createRuleAssetSavedObject({
  ...getPrebuiltRuleMockOfType('threshold'),
  rule_id: PREBUILT_RULE_ID,
  version: 3,
});
const MACHINE_LEARNING_PREBUILT_RULE_ASSET = createRuleAssetSavedObject({
  ...getPrebuiltRuleMockOfType('machine_learning'),
  rule_id: PREBUILT_RULE_ID,
  version: 3,
});
const NEW_TERMS_PREBUILT_RULE_ASSET = createRuleAssetSavedObject({
  ...getPrebuiltRuleMockOfType('new_terms'),
  rule_id: PREBUILT_RULE_ID,
  version: 3,
});
const ESQL_PREBUILT_RULE_ASSET = createRuleAssetSavedObject({
  ...getPrebuiltRuleMockOfType('esql'),
  rule_id: PREBUILT_RULE_ID,
  version: 3,
});
