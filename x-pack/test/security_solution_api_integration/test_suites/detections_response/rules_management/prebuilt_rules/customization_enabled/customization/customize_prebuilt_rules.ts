/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import expect from 'expect';
import { RuleResponse } from '@kbn/security-solution-plugin/common/api/detection_engine';
import {
  getPrebuiltRuleMock,
  getPrebuiltRuleMockOfType,
} from '@kbn/security-solution-plugin/server/lib/detection_engine/prebuilt_rules/mocks';
import { deleteAllRules } from '../../../../../../../common/utils/security_solution';
import { FtrProviderContext } from '../../../../../../ftr_provider_context';
import {
  createPrebuiltRuleAssetSavedObjects,
  createRuleAssetSavedObject,
  deleteAllPrebuiltRuleAssets,
  getWebHookAction,
  installPrebuiltRules,
} from '../../../../utils';

export default ({ getService }: FtrProviderContext): void => {
  const es = getService('es');
  const supertest = getService('supertest');
  const securitySolutionApi = getService('securitySolutionApi');
  const log = getService('log');

  describe('@ess @serverless @skipInServerlessMKI Customize prebuilt rules', () => {
    beforeEach(async () => {
      await deleteAllRules(supertest, log);
      await deleteAllPrebuiltRuleAssets(es, log);
    });

    describe('detecting rule customizations', () => {
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
        const { body } = await securitySolutionApi
          .patchRule({
            body: { rule_id: PREBUILT_RULE_ID, type: ruleType, [fieldName]: customizedValue },
          })
          .expect(200);

        expect(body.rule_source).toMatchObject({
          type: 'external',
          is_customized: true,
        });
      };

      describe('common rule fields', () => {
        beforeEach(async () => {
          await createPrebuiltRuleAssetSavedObjects(es, [QUERY_PREBUILT_RULE_ASSET]);
          await installPrebuiltRules(es, supertest);
        });

        it('name field', () =>
          testFieldCustomization({ fieldName: 'name', customizedValue: 'some other name' }));

        it('description field', () =>
          testFieldCustomization({
            fieldName: 'description',
            customizedValue: 'some other description',
          }));

        it('note field', () =>
          testFieldCustomization({
            fieldName: 'note',
            customizedValue: '# some note markdown',
          }));

        it('severity field', () =>
          testFieldCustomization({
            fieldName: 'severity',
            customizedValue: 'medium',
          }));

        it('tags field', () =>
          testFieldCustomization({
            fieldName: 'tags',
            customizedValue: ['red fish', 'blue fish'],
          }));

        it('severity_mapping field', () =>
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

        it('risk_score field', () =>
          testFieldCustomization({
            fieldName: 'risk_score',
            customizedValue: 72,
          }));

        it('risk_score_mapping field', () =>
          testFieldCustomization({
            fieldName: 'risk_score_mapping',
            customizedValue: [{ field: 'event.risk_score', operator: 'equals', value: '' }],
          }));

        it('references field', () =>
          testFieldCustomization({
            fieldName: 'references',
            customizedValue: ['http://test.test'],
          }));

        it('false_positives field', () =>
          testFieldCustomization({
            fieldName: 'false_positives',
            customizedValue: ['false positive example'],
          }));

        it('threat field', () =>
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

        it('setup field', () =>
          testFieldCustomization({
            fieldName: 'setup',
            customizedValue: '# some setup markdown',
          }));

        it('related_integrations field', () =>
          testFieldCustomization({
            fieldName: 'related_integrations',
            customizedValue: [{ package: 'package-a', version: '^1.2.3' }],
          }));

        it('required_fields field', () =>
          testFieldCustomization({
            fieldName: 'required_fields',
            customizedValue: [{ name: '@timestamp', type: 'date' }],
          }));

        it('max_signals field', () =>
          testFieldCustomization({
            fieldName: 'max_signals',
            customizedValue: 42,
          }));

        it('investigation_fields field', () =>
          testFieldCustomization({
            fieldName: 'investigation_fields',
            customizedValue: { field_names: ['blob', 'boop'] },
          }));

        it('rule_name_override field', () =>
          testFieldCustomization({
            fieldName: 'rule_name_override',
            customizedValue: 'override string',
          }));

        it('timestamp_override field', () =>
          testFieldCustomization({
            fieldName: 'timestamp_override',
            customizedValue: 'event.ingested',
          }));

        it('timeline_template fields', async () => {
          const { body } = await securitySolutionApi
            .patchRule({
              body: {
                rule_id: PREBUILT_RULE_ID,
                timeline_id: '123',
                timeline_title: 'timeline title',
              },
            })
            .expect(200);

          expect(body.rule_source).toMatchObject({
            type: 'external',
            is_customized: true,
          });
        });

        it('building_block_type field', () =>
          testFieldCustomization({
            fieldName: 'building_block_type',
            customizedValue: 'building block string',
          }));

        describe('rule schedule', () => {
          it('interval field', () => {
            testFieldCustomization({
              fieldName: 'interval',
              customizedValue: '30m',
            });
          });

          it('from field', () => {
            testFieldCustomization({
              fieldName: 'from',
              customizedValue: 'now-10m',
            });
          });

          it('to field', () => {
            testFieldCustomization({
              fieldName: 'to',
              customizedValue: 'now-1m',
            });
          });
        });
      });

      describe('Custom Query rule fields', () => {
        beforeEach(async () => {
          await createPrebuiltRuleAssetSavedObjects(es, [QUERY_PREBUILT_RULE_ASSET]);
          await installPrebuiltRules(es, supertest);
        });

        it('query field', () =>
          testFieldCustomization({
            fieldName: 'query',
            customizedValue: 'event.action: *',
          }));

        it('language field', () =>
          testFieldCustomization({
            fieldName: 'language',
            customizedValue: 'lucene',
          }));

        it('filters field', () =>
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

        it('index field', () =>
          testFieldCustomization({
            fieldName: 'index',
            customizedValue: ['new-index-pattern-*'],
          }));

        it('data_view_id field', async () => {
          const { body } = await securitySolutionApi
            .patchRule({
              body: { rule_id: PREBUILT_RULE_ID, data_view_id: 'new-data-view', index: [] },
            })
            .expect(200);

          expect(body.rule_source).toMatchObject({
            type: 'external',
            is_customized: true,
          });
        });

        it('alert_suppression field', () =>
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

        it('query field', () =>
          testFieldCustomization({
            fieldName: 'query',
            customizedValue: 'process where process.name == "some_process"',
          }));

        it('event_category_override field', () =>
          testFieldCustomization({
            fieldName: 'event_category_override',
            customizedValue: 'host.name',
          }));

        it('timestamp_field field', () =>
          testFieldCustomization({
            fieldName: 'timestamp_field',
            customizedValue: 'event.ingested',
          }));

        it('tiebreaker_field field', () =>
          testFieldCustomization({
            fieldName: 'tiebreaker_field',
            customizedValue: 'event.ingested',
          }));
      });

      describe('threat match rule type fields', () => {
        beforeEach(async () => {
          await createPrebuiltRuleAssetSavedObjects(es, [THREAT_MATCH_PREBUILT_RULE_ASSET]);
          await installPrebuiltRules(es, supertest);
        });

        it('threat_index field', () =>
          testFieldCustomization({
            fieldName: 'threat_index',
            customizedValue: ['blue fish', 'red fish'],
            ruleType: 'threat_match',
          }));

        it('threat_mapping field', () =>
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

        it('threat_indicator_path field', () =>
          testFieldCustomization({
            fieldName: 'threat_indicator_path',
            customizedValue: 'C:over/there.exe',
            ruleType: 'threat_match',
          }));

        it('threat_query field', () =>
          testFieldCustomization({
            fieldName: 'threat_query',
            customizedValue: 'event.action: *',
            ruleType: 'threat_match',
          }));

        it('threat_language field', () =>
          testFieldCustomization({
            fieldName: 'threat_language',
            customizedValue: 'lucene',
            ruleType: 'threat_match',
          }));

        it('threat_filters field', () =>
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
      });

      describe('threshold rule type fields', () => {
        beforeEach(async () => {
          await createPrebuiltRuleAssetSavedObjects(es, [THRESHOLD_PREBUILT_RULE_ASSET]);
          await installPrebuiltRules(es, supertest);
        });

        it('threshold field', () =>
          testFieldCustomization({
            fieldName: 'threshold',
            customizedValue: {
              field: ['Responses.process.pid'],
              value: 100,
              cardinality: [{ field: 'host.id', value: 2 }],
            },
            ruleType: 'threshold',
          }));
      });

      describe('machine learning rule type fields', () => {
        beforeEach(async () => {
          await createPrebuiltRuleAssetSavedObjects(es, [MACHINE_LEARNING_PREBUILT_RULE_ASSET]);
          await installPrebuiltRules(es, supertest);
        });

        it('machine_learning_job_id field', () =>
          testFieldCustomization({
            fieldName: 'machine_learning_job_id',
            customizedValue: '123',
            ruleType: 'machine_learning',
          }));

        it('anomaly_threshold field', () =>
          testFieldCustomization({
            fieldName: 'anomaly_threshold',
            customizedValue: 20,
            ruleType: 'machine_learning',
          }));
      });

      describe('new terms rule type fields', () => {
        beforeEach(async () => {
          await createPrebuiltRuleAssetSavedObjects(es, [NEW_TERMS_PREBUILT_RULE_ASSET]);
          await installPrebuiltRules(es, supertest);
        });

        it('new_terms_fields field', () =>
          testFieldCustomization({
            fieldName: 'new_terms_fields',
            customizedValue: ['event.action'],
            ruleType: 'new_terms',
          }));

        it('history_window_start field', () =>
          testFieldCustomization({
            fieldName: 'history_window_start',
            customizedValue: 'now-7d',
            ruleType: 'new_terms',
          }));
      });

      describe('ES|QL rule type fields', () => {
        beforeEach(async () => {
          await createPrebuiltRuleAssetSavedObjects(es, [ESQL_PREBUILT_RULE_ASSET]);
          await installPrebuiltRules(es, supertest);
        });

        it('ES|QL query field', () =>
          testFieldCustomization({
            fieldName: 'query',
            customizedValue: 'FROM sample_data | SORT @timestamp DESC | LIMIT 3',
          }));
      });
    });

    describe('is_customized calculation is not affected by', () => {
      beforeEach(async () => {
        await createPrebuiltRuleAssetSavedObjects(es, [QUERY_PREBUILT_RULE_ASSET]);
        await installPrebuiltRules(es, supertest);
      });

      const testFieldDoesNotAffectCustomizationState = async ({
        fieldName,
        value,
      }: {
        fieldName: string;
        value: unknown;
      }) => {
        const { body } = await securitySolutionApi
          .patchRule({
            body: { rule_id: PREBUILT_RULE_ID, [fieldName]: value },
          })
          .expect(200);

        expect(body.rule_source).toMatchObject({
          type: 'external',
          is_customized: false,
        });
      };

      it('actions field', async () => {
        // create connector/action
        const { body: hookAction } = await supertest
          .post('/api/actions/connector')
          .set('kbn-xsrf', 'true')
          .send(getWebHookAction())
          .expect(200);

        await testFieldDoesNotAffectCustomizationState({
          fieldName: 'actions',
          value: [
            {
              group: 'default',
              id: hookAction.id,
              action_type_id: hookAction.connector_type_id,
              params: {},
            },
          ],
        });
      });

      it('exceptions_list field', () =>
        testFieldDoesNotAffectCustomizationState({
          fieldName: 'exceptions_list',
          value: [
            {
              id: 'some_uuid',
              list_id: 'list_id_single',
              namespace_type: 'single',
              type: 'detection',
            },
          ],
        }));

      it('enabled field', () =>
        testFieldDoesNotAffectCustomizationState({
          fieldName: 'enabled',
          value: true,
        }));

      it('meta field', () =>
        testFieldDoesNotAffectCustomizationState({
          fieldName: 'meta',
          value: {
            severity_override_field: 'field',
          },
        }));
    });

    describe('cannot change non-customizable rule fields', () => {
      beforeEach(async () => {
        await createPrebuiltRuleAssetSavedObjects(es, [QUERY_PREBUILT_RULE_ASSET]);
        await installPrebuiltRules(es, supertest);
      });

      it('id field', async () => {
        await securitySolutionApi
          .patchRule({
            body: {
              rule_id: PREBUILT_RULE_ID,
              id: 'new-id',
            },
          })
          .expect(400);
      });

      it('author field', async () => {
        await securitySolutionApi
          .patchRule({
            body: {
              rule_id: PREBUILT_RULE_ID,
              author: ['new author'],
            },
          })
          .expect(400);
      });

      it('license field', async () => {
        await securitySolutionApi
          .patchRule({
            body: {
              rule_id: PREBUILT_RULE_ID,
              license: 'custom-license',
            },
          })
          .expect(400);
      });
    });

    describe('user can revert a customized prebuilt rule to its non-customized state', () => {
      beforeEach(async () => {
        await createPrebuiltRuleAssetSavedObjects(es, [QUERY_PREBUILT_RULE_ASSET]);
        await installPrebuiltRules(es, supertest);
      });

      afterEach(async () => {
        await deleteAllRules(supertest, log);
        await deleteAllPrebuiltRuleAssets(es, log);
      });

      it('using name field', async () => {
        // Modify the prebuilt rule
        const { body: customizedRuleBody } = await securitySolutionApi
          .patchRule({ body: { rule_id: PREBUILT_RULE_ID, name: 'new name' } })
          .expect(200);

        expect(customizedRuleBody.rule_source.is_customized).toEqual(true);
        expect(customizedRuleBody.rule_source.type).toEqual('external');

        // Change the name field back to the original value
        const { body: nonCustomizedRuleBody } = await securitySolutionApi
          .patchRule({ body: { rule_id: PREBUILT_RULE_ID, name: getPrebuiltRuleMock().name } })
          .expect(200);

        expect(nonCustomizedRuleBody.rule_source.is_customized).toEqual(false);
        expect(nonCustomizedRuleBody.rule_source.type).toEqual('external');
      });
    });
  });
};

const PREBUILT_RULE_ID = 'test-prebuilt-rule';
const QUERY_PREBUILT_RULE_ASSET = createRuleAssetSavedObject({
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
