/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable @typescript-eslint/naming-convention */

import expect from 'expect';
import type { CreateExceptionListItemSchema } from '@kbn/securitysolution-io-ts-list-types';
import { LIST_URL } from '@kbn/securitysolution-list-constants';
import type {
  RuleCreateProps,
  EqlRuleCreateProps,
  QueryRuleCreateProps,
  ThreatMatchRuleCreateProps,
  ThresholdRuleCreateProps,
} from '@kbn/security-solution-plugin/common/api/detection_engine';
import { getCreateExceptionListItemMinimalSchemaMock } from '@kbn/lists-plugin/common/schemas/request/create_exception_list_item_schema.mock';
import { getCreateExceptionListMinimalSchemaMock } from '@kbn/lists-plugin/common/schemas/request/create_exception_list_schema.mock';

import { EsArchivePathBuilder } from '../../../../../../es_archive_path_builder';
import {
  getSimpleRule,
  createExceptionList,
  createExceptionListItem,
  getThresholdRuleForAlertTesting,
  getOpenAlerts,
  createRuleWithExceptionEntries,
  getEqlRuleForAlertTesting,
} from '../../../../utils';
import {
  createAlertsIndex,
  createRule,
  deleteAllRules,
  waitForRuleSuccess,
  waitForAlertsToBePresent,
  getAlertsByIds,
  deleteAllAlerts,
} from '../../../../../../../common/utils/security_solution';
import {
  createListsIndex,
  deleteAllExceptions,
  deleteListsIndex,
  importFile,
} from '../../../../../lists_and_exception_lists/utils';
import { FtrProviderContext } from '../../../../../../ftr_provider_context';

