/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from 'expect';
import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import type { RawRule, RawRuleAction } from '@kbn/alerting-plugin/server/types';
import { FILEBEAT_7X_INDICATOR_PATH } from '@kbn/alerting-plugin/server/saved_objects/migrations';
import type { SavedObjectReference } from '@kbn/core/server';
import { ALERTING_CASES_SAVED_OBJECT_INDEX } from '@kbn/core-saved-objects-server';
import { getUrlPrefix } from '../../../../common/lib';
import { FtrProviderContext } from '../../../../common/ftr_provider_context';

// eslint-disable-next-line import/no-default-export
export default function createGetTests({ getService }: FtrProviderContext) {
  const es = getService('es');
  const supertest = getService('supertest');
  const esArchiver = getService('esArchiver');

  describe('migrations', () => {
    before(async () => {
      await esArchiver.load('x-pack/test/functional/es_archives/alerts');
    });

    after(async () => {
      await esArchiver.unload('x-pack/test/functional/es_archives/alerts');
    });

    it('7.10.0 migrates the `alerting` consumer to be the `alerts`', async () => {
      const response = await supertest.get(
        `${getUrlPrefix(``)}/api/alerting/rule/74f3e6d7-b7bb-477d-ac28-92ee22728e6e`
      );

      expect(response.status).toBe(200);
      expect(response.body.consumer).toEqual('alerts');
    });

    it('7.10.0 migrates the `metrics` consumer to be the `infrastructure`', async () => {
      const response = await supertest.get(
        `${getUrlPrefix(``)}/api/alerting/rule/74f3e6d7-b7bb-477d-ac28-fdf248d5f2a4`
      );

      expect(response.status).toEqual(200);
      expect(response.body.consumer).toEqual('infrastructure');
    });

    it('7.10.0 migrates PagerDuty actions to have a default dedupKey', async () => {
      const response = await supertest.get(
        `${getUrlPrefix(``)}/api/alerting/rule/b6087f72-994f-46fb-8120-c6e5c50d0f8f`
      );

      expect(response.status).toEqual(200);

      expect(response.body.actions).toEqual([
        expect.objectContaining({
          connector_type_id: '.pagerduty',
          id: 'a6a8ab7a-35cf-445e-ade3-215a029c2ee3',
          group: 'default',
          params: {
            component: '',
            eventAction: 'trigger',
            summary: 'fired {{alertInstanceId}}',
          },
        }),
        expect.objectContaining({
          connector_type_id: '.pagerduty',
          id: 'a6a8ab7a-35cf-445e-ade3-215a029c2ee3',
          group: 'default',
          params: {
            component: '',
            dedupKey: '{{alertId}}',
            eventAction: 'resolve',
            summary: 'fired {{alertInstanceId}}',
          },
        }),
        expect.objectContaining({
          connector_type_id: '.pagerduty',
          id: 'a6a8ab7a-35cf-445e-ade3-215a029c2ee3',
          group: 'default',
          params: {
            component: '',
            dedupKey: '{{alertInstanceId}}',
            eventAction: 'resolve',
            summary: 'fired {{alertInstanceId}}',
          },
        }),
      ]);
    });

    it('7.11.0 migrates alerts to contain `updatedAt` field', async () => {
      const response = await supertest.get(
        `${getUrlPrefix(``)}/api/alerting/rule/74f3e6d7-b7bb-477d-ac28-92ee22728e6e`
      );

      expect(response.status).toEqual(200);
      expect(response.body.updated_at).toEqual('2020-06-17T15:35:39.839Z');
    });

    it('7.11.0 migrates alerts to contain `notifyWhen` field', async () => {
      const response = await supertest.get(
        `${getUrlPrefix(``)}/api/alerting/rule/74f3e6d7-b7bb-477d-ac28-92ee22728e6e`
      );

      expect(response.status).toEqual(200);
      expect(response.body.notify_when).toEqual('onActiveAlert');
    });

    it('7.11.2 migrates alerts with case actions, case fields are nested in an incident object', async () => {
      const response = await supertest.get(
        `${getUrlPrefix(``)}/api/alerting/rule/99f3e6d7-b7bb-477d-ac28-92ee22726969`
      );

      expect(response.status).toEqual(200);
      expect(response.body.actions).toEqual([
        expect.objectContaining({
          id: '66a8ab7a-35cf-445e-ade3-215a029c6969',
          connector_type_id: '.servicenow',
          group: 'threshold met',
          params: {
            subAction: 'pushToService',
            subActionParams: {
              incident: {
                severity: '2',
                impact: '2',
                urgency: '2',
                short_description: 'SN short desc',
                description: 'SN desc',
              },
              comments: [{ commentId: '1', comment: 'sn comment' }],
            },
          },
        }),
        expect.objectContaining({
          id: '66a8ab7a-35cf-445e-ade3-215a029c6969',
          connector_type_id: '.jira',
          group: 'threshold met',
          params: {
            subAction: 'pushToService',
            subActionParams: {
              incident: {
                summary: 'Jira summary',
                issueType: '10001',
                description: 'Jira description',
                priority: 'Highest',
                parent: 'CASES-78',
                labels: ['test'],
              },
              comments: [
                {
                  commentId: '1',
                  comment: 'jira comment',
                },
              ],
            },
          },
        }),
        expect.objectContaining({
          id: '66a8ab7a-35cf-445e-ade3-215a029c6969',
          connector_type_id: '.resilient',
          group: 'threshold met',
          params: {
            subAction: 'pushToService',
            subActionParams: {
              incident: {
                incidentTypes: ['17', '21'],
                severityCode: '5',
                name: 'IBM name',
                description: 'IBM description',
              },
              comments: [
                {
                  commentId: 'alert-comment',
                  comment: 'IBM comment',
                },
              ],
            },
          },
        }),
      ]);
    });

    it('7.15.0 migrates security_solution alerts with exceptionLists to be saved object references', async () => {
      // NOTE: We have to use elasticsearch directly against the ".kibana" index because alerts do not expose the references which we want to test exists
      const response = await es.get<{ references: [{}] }>(
        {
          index: ALERTING_CASES_SAVED_OBJECT_INDEX,
          id: 'alert:38482620-ef1b-11eb-ad71-7de7959be71c',
        },
        { meta: true }
      );
      expect(response.statusCode).toEqual(200);
      expect(response.body._source?.references).toEqual([
        {
          name: 'param:exceptionsList_0',
          id: 'endpoint_list',
          type: 'exception-list-agnostic',
        },
        {
          name: 'param:exceptionsList_1',
          id: '50e3bd70-ef1b-11eb-ad71-7de7959be71c',
          type: 'exception-list',
        },
      ]);
    });

    it('7.16.0 migrates existing alerts to contain legacyId field', async () => {
      const searchResult = await es.search<RawRule>(
        {
          index: ALERTING_CASES_SAVED_OBJECT_INDEX,
          body: {
            query: {
              term: {
                _id: 'alert:74f3e6d7-b7bb-477d-ac28-92ee22728e6e',
              },
            },
          },
        },
        { meta: true }
      );
      expect(searchResult.statusCode).toEqual(200);
      expect((searchResult.body.hits.total as estypes.SearchTotalHits).value).toEqual(1);
      const hit = searchResult.body.hits.hits[0];
      expect((hit!._source!.alert! as RawRule).legacyId).toEqual(
        '74f3e6d7-b7bb-477d-ac28-92ee22728e6e'
      );
    });

    it('7.16.0 migrates existing rules so predefined connectors are not stored in references', async () => {
      const searchResult = await es.search<RawRule>(
        {
          index: ALERTING_CASES_SAVED_OBJECT_INDEX,
          body: {
            query: {
              term: {
                _id: 'alert:9c003b00-00ee-11ec-b067-2524946ba327',
              },
            },
          },
        },
        { meta: true }
      );
      expect(searchResult.statusCode).toEqual(200);
      expect((searchResult.body.hits.total as estypes.SearchTotalHits).value).toEqual(1);
      const hit = searchResult.body.hits.hits[0];
      expect((hit!._source!.alert! as RawRule).actions! as RawRuleAction[]).toEqual([
        expect.objectContaining({
          actionRef: 'action_0',
          actionTypeId: 'test.noop',
          group: 'default',
          params: {},
        }),
        expect.objectContaining({
          actionRef: 'preconfigured:my-slack1',
          actionTypeId: '.slack',
          group: 'default',
          params: {
            message: 'something happened!',
          },
        }),
      ]);
      expect(hit!._source!.references!).toEqual([
        expect.objectContaining({
          id: '66a8ab7a-35cf-445e-ade3-215a029c6969',
          name: 'action_0',
          type: 'action',
        }),
      ]);
    });

    it('7.16.0 migrates security_solution (Legacy) siem.notifications with "ruleAlertId" to be saved object references', async () => {
      // NOTE: We hae to use elastic search directly against the ".kibana" index because alerts do not expose the references which we want to test exists
      const response = await es.get<{ references: [{}] }>(
        {
          index: ALERTING_CASES_SAVED_OBJECT_INDEX,
          id: 'alert:d7a8c6a1-9394-48df-a634-d5457c35d747',
        },
        { meta: true }
      );
      expect(response.statusCode).toEqual(200);
      expect(response.body._source?.references).toEqual([
        {
          name: 'param:alert_0',
          id: '1a4ed6ae-3c89-44b2-999d-db554144504c',
          type: 'alert',
        },
      ]);
    });

    it('8.0 migrates security_solution (Legacy) threat match rules to add default threatIndicatorPath value if missing', async () => {
      const response = await es.get<{
        alert: {
          params: {
            threatIndicatorPath: string;
          };
        };
      }>(
        {
          index: ALERTING_CASES_SAVED_OBJECT_INDEX,
          id: 'alert:ece1ece2-9394-48df-a634-d5457c351ece',
        },
        { meta: true }
      );
      expect(response.statusCode).toEqual(200);
      expect(response.body._source?.alert?.params?.threatIndicatorPath).toEqual(
        FILEBEAT_7X_INDICATOR_PATH
      );
    });

    it('8.0 does not migrate security_solution (Legacy) threat match rules if threatIndicatorPath value is present', async () => {
      const response = await es.get<{
        alert: {
          params: {
            threatIndicatorPath: string;
          };
        };
      }>(
        {
          index: ALERTING_CASES_SAVED_OBJECT_INDEX,
          id: 'alert:fce1ece2-9394-48df-a634-d5457c351fce',
        },
        { meta: true }
      );
      expect(response.statusCode).toEqual(200);
      expect(response.body._source?.alert?.params?.threatIndicatorPath).toEqual(
        'custom.indicator.path'
      );
    });

    it('8.0 does not migrate security_solution (Legacy) rules other than threat_match rules if threatIndicatorPath value is missing', async () => {
      const response = await es.get<{
        alert: {
          params: {
            threatIndicatorPath: string;
          };
        };
      }>(
        {
          index: ALERTING_CASES_SAVED_OBJECT_INDEX,
          id: 'alert:1ce1ece2-9394-48df-a634-d5457c3511ce',
        },
        { meta: true }
      );
      expect(response.statusCode).toEqual(200);
      expect(response.body._source?.alert?.params?.threatIndicatorPath).not.toEqual(
        FILEBEAT_7X_INDICATOR_PATH
      );
    });

    it('8.0 migrates incorrect action group spellings on the Metrics Inventory Threshold rule type', async () => {
      const response = await es.get<{ alert: RawRule }>(
        {
          index: ALERTING_CASES_SAVED_OBJECT_INDEX,
          id: 'alert:92237b30-4e03-11ec-9ab9-d980518a2d28',
        },
        { meta: true }
      );
      expect(response.statusCode).toEqual(200);
      expect(response.body._source?.alert?.actions?.[0].group).toBe(
        'metrics.inventory_threshold.fired'
      );
    });

    it('8.0 migrates and disables pre-existing rules', async () => {
      const response = await es.get<{ alert: RawRule }>(
        {
          index: ALERTING_CASES_SAVED_OBJECT_INDEX,
          id: 'alert:38482620-ef1b-11eb-ad71-7de7959be71c',
        },
        { meta: true }
      );
      expect(response.statusCode).toEqual(200);
      expect(response.body._source?.alert?.alertTypeId).toBe('siem.queryRule');
      expect(response.body._source?.alert?.enabled).toBe(false);
    });

    it('8.0.1 migrates and adds tags to disabled rules in 8.0', async () => {
      const responseEnabledBeforeMigration = await es.get<{ alert: RawRule }>(
        {
          index: ALERTING_CASES_SAVED_OBJECT_INDEX,
          id: 'alert:1efdfa40-8ec7-11ec-a700-5524407a7653',
        },
        { meta: true }
      );
      expect(responseEnabledBeforeMigration.statusCode).toEqual(200);
      const responseDisabledBeforeMigration = await es.get<{ alert: RawRule }>(
        {
          index: ALERTING_CASES_SAVED_OBJECT_INDEX,
          id: 'alert:13fdfa40-8ec7-11ec-a700-5524407a7667',
        },
        { meta: true }
      );
      expect(responseDisabledBeforeMigration.statusCode).toEqual(200);

      // Both should be disabled
      expect(responseEnabledBeforeMigration.body._source?.alert?.enabled).toBe(false);
      expect(responseDisabledBeforeMigration.body._source?.alert?.enabled).toBe(false);

      // Only the rule that was enabled should be tagged
      expect(responseEnabledBeforeMigration.body._source?.alert?.tags).toEqual([
        'auto_disabled_8.0',
      ]);
      expect(responseDisabledBeforeMigration.body._source?.alert?.tags).toEqual([]);
    });

    it('8.2.0 migrates params to mapped_params for specific params properties', async () => {
      const response = await es.get<{ alert: RawRule }>(
        {
          index: ALERTING_CASES_SAVED_OBJECT_INDEX,
          id: 'alert:66560b6f-5ca4-41e2-a1a1-dcfd7117e124',
        },
        { meta: true }
      );

      expect(response.statusCode).toEqual(200);
      expect(response.body._source?.alert?.mapped_params).toEqual({
        risk_score: 90,
        severity: '80-critical',
      });
    });

    it('8.2.0 migrates existing esQuery alerts to contain searchType param', async () => {
      const response = await es.get<{ alert: RawRule }>(
        {
          index: ALERTING_CASES_SAVED_OBJECT_INDEX,
          id: 'alert:776cb5c0-ad1e-11ec-ab9e-5f5932f4fad8',
        },
        { meta: true }
      );
      expect(response.statusCode).toEqual(200);
      expect(response.body._source?.alert?.params.searchType).toEqual('esQuery');
    });

    it('8.3.0 removes internal tags in Security Solution rule', async () => {
      const response = await es.get<{ alert: RawRule }>(
        {
          index: ALERTING_CASES_SAVED_OBJECT_INDEX,
          id: 'alert:8990af61-c09a-11ec-9164-4bfd6fc32c43',
        },
        { meta: true }
      );

      expect(response.statusCode).toEqual(200);
      expect(response.body._source?.alert?.tags).toEqual(['test-tag-1', 'foo-tag']);
    });

    it('8.4.1 removes IsSnoozedUntil', async () => {
      const searchResult = await es.search<RawRule>(
        {
          index: ALERTING_CASES_SAVED_OBJECT_INDEX,
          body: {
            query: {
              term: {
                _id: 'alert:4d973df0-23df-11ed-8ae4-e988ad0f6fa7',
              },
            },
          },
        },
        { meta: true }
      );

      expect(searchResult.statusCode).toEqual(200);
      const hit = searchResult.body.hits.hits[0];
      expect((hit!._source!.alert! as RawRule).isSnoozedUntil).toBe(undefined);
    });

    it('8.5.0 removes runtime and field params from older ES Query rules', async () => {
      const response = await es.get<{
        alert: {
          params: {
            esQuery: string;
          };
        };
      }>(
        {
          index: ALERTING_CASES_SAVED_OBJECT_INDEX,
          id: 'alert:c8b39c29-d860-43b6-8817-b8058d80ddbc',
        },
        { meta: true }
      );
      expect(response.statusCode).toEqual(200);
      expect(response.body._source?.alert?.params?.esQuery).toEqual(
        JSON.stringify({ query: { match_all: {} } }, null, 4)
      );
    });

    it('8.5.0 doesnt reformat ES Query rules that dot have a runtime field on them', async () => {
      const response = await es.get<{
        alert: {
          params: {
            esQuery: string;
          };
        };
      }>(
        {
          index: ALERTING_CASES_SAVED_OBJECT_INDEX,
          id: 'alert:62c62b7f-8bf3-4104-a064-6247b7bda44f',
        },
        { meta: true }
      );
      expect(response.statusCode).toEqual(200);
      expect(response.body._source?.alert?.params?.esQuery).toEqual(
        '{\n\t"query":\n{\n\t"match_all":\n\t{}\n}\n}'
      );
    });

    it('8.5.0 doesnt fail upgrade when an ES Query rule is not parsable', async () => {
      const response = await es.get<{
        alert: {
          params: {
            esQuery: string;
          };
        };
      }>(
        {
          index: ALERTING_CASES_SAVED_OBJECT_INDEX,
          id: 'alert:f0d13f4d-35ae-4554-897a-6392e97bb84c',
        },
        { meta: true }
      );
      expect(response.statusCode).toEqual(200);
      expect(response.body._source?.alert?.params?.esQuery).toEqual('{"query":}');
    });

    it('8.6.0 migrates executionStatus and monitoring', async () => {
      const response = await es.get<{ alert: RawRule }>(
        {
          index: ALERTING_CASES_SAVED_OBJECT_INDEX,
          id: 'alert:8370ffd2-f2db-49dc-9741-92c657189b9b',
        },
        { meta: true }
      );
      const alert = response.body._source?.alert;

      expect(alert?.monitoring).toEqual({
        run: {
          history: [
            {
              duration: 60000,
              success: true,
              timestamp: '2022-08-24T19:05:49.817Z',
            },
          ],
          calculated_metrics: {
            success_ratio: 1,
            p50: 0,
            p95: 60000,
            p99: 60000,
          },
          last_run: {
            timestamp: '2022-08-24T19:05:49.817Z',
            metrics: {
              duration: 60000,
            },
          },
        },
      });

      expect(alert?.lastRun).toEqual({
        outcome: 'succeeded',
        outcomeMsg: null,
        outcomeOrder: 0,
        warning: null,
        alertsCount: {},
      });

      expect(alert?.nextRun).toEqual(undefined);
    });

    it('8.6 migrates executionStatus warnings and errors', async () => {
      const response = await es.get<{ alert: RawRule }>(
        {
          index: ALERTING_CASES_SAVED_OBJECT_INDEX,
          id: 'alert:c87707ac-7328-47f7-b212-2cb40a4fc9b9',
        },
        { meta: true }
      );

      const alert = response.body._source?.alert;

      expect(alert?.lastRun?.outcome).toEqual('warning');
      expect(alert?.lastRun?.warning).toEqual('warning reason');
      expect(alert?.lastRun?.outcomeMsg).toEqual('warning message');
    });

    it('8.7.0 adds aggType and groupBy to ES query rules', async () => {
      const response = await es.search<RawRule>(
        {
          index: ALERTING_CASES_SAVED_OBJECT_INDEX,
          body: {
            query: {
              bool: {
                must: [
                  {
                    term: {
                      'alert.alertTypeId': '.es-query',
                    },
                  },
                ],
              },
            },
          },
        },
        { meta: true }
      );
      expect(response.statusCode).toEqual(200);
      response.body.hits.hits.forEach((hit) => {
        expect((hit?._source?.alert as RawRule)?.params?.aggType).toEqual('count');
        expect((hit?._source?.alert as RawRule)?.params?.groupBy).toEqual('all');
      });
    });

    it('8.7.0 adds logView param and its reference to Log Threshold rule', async () => {
      const logViewId = 'log-view-reference-0';

      const logView = {
        logViewId,
        type: 'log-view-reference',
      };

      const references = [
        {
          name: `param:${logViewId}`,
          type: 'infrastructure-monitoring-log-view',
          id: 'default',
        },
      ];

      const response = await es.get<{ alert: RawRule; references: SavedObjectReference[] }>(
        {
          index: ALERTING_CASES_SAVED_OBJECT_INDEX,
          id: 'alert:8bd01ff0-9d84-11ed-994d-f1971f849da5',
        },
        { meta: true }
      );

      expect(response.body._source?.alert?.params.logView).toEqual(logView);
      expect(response.body._source?.references).toEqual(references);
    });

    it('8.8 adds uuid to the actions', async () => {
      const response = await es.get<{ alert: RawRule }>(
        {
          index: ALERTING_CASES_SAVED_OBJECT_INDEX,
          id: 'alert:9c003b00-00ee-11ec-b067-2524946ba327',
        },
        { meta: true }
      );

      const alert = response.body._source?.alert;

      expect(alert?.actions).toEqual([
        {
          actionRef: 'action_0',
          actionTypeId: 'test.noop',
          group: 'default',
          params: {},
          uuid: expect.any(String),
        },
        {
          actionRef: 'preconfigured:my-slack1',
          actionTypeId: '.slack',
          group: 'default',
          params: {
            message: 'something happened!',
          },
          uuid: expect.any(String),
        },
      ]);
    });

    it('8.8 adds frequency to the actions for security solution', async () => {
      const response = await es.get<{ alert: RawRule }>(
        {
          index: ALERTING_CASES_SAVED_OBJECT_INDEX,
          id: 'alert:8990af61-c09a-11ec-9164-4bfd6fc32c43',
        },
        { meta: true }
      );

      const alert = response.body._source?.alert;

      expect(alert?.actions).toEqual([
        expect.objectContaining({
          frequency: {
            summary: true,
            notifyWhen: 'onThrottleInterval',
            throttle: '1h',
          },
        }),
      ]);
    });
  });
}
