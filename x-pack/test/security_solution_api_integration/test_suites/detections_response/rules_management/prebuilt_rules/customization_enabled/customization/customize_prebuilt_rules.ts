/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import expect from 'expect';
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

  const ruleAsset = createRuleAssetSavedObject({
    rule_id: 'rule_1',
  });

  describe('@ess @serverless @skipInServerlessMKI Customize prebuilt rules', () => {
    before(async () => {
      await deleteAllRules(supertest, log);
      await deleteAllPrebuiltRuleAssets(es, log);
    });

    describe('detecting rule customizations', () => {
      describe('common rule fields', () => {
        beforeEach(async () => {
          await createPrebuiltRuleAssetSavedObjects(es, [ruleAsset]);
          await installPrebuiltRules(es, supertest);
        });

        afterEach(async () => {
          await deleteAllRules(supertest, log);
          await deleteAllPrebuiltRuleAssets(es, log);
        });

        it('name field', async () => {
          const { body } = await securitySolutionApi
            .patchRule({ body: { rule_id: 'rule_1', name: 'some other name' } })
            .expect(200);

          expect(body.rule_source.is_customized).toEqual(true);
          expect(body.rule_source.type).toEqual('external');
        });

        it('description field', async () => {
          const { body } = await securitySolutionApi
            .patchRule({ body: { rule_id: 'rule_1', description: 'some other description' } })
            .expect(200);

          expect(body.rule_source.is_customized).toEqual(true);
          expect(body.rule_source.type).toEqual('external');
        });

        it('interval field', async () => {
          const { body } = await securitySolutionApi
            .patchRule({ body: { rule_id: 'rule_1', interval: '30m' } })
            .expect(200);

          expect(body.rule_source.is_customized).toEqual(true);
          expect(body.rule_source.type).toEqual('external');
        });

        it('from field', async () => {
          const { body } = await securitySolutionApi
            .patchRule({ body: { rule_id: 'rule_1', from: 'now-10m' } })
            .expect(200);

          expect(body.rule_source.is_customized).toEqual(true);
          expect(body.rule_source.type).toEqual('external');
        });

        it('to field', async () => {
          const { body } = await securitySolutionApi
            .patchRule({ body: { rule_id: 'rule_1', to: 'now-1m' } })
            .expect(200);

          expect(body.rule_source.is_customized).toEqual(true);
          expect(body.rule_source.type).toEqual('external');
        });

        it('note field', async () => {
          const { body } = await securitySolutionApi
            .patchRule({ body: { rule_id: 'rule_1', note: '# some note markdown' } })
            .expect(200);

          expect(body.rule_source.is_customized).toEqual(true);
          expect(body.rule_source.type).toEqual('external');
        });

        it('severity field', async () => {
          const { body } = await securitySolutionApi
            .patchRule({ body: { rule_id: 'rule_1', severity: 'medium' } })
            .expect(200);

          expect(body.rule_source.is_customized).toEqual(true);
          expect(body.rule_source.type).toEqual('external');
        });

        it('tags field', async () => {
          const { body } = await securitySolutionApi
            .patchRule({ body: { rule_id: 'rule_1', tags: ['red fish', 'blue fish'] } })
            .expect(200);

          expect(body.rule_source.is_customized).toEqual(true);
          expect(body.rule_source.type).toEqual('external');
        });

        it('severity_mapping field', async () => {
          const { body } = await securitySolutionApi
            .patchRule({
              body: {
                rule_id: 'rule_1',
                severity_mapping: [
                  {
                    field: 'event.severity',
                    operator: 'equals',
                    severity: 'low',
                    value: 'LOW',
                  },
                ],
              },
            })
            .expect(200);

          expect(body.rule_source.is_customized).toEqual(true);
          expect(body.rule_source.type).toEqual('external');
        });

        it('risk_score field', async () => {
          const { body } = await securitySolutionApi
            .patchRule({ body: { rule_id: 'rule_1', risk_score: 72 } })
            .expect(200);

          expect(body.rule_source.is_customized).toEqual(true);
          expect(body.rule_source.type).toEqual('external');
        });

        it('risk_score_mapping field', async () => {
          const { body } = await securitySolutionApi
            .patchRule({
              body: {
                rule_id: 'rule_1',
                risk_score_mapping: [{ field: 'event.risk_score', operator: 'equals', value: '' }],
              },
            })
            .expect(200);

          expect(body.rule_source.is_customized).toEqual(true);
          expect(body.rule_source.type).toEqual('external');
        });

        it('references field', async () => {
          const { body } = await securitySolutionApi
            .patchRule({ body: { rule_id: 'rule_1', references: ['http://test.test'] } })
            .expect(200);

          expect(body.rule_source.is_customized).toEqual(true);
          expect(body.rule_source.type).toEqual('external');
        });

        it('false_positives field', async () => {
          const { body } = await securitySolutionApi
            .patchRule({ body: { rule_id: 'rule_1', false_positives: ['false positive example'] } })
            .expect(200);

          expect(body.rule_source.is_customized).toEqual(true);
          expect(body.rule_source.type).toEqual('external');
        });

        it('threat field', async () => {
          const { body } = await securitySolutionApi
            .patchRule({
              body: {
                rule_id: 'rule_1',
                threat: [
                  {
                    framework: 'MITRE ATT&CK',
                    tactic: {
                      id: 'TA0000',
                      name: 'test tactic',
                      reference: 'https://attack.mitre.org/tactics/TA0000/',
                    },
                  },
                ],
              },
            })
            .expect(200);

          expect(body.rule_source.is_customized).toEqual(true);
          expect(body.rule_source.type).toEqual('external');
        });

        it('setup field', async () => {
          const { body } = await securitySolutionApi
            .patchRule({ body: { rule_id: 'rule_1', setup: '# some setup markdown' } })
            .expect(200);

          expect(body.rule_source.is_customized).toEqual(true);
          expect(body.rule_source.type).toEqual('external');
        });

        it('related_integrations field', async () => {
          const { body } = await securitySolutionApi
            .patchRule({
              body: {
                rule_id: 'rule_1',
                related_integrations: [{ package: 'package-a', version: '^1.2.3' }],
              },
            })
            .expect(200);

          expect(body.rule_source.is_customized).toEqual(true);
          expect(body.rule_source.type).toEqual('external');
        });

        it('required_fields field', async () => {
          const { body } = await securitySolutionApi
            .patchRule({
              body: {
                rule_id: 'rule_1',
                required_fields: [{ name: '@timestamp', type: 'date' }],
              },
            })
            .expect(200);

          expect(body.rule_source.is_customized).toEqual(true);
          expect(body.rule_source.type).toEqual('external');
        });

        it('max_signals field', async () => {
          const { body } = await securitySolutionApi
            .patchRule({
              body: {
                rule_id: 'rule_1',
                max_signals: 42,
              },
            })
            .expect(200);

          expect(body.rule_source.is_customized).toEqual(true);
          expect(body.rule_source.type).toEqual('external');
        });

        it('investigation_fields field', async () => {
          const { body } = await securitySolutionApi
            .patchRule({
              body: { rule_id: 'rule_1', investigation_fields: { field_names: ['blob', 'boop'] } },
            })
            .expect(200);

          expect(body.rule_source.is_customized).toEqual(true);
          expect(body.rule_source.type).toEqual('external');
        });

        it('rule_name_override field', async () => {
          const { body } = await securitySolutionApi
            .patchRule({
              body: { rule_id: 'rule_1', rule_name_override: 'override string' },
            })
            .expect(200);

          expect(body.rule_source.is_customized).toEqual(true);
          expect(body.rule_source.type).toEqual('external');
        });

        it('timestamp_override field', async () => {
          const { body } = await securitySolutionApi
            .patchRule({
              body: { rule_id: 'rule_1', timestamp_override: 'event.ingested' },
            })
            .expect(200);

          expect(body.rule_source.is_customized).toEqual(true);
          expect(body.rule_source.type).toEqual('external');
        });

        it('timeline_template fields', async () => {
          const { body } = await securitySolutionApi
            .patchRule({
              body: { rule_id: 'rule_1', timeline_id: '123', timeline_title: 'timeline title' },
            })
            .expect(200);

          expect(body.rule_source.is_customized).toEqual(true);
          expect(body.rule_source.type).toEqual('external');
        });

        it('building_block_type field', async () => {
          const { body } = await securitySolutionApi
            .patchRule({
              body: { rule_id: 'rule_1', building_block_type: 'building block string' },
            })
            .expect(200);

          expect(body.rule_source.is_customized).toEqual(true);
          expect(body.rule_source.type).toEqual('external');
        });
      });

      describe('query rule fields', () => {
        beforeEach(async () => {
          await createPrebuiltRuleAssetSavedObjects(es, [ruleAsset]);
          await installPrebuiltRules(es, supertest);
        });

        afterEach(async () => {
          await deleteAllRules(supertest, log);
          await deleteAllPrebuiltRuleAssets(es, log);
        });

        it('query field', async () => {
          const { body } = await securitySolutionApi
            .patchRule({
              body: { rule_id: 'rule_1', query: 'event.action: *' },
            })
            .expect(200);

          expect(body.rule_source.is_customized).toEqual(true);
          expect(body.rule_source.type).toEqual('external');
        });

        it('language field', async () => {
          const { body } = await securitySolutionApi
            .patchRule({
              body: { rule_id: 'rule_1', language: 'lucene' },
            })
            .expect(200);

          expect(body.rule_source.is_customized).toEqual(true);
          expect(body.rule_source.type).toEqual('external');
        });

        it('filters field', async () => {
          const { body } = await securitySolutionApi
            .patchRule({
              body: {
                rule_id: 'rule_1',
                filters: [
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
              },
            })
            .expect(200);

          expect(body.rule_source.is_customized).toEqual(true);
          expect(body.rule_source.type).toEqual('external');
        });

        it('index field', async () => {
          const { body } = await securitySolutionApi
            .patchRule({
              body: { rule_id: 'rule_1', index: ['new-index-pattern-*'] },
            })
            .expect(200);

          expect(body.rule_source.is_customized).toEqual(true);
          expect(body.rule_source.type).toEqual('external');
        });

        it('data_view_id field', async () => {
          const { body } = await securitySolutionApi
            .patchRule({
              body: { rule_id: 'rule_1', data_view_id: 'new-data-view', index: [] },
            })
            .expect(200);

          expect(body.rule_source.is_customized).toEqual(true);
          expect(body.rule_source.type).toEqual('external');
        });

        it('alert_suppression field', async () => {
          const { body } = await securitySolutionApi
            .patchRule({
              body: {
                rule_id: 'rule_1',
                alert_suppression: {
                  group_by: ['host.name'],
                  duration: { value: 5, unit: 'm' },
                  missing_fields_strategy: 'suppress',
                },
              },
            })
            .expect(200);

          expect(body.rule_source.is_customized).toEqual(true);
          expect(body.rule_source.type).toEqual('external');
        });
      });

      describe('eql rule type fields', () => {
        beforeEach(async () => {
          const eqlRuleAsset = createRuleAssetSavedObject({
            ...getPrebuiltRuleMockOfType('eql'),
            rule_id: 'rule_1',
          });

          await createPrebuiltRuleAssetSavedObjects(es, [eqlRuleAsset]);
          await installPrebuiltRules(es, supertest);
        });

        afterEach(async () => {
          await deleteAllRules(supertest, log);
          await deleteAllPrebuiltRuleAssets(es, log);
        });

        it('event_category_override field', async () => {
          const { body } = await securitySolutionApi
            .patchRule({
              body: {
                rule_id: 'rule_1',
                event_category_override: 'host.name',
              },
            })
            .expect(200);

          expect(body.rule_source.is_customized).toEqual(true);
          expect(body.rule_source.type).toEqual('external');
        });

        it('timestamp_field field', async () => {
          const { body } = await securitySolutionApi
            .patchRule({
              body: {
                rule_id: 'rule_1',
                timestamp_field: 'event.ingested',
              },
            })
            .expect(200);

          expect(body.rule_source.is_customized).toEqual(true);
          expect(body.rule_source.type).toEqual('external');
        });

        it('tiebreaker_field field', async () => {
          const { body } = await securitySolutionApi
            .patchRule({
              body: {
                rule_id: 'rule_1',
                tiebreaker_field: 'event.ingested',
              },
            })
            .expect(200);

          expect(body.rule_source.is_customized).toEqual(true);
          expect(body.rule_source.type).toEqual('external');
        });
      });

      describe('threat match rule type fields', () => {
        beforeEach(async () => {
          const threatMatchRuleAsset = createRuleAssetSavedObject({
            ...getPrebuiltRuleMockOfType('threat_match'),
            rule_id: 'rule_1',
          });

          await createPrebuiltRuleAssetSavedObjects(es, [threatMatchRuleAsset]);
          await installPrebuiltRules(es, supertest);
        });

        afterEach(async () => {
          await deleteAllRules(supertest, log);
          await deleteAllPrebuiltRuleAssets(es, log);
        });

        it('threat_index field', async () => {
          const { body } = await securitySolutionApi
            .patchRule({
              body: {
                rule_id: 'rule_1',
                type: 'threat_match',
                threat_index: ['blue fish', 'red fish'],
              },
            })
            .expect(200);

          expect(body.rule_source.is_customized).toEqual(true);
          expect(body.rule_source.type).toEqual('external');
        });

        it('threat_mapping field', async () => {
          const { body } = await securitySolutionApi
            .patchRule({
              body: {
                rule_id: 'rule_1',
                type: 'threat_match',
                threat_mapping: [
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
              },
            })
            .expect(200);

          expect(body.rule_source.is_customized).toEqual(true);
          expect(body.rule_source.type).toEqual('external');
        });

        it('threat_indicator_path field', async () => {
          const { body } = await securitySolutionApi
            .patchRule({
              body: {
                rule_id: 'rule_1',
                type: 'threat_match',
                threat_indicator_path: 'C:over/there.exe',
              },
            })
            .expect(200);

          expect(body.rule_source.is_customized).toEqual(true);
          expect(body.rule_source.type).toEqual('external');
        });

        it('threat_query field', async () => {
          const { body } = await securitySolutionApi
            .patchRule({
              body: {
                rule_id: 'rule_1',
                type: 'threat_match',
                threat_query: 'event.action: *',
              },
            })
            .expect(200);

          expect(body.rule_source.is_customized).toEqual(true);
          expect(body.rule_source.type).toEqual('external');
        });

        it('threat_language field', async () => {
          const { body } = await securitySolutionApi
            .patchRule({
              body: {
                rule_id: 'rule_1',
                type: 'threat_match',
                threat_language: 'lucene',
              },
            })
            .expect(200);

          expect(body.rule_source.is_customized).toEqual(true);
          expect(body.rule_source.type).toEqual('external');
        });

        it('threat_filters field', async () => {
          const { body } = await securitySolutionApi
            .patchRule({
              body: {
                rule_id: 'rule_1',
                type: 'threat_match',
                threat_filters: [
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
              },
            })
            .expect(200);

          expect(body.rule_source.is_customized).toEqual(true);
          expect(body.rule_source.type).toEqual('external');
        });
      });

      describe('threshold rule type fields', () => {
        beforeEach(async () => {
          const thresholdRuleAsset = createRuleAssetSavedObject({
            ...getPrebuiltRuleMockOfType('threshold'),
            rule_id: 'rule_1',
          });

          await createPrebuiltRuleAssetSavedObjects(es, [thresholdRuleAsset]);
          await installPrebuiltRules(es, supertest);
        });

        afterEach(async () => {
          await deleteAllRules(supertest, log);
          await deleteAllPrebuiltRuleAssets(es, log);
        });

        it('threshold field', async () => {
          const { body } = await securitySolutionApi
            .patchRule({
              body: {
                rule_id: 'rule_1',
                type: 'threshold',
                threshold: {
                  field: ['Responses.process.pid'],
                  value: 100,
                  cardinality: [{ field: 'host.id', value: 2 }],
                },
              },
            })
            .expect(200);

          expect(body.rule_source.is_customized).toEqual(true);
          expect(body.rule_source.type).toEqual('external');
        });
      });

      describe('machine learning rule type fields', () => {
        beforeEach(async () => {
          const machineLearningRuleAsset = createRuleAssetSavedObject({
            ...getPrebuiltRuleMockOfType('machine_learning'),
            rule_id: 'rule_1',
          });

          await createPrebuiltRuleAssetSavedObjects(es, [machineLearningRuleAsset]);
          await installPrebuiltRules(es, supertest);
        });

        afterEach(async () => {
          await deleteAllRules(supertest, log);
          await deleteAllPrebuiltRuleAssets(es, log);
        });

        it('machine_learning_job_id field', async () => {
          const { body } = await securitySolutionApi
            .patchRule({
              body: {
                rule_id: 'rule_1',
                type: 'machine_learning',
                machine_learning_job_id: '123',
              },
            })
            .expect(200);

          expect(body.rule_source.is_customized).toEqual(true);
          expect(body.rule_source.type).toEqual('external');
        });

        it('anomaly_threshold field', async () => {
          const { body } = await securitySolutionApi
            .patchRule({
              body: {
                rule_id: 'rule_1',
                type: 'machine_learning',
                anomaly_threshold: 20,
              },
            })
            .expect(200);

          expect(body.rule_source.is_customized).toEqual(true);
          expect(body.rule_source.type).toEqual('external');
        });
      });

      describe('new terms rule type fields', () => {
        beforeEach(async () => {
          const newTermsRuleAsset = createRuleAssetSavedObject({
            ...getPrebuiltRuleMockOfType('new_terms'),
            rule_id: 'rule_1',
          });

          await createPrebuiltRuleAssetSavedObjects(es, [newTermsRuleAsset]);
          await installPrebuiltRules(es, supertest);
        });

        afterEach(async () => {
          await deleteAllRules(supertest, log);
          await deleteAllPrebuiltRuleAssets(es, log);
        });

        it('new_terms_fields field', async () => {
          const { body } = await securitySolutionApi
            .patchRule({
              body: {
                rule_id: 'rule_1',
                type: 'new_terms',
                new_terms_fields: ['event.action'],
              },
            })
            .expect(200);

          expect(body.rule_source.is_customized).toEqual(true);
          expect(body.rule_source.type).toEqual('external');
        });

        it('history_window_start field', async () => {
          const { body } = await securitySolutionApi
            .patchRule({
              body: {
                rule_id: 'rule_1',
                type: 'new_terms',
                history_window_start: 'now-7d',
              },
            })
            .expect(200);

          expect(body.rule_source.is_customized).toEqual(true);
          expect(body.rule_source.type).toEqual('external');
        });
      });
    });

    describe('is_customized calculation is not affected by', () => {
      beforeEach(async () => {
        await createPrebuiltRuleAssetSavedObjects(es, [ruleAsset]);
        await installPrebuiltRules(es, supertest);
      });

      afterEach(async () => {
        await deleteAllRules(supertest, log);
        await deleteAllPrebuiltRuleAssets(es, log);
      });

      it('actions field', async () => {
        // create connector/action
        const { body: hookAction } = await supertest
          .post('/api/actions/connector')
          .set('kbn-xsrf', 'true')
          .send(getWebHookAction())
          .expect(200);

        const { body } = await securitySolutionApi
          .patchRule({
            body: {
              rule_id: 'rule_1',
              actions: [
                {
                  group: 'default',
                  id: hookAction.id,
                  action_type_id: hookAction.connector_type_id,
                  params: {},
                },
              ],
            },
          })
          .expect(200);

        expect(body.rule_source.is_customized).toEqual(false);
        expect(body.rule_source.type).toEqual('external');
      });

      it('exceptions_list field', async () => {
        const { body } = await securitySolutionApi
          .patchRule({
            body: {
              rule_id: 'rule_1',
              exceptions_list: [
                {
                  id: 'some_uuid',
                  list_id: 'list_id_single',
                  namespace_type: 'single',
                  type: 'detection',
                },
              ],
            },
          })
          .expect(200);

        expect(body.rule_source.is_customized).toEqual(false);
        expect(body.rule_source.type).toEqual('external');
      });

      it('enabled field', async () => {
        const { body } = await securitySolutionApi
          .patchRule({
            body: {
              rule_id: 'rule_1',
              enabled: true,
            },
          })
          .expect(200);

        expect(body.rule_source.is_customized).toEqual(false);
        expect(body.rule_source.type).toEqual('external');
      });

      it('meta field', async () => {
        const { body } = await securitySolutionApi
          .patchRule({
            body: {
              rule_id: 'rule_1',
              meta: {
                severity_override_field: 'field',
              },
            },
          })
          .expect(200);

        expect(body.rule_source.is_customized).toEqual(false);
        expect(body.rule_source.type).toEqual('external');
      });
    });

    describe('cannot change non-customizable rule fields', () => {
      beforeEach(async () => {
        await createPrebuiltRuleAssetSavedObjects(es, [ruleAsset]);
        await installPrebuiltRules(es, supertest);
      });

      afterEach(async () => {
        await deleteAllRules(supertest, log);
        await deleteAllPrebuiltRuleAssets(es, log);
      });

      it('id field', async () => {
        await securitySolutionApi
          .patchRule({
            body: {
              rule_id: 'rule_1',
              id: 'new-id',
            },
          })
          .expect(400);
      });

      it('author field', async () => {
        await securitySolutionApi
          .patchRule({
            body: {
              rule_id: 'rule_1',
              author: ['new author'],
            },
          })
          .expect(400);
      });

      it('license field', async () => {
        await securitySolutionApi
          .patchRule({
            body: {
              rule_id: 'rule_1',
              license: 'custom-license',
            },
          })
          .expect(400);
      });
    });

    describe('user can revert a customized prebuilt rule to its non-customized state', () => {
      beforeEach(async () => {
        await createPrebuiltRuleAssetSavedObjects(es, [ruleAsset]);
        await installPrebuiltRules(es, supertest);
      });

      afterEach(async () => {
        await deleteAllRules(supertest, log);
        await deleteAllPrebuiltRuleAssets(es, log);
      });

      it('using name field', async () => {
        // Modify the prebuilt rule
        const { body: customizedRuleBody } = await securitySolutionApi
          .patchRule({ body: { rule_id: 'rule_1', name: 'new name' } })
          .expect(200);

        expect(customizedRuleBody.rule_source.is_customized).toEqual(true);
        expect(customizedRuleBody.rule_source.type).toEqual('external');

        // Change the name field back to the original value
        const { body: nonCustomizedRuleBody } = await securitySolutionApi
          .patchRule({ body: { rule_id: 'rule_1', name: getPrebuiltRuleMock().name } })
          .expect(200);

        expect(nonCustomizedRuleBody.rule_source.is_customized).toEqual(false);
        expect(nonCustomizedRuleBody.rule_source.type).toEqual('external');
      });
    });
  });
};