export default ({ getService }: FtrProviderContext) => {
  const supertest = getService('supertest');
  const esArchiver = getService('esArchiver');
  const log = getService('log');
  const es = getService('es');
  // TODO: add a new service for loading archiver files similar to "getService('es')"
  const config = getService('config');
  const isServerless = config.get('serverless');
  const dataPathBuilder = new EsArchivePathBuilder(isServerless);
  const path = dataPathBuilder.getPath('auditbeat/hosts');

  describe('@serverless @serverlessQA @ess rule exceptions execution', () => {
    before(async () => {
      await esArchiver.load(path);
    });

    after(async () => {
      await esArchiver.unload(path);
    });

    describe('creating rules with exceptions', () => {
      beforeEach(async () => {
        await createAlertsIndex(supertest, log);
      });

      afterEach(async () => {
        await deleteAllAlerts(supertest, log, es);
        await deleteAllRules(supertest, log);
        await deleteAllExceptions(supertest, log);
      });

      it('should be able to execute against an exception list that does not include valid entries and get back 10 alerts', async () => {
        const { id, list_id, namespace_type, type } = await createExceptionList(
          supertest,
          log,
          getCreateExceptionListMinimalSchemaMock()
        );

        const exceptionListItem: CreateExceptionListItemSchema = {
          ...getCreateExceptionListItemMinimalSchemaMock(),
          entries: [
            {
              field: 'some.none.existent.field', // non-existent field where we should not exclude anything
              operator: 'included',
              type: 'match',
              value: 'some value',
            },
          ],
        };
        await createExceptionListItem(supertest, log, exceptionListItem);

        const ruleWithException: RuleCreateProps = {
          name: 'Simple Rule Query',
          description: 'Simple Rule Query',
          enabled: true,
          risk_score: 1,
          rule_id: 'rule-1',
          severity: 'high',
          index: ['auditbeat-*'],
          type: 'query',
          from: '1900-01-01T00:00:00.000Z',
          query: 'host.name: "suricata-sensor-amsterdam"',
          exceptions_list: [
            {
              id,
              list_id,
              namespace_type,
              type,
            },
          ],
        };
        const { id: createdId } = await createRule(supertest, log, ruleWithException);
        await waitForRuleSuccess({ supertest, log, id: createdId });
        await waitForAlertsToBePresent(supertest, log, 10, [createdId]);
        const alertsOpen = await getAlertsByIds(supertest, log, [createdId]);
        expect(alertsOpen.hits.hits.length).toEqual(10);
      });

      it('should be able to execute against an exception list that does include valid entries and get back 0 alerts', async () => {
        const rule: QueryRuleCreateProps = {
          name: 'Simple Rule Query',
          description: 'Simple Rule Query',
          enabled: true,
          risk_score: 1,
          rule_id: 'rule-1',
          severity: 'high',
          index: ['auditbeat-*'],
          type: 'query',
          from: '1900-01-01T00:00:00.000Z',
          query: 'host.name: "suricata-sensor-amsterdam"',
        };
        const createdRule = await createRuleWithExceptionEntries(supertest, log, rule, [
          [
            {
              field: 'host.name', // This matches the query above which will exclude everything
              operator: 'included',
              type: 'match',
              value: 'suricata-sensor-amsterdam',
            },
          ],
        ]);
        const alertsOpen = await getAlertsByIds(supertest, log, [createdRule.id]);
        expect(alertsOpen.hits.hits.length).toEqual(0);
      });

      it('should be able to execute against an exception list that does include valid case sensitive entries and get back 0 alerts', async () => {
        const rule: QueryRuleCreateProps = {
          name: 'Simple Rule Query',
          description: 'Simple Rule Query',
          enabled: true,
          risk_score: 1,
          rule_id: 'rule-1',
          severity: 'high',
          index: ['auditbeat-*'],
          type: 'query',
          from: '1900-01-01T00:00:00.000Z',
          query: 'host.name: "suricata-sensor-amsterdam"',
        };
        const rule2: QueryRuleCreateProps = {
          name: 'Simple Rule Query',
          description: 'Simple Rule Query',
          enabled: true,
          risk_score: 1,
          rule_id: 'rule-2',
          severity: 'high',
          index: ['auditbeat-*'],
          type: 'query',
          from: '1900-01-01T00:00:00.000Z',
          query: 'host.name: "suricata-sensor-amsterdam"',
        };
        const createdRule = await createRuleWithExceptionEntries(supertest, log, rule, [
          [
            {
              field: 'host.os.name',
              operator: 'included',
              type: 'match_any',
              value: ['ubuntu'],
            },
          ],
        ]);
        const createdRule2 = await createRuleWithExceptionEntries(supertest, log, rule2, [
          [
            {
              field: 'host.os.name', // This matches the query above which will exclude everything
              operator: 'included',
              type: 'match_any',
              value: ['ubuntu', 'Ubuntu'],
            },
          ],
        ]);
        const alertsOpen = await getOpenAlerts(supertest, log, es, createdRule);
        const alertsOpen2 = await getOpenAlerts(supertest, log, es, createdRule2);
        // Expect alerts here because all values are "Ubuntu"
        // and exception is one of ["ubuntu"]
        expect(alertsOpen.hits.hits.length).toEqual(10);
        // Expect no alerts here because all values are "Ubuntu"
        // and exception is one of ["ubuntu", "Ubuntu"]
        expect(alertsOpen2.hits.hits.length).toEqual(0);
      });

      it('generates no alerts when an exception is added for an EQL rule', async () => {
        const rule: EqlRuleCreateProps = {
          ...getEqlRuleForAlertTesting(['auditbeat-*']),
          query: 'configuration where agent.id=="a1d7b39c-f898-4dbe-a761-efb61939302d"',
        };
        const createdRule = await createRuleWithExceptionEntries(supertest, log, rule, [
          [
            {
              field: 'host.id',
              operator: 'included',
              type: 'match',
              value: '8cc95778cce5407c809480e8e32ad76b',
            },
          ],
        ]);
        const alertsOpen = await getOpenAlerts(supertest, log, es, createdRule);
        expect(alertsOpen.hits.hits.length).toEqual(0);
      });

      it('generates no alerts when an exception is added for a threshold rule', async () => {
        const rule: ThresholdRuleCreateProps = {
          ...getThresholdRuleForAlertTesting(['auditbeat-*']),
          threshold: {
            field: 'host.id',
            value: 700,
          },
        };
        const createdRule = await createRuleWithExceptionEntries(supertest, log, rule, [
          [
            {
              field: 'host.id',
              operator: 'included',
              type: 'match',
              value: '8cc95778cce5407c809480e8e32ad76b',
            },
          ],
        ]);
        const alertsOpen = await getOpenAlerts(supertest, log, es, createdRule);
        expect(alertsOpen.hits.hits.length).toEqual(0);
      });

      it('generates no alerts when an exception is added for a threat match rule', async () => {
        const rule: ThreatMatchRuleCreateProps = {
          description: 'Detecting root and admin users',
          name: 'Query with a rule id',
          severity: 'high',
          index: ['auditbeat-*'],
          type: 'threat_match',
          risk_score: 55,
          language: 'kuery',
          rule_id: 'rule-1',
          from: '1900-01-01T00:00:00.000Z',
          query: '*:*',
          threat_query: 'source.ip: "188.166.120.93"', // narrow things down with a query to a specific source ip
          threat_index: ['auditbeat-*'], // We use auditbeat as both the matching index and the threat list for simplicity
          threat_mapping: [
            // We match host.name against host.name
            {
              entries: [
                {
                  field: 'host.name',
                  value: 'host.name',
                  type: 'mapping',
                },
              ],
            },
          ],
          threat_filters: [],
        };

        const createdRule = await createRuleWithExceptionEntries(supertest, log, rule, [
          [
            {
              field: 'source.ip',
              operator: 'included',
              type: 'match',
              value: '188.166.120.93',
            },
          ],
        ]);
        const alertsOpen = await getOpenAlerts(supertest, log, es, createdRule);
        expect(alertsOpen.hits.hits.length).toEqual(0);
      });
      describe('rules with value list exceptions', () => {
        beforeEach(async () => {
          await createListsIndex(supertest, log);
        });

        afterEach(async () => {
          await deleteListsIndex(supertest, log);
        });

        it('generates no alerts when a value list exception is added for a query rule', async () => {
          const valueListId = 'value-list-id.txt';
          await importFile(supertest, log, 'keyword', ['suricata-sensor-amsterdam'], valueListId);
          const rule: QueryRuleCreateProps = {
            name: 'Simple Rule Query',
            description: 'Simple Rule Query',
            enabled: true,
            risk_score: 1,
            rule_id: 'rule-1',
            severity: 'high',
            index: ['auditbeat-*'],
            type: 'query',
            from: '1900-01-01T00:00:00.000Z',
            query: 'host.name: "suricata-sensor-amsterdam"',
          };
          const createdRule = await createRuleWithExceptionEntries(supertest, log, rule, [
            [
              {
                field: 'host.name',
                operator: 'included',
                type: 'list',
                list: {
                  id: valueListId,
                  type: 'keyword',
                },
              },
            ],
          ]);
          const alertsOpen = await getOpenAlerts(supertest, log, es, createdRule);
          expect(alertsOpen.hits.hits.length).toEqual(0);
        });

        it('generates no alerts when a value list exception is added for a threat match rule', async () => {
          const valueListId = 'value-list-id.txt';
          await importFile(supertest, log, 'keyword', ['zeek-sensor-amsterdam'], valueListId);
          const rule: ThreatMatchRuleCreateProps = {
            description: 'Detecting root and admin users',
            name: 'Query with a rule id',
            severity: 'high',
            index: ['auditbeat-*'],
            type: 'threat_match',
            risk_score: 55,
            language: 'kuery',
            rule_id: 'rule-1',
            from: '1900-01-01T00:00:00.000Z',
            query: '*:*',
            threat_query: 'source.ip: "188.166.120.93"', // narrow things down with a query to a specific source ip
            threat_index: ['auditbeat-*'], // We use auditbeat as both the matching index and the threat list for simplicity
            threat_mapping: [
              // We match host.name against host.name
              {
                entries: [
                  {
                    field: 'host.name',
                    value: 'host.name',
                    type: 'mapping',
                  },
                ],
              },
            ],
            threat_filters: [],
          };

          const createdRule = await createRuleWithExceptionEntries(supertest, log, rule, [
            [
              {
                field: 'host.name',
                operator: 'included',
                type: 'list',
                list: {
                  id: valueListId,
                  type: 'keyword',
                },
              },
            ],
          ]);
          const alertsOpen = await getOpenAlerts(supertest, log, es, createdRule);
          expect(alertsOpen.hits.hits.length).toEqual(0);
        });

        it('generates no alerts when a value list exception is added for a threshold rule', async () => {
          const valueListId = 'value-list-id.txt';
          await importFile(supertest, log, 'keyword', ['zeek-sensor-amsterdam'], valueListId);
          const rule: ThresholdRuleCreateProps = {
            description: 'Detecting root and admin users',
            name: 'Query with a rule id',
            severity: 'high',
            index: ['auditbeat-*'],
            type: 'threshold',
            risk_score: 55,
            language: 'kuery',
            rule_id: 'rule-1',
            from: '1900-01-01T00:00:00.000Z',
            query: 'host.name: "zeek-sensor-amsterdam"',
            threshold: {
              field: 'host.name',
              value: 1,
            },
          };

          const createdRule = await createRuleWithExceptionEntries(supertest, log, rule, [
            [
              {
                field: 'host.name',
                operator: 'included',
                type: 'list',
                list: {
                  id: valueListId,
                  type: 'keyword',
                },
              },
            ],
          ]);
          const alertsOpen = await getOpenAlerts(supertest, log, es, createdRule);
          expect(alertsOpen.hits.hits.length).toEqual(0);
        });

        it('generates no alerts when a value list exception is added for an EQL rule', async () => {
          const valueListId = 'value-list-id.txt';
          await importFile(supertest, log, 'keyword', ['zeek-sensor-amsterdam'], valueListId);
          const rule: EqlRuleCreateProps = {
            ...getEqlRuleForAlertTesting(['auditbeat-*']),
            query: 'configuration where host.name=="zeek-sensor-amsterdam"',
          };

          const createdRule = await createRuleWithExceptionEntries(supertest, log, rule, [
            [
              {
                field: 'host.name',
                operator: 'included',
                type: 'list',
                list: {
                  id: valueListId,
                  type: 'keyword',
                },
              },
            ],
          ]);
          const alertsOpen = await getOpenAlerts(supertest, log, es, createdRule);
          expect(alertsOpen.hits.hits.length).toEqual(0);
        });
        it('should Not allow deleting value list when there are references and ignoreReferences is false', async () => {
          const valueListId = 'value-list-id.txt';
          await importFile(supertest, log, 'keyword', ['suricata-sensor-amsterdam'], valueListId);
          const rule: QueryRuleCreateProps = {
            ...getSimpleRule(),
            query: 'host.name: "suricata-sensor-amsterdam"',
          };
          await createRuleWithExceptionEntries(supertest, log, rule, [
            [
              {
                field: 'host.name',
                operator: 'included',
                type: 'list',
                list: {
                  id: valueListId,
                  type: 'keyword',
                },
              },
            ],
          ]);

          const deleteReferences = false;
          const ignoreReferences = false;

          // Delete the value list
          await supertest
            .delete(
              `${LIST_URL}?deleteReferences=${deleteReferences}&id=${valueListId}&ignoreReferences=${ignoreReferences}`
            )
            .set('kbn-xsrf', 'true')
            .send()
            .expect(409);
        });
      });
    });
  });
};
