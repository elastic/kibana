/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import type { RawRule, RawRuleAction } from '@kbn/alerting-plugin/server/types';
import { FILEBEAT_7X_INDICATOR_PATH } from '@kbn/alerting-plugin/server/saved_objects/migrations';
import { getUrlPrefix } from '../../../common/lib';
import { FtrProviderContext } from '../../../common/ftr_provider_context';

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

      expect(response.status).to.eql(200);
      expect(response.body.consumer).to.equal('alerts');
    });

    it('7.10.0 migrates the `metrics` consumer to be the `infrastructure`', async () => {
      const response = await supertest.get(
        `${getUrlPrefix(``)}/api/alerting/rule/74f3e6d7-b7bb-477d-ac28-fdf248d5f2a4`
      );

      expect(response.status).to.eql(200);
      expect(response.body.consumer).to.equal('infrastructure');
    });

    it('7.10.0 migrates PagerDuty actions to have a default dedupKey', async () => {
      const response = await supertest.get(
        `${getUrlPrefix(``)}/api/alerting/rule/b6087f72-994f-46fb-8120-c6e5c50d0f8f`
      );

      expect(response.status).to.eql(200);

      expect(response.body.actions).to.eql([
        {
          connector_type_id: '.pagerduty',
          id: 'a6a8ab7a-35cf-445e-ade3-215a029c2ee3',
          group: 'default',
          params: {
            component: '',
            eventAction: 'trigger',
            summary: 'fired {{alertInstanceId}}',
          },
        },
        {
          connector_type_id: '.pagerduty',
          id: 'a6a8ab7a-35cf-445e-ade3-215a029c2ee3',
          group: 'default',
          params: {
            component: '',
            dedupKey: '{{alertId}}',
            eventAction: 'resolve',
            summary: 'fired {{alertInstanceId}}',
          },
        },
        {
          connector_type_id: '.pagerduty',
          id: 'a6a8ab7a-35cf-445e-ade3-215a029c2ee3',
          group: 'default',
          params: {
            component: '',
            dedupKey: '{{alertInstanceId}}',
            eventAction: 'resolve',
            summary: 'fired {{alertInstanceId}}',
          },
        },
      ]);
    });

    it('7.11.0 migrates alerts to contain `updatedAt` field', async () => {
      const response = await supertest.get(
        `${getUrlPrefix(``)}/api/alerting/rule/74f3e6d7-b7bb-477d-ac28-92ee22728e6e`
      );

      expect(response.status).to.eql(200);
      expect(response.body.updated_at).to.eql('2020-06-17T15:35:39.839Z');
    });

    it('7.11.0 migrates alerts to contain `notifyWhen` field', async () => {
      const response = await supertest.get(
        `${getUrlPrefix(``)}/api/alerting/rule/74f3e6d7-b7bb-477d-ac28-92ee22728e6e`
      );

      expect(response.status).to.eql(200);
      expect(response.body.notify_when).to.eql('onActiveAlert');
    });

    it('7.11.2 migrates alerts with case actions, case fields are nested in an incident object', async () => {
      const response = await supertest.get(
        `${getUrlPrefix(``)}/api/alerting/rule/99f3e6d7-b7bb-477d-ac28-92ee22726969`
      );

      expect(response.status).to.eql(200);
      expect(response.body.actions).to.eql([
        {
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
        },
        {
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
        },
        {
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
        },
      ]);
    });

    it('7.15.0 migrates security_solution alerts with exceptionLists to be saved object references', async () => {
      // NOTE: We have to use elasticsearch directly against the ".kibana" index because alerts do not expose the references which we want to test exists
      const response = await es.get<{ references: [{}] }>(
        {
          index: '.kibana',
          id: 'alert:38482620-ef1b-11eb-ad71-7de7959be71c',
        },
        { meta: true }
      );
      expect(response.statusCode).to.eql(200);
      expect(response.body._source?.references).to.eql([
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
          index: '.kibana',
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
      expect(searchResult.statusCode).to.equal(200);
      expect((searchResult.body.hits.total as estypes.SearchTotalHits).value).to.equal(1);
      const hit = searchResult.body.hits.hits[0];
      expect((hit!._source!.alert! as RawRule).legacyId).to.equal(
        '74f3e6d7-b7bb-477d-ac28-92ee22728e6e'
      );
    });

    it('7.16.0 migrates existing rules so predefined connectors are not stored in references', async () => {
      const searchResult = await es.search<RawRule>(
        {
          index: '.kibana',
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
      expect(searchResult.statusCode).to.equal(200);
      expect((searchResult.body.hits.total as estypes.SearchTotalHits).value).to.equal(1);
      const hit = searchResult.body.hits.hits[0];
      expect((hit!._source!.alert! as RawRule).actions! as RawRuleAction[]).to.eql([
        {
          actionRef: 'action_0',
          actionTypeId: 'test.noop',
          group: 'default',
          params: {},
        },
        {
          actionRef: 'preconfigured:my-slack1',
          actionTypeId: '.slack',
          group: 'default',
          params: {
            message: 'something happened!',
          },
        },
      ]);
      expect(hit!._source!.references!).to.eql([
        {
          id: '66a8ab7a-35cf-445e-ade3-215a029c6969',
          name: 'action_0',
          type: 'action',
        },
      ]);
    });

    it('7.16.0 migrates security_solution (Legacy) siem.notifications with "ruleAlertId" to be saved object references', async () => {
      // NOTE: We hae to use elastic search directly against the ".kibana" index because alerts do not expose the references which we want to test exists
      const response = await es.get<{ references: [{}] }>(
        {
          index: '.kibana',
          id: 'alert:d7a8c6a1-9394-48df-a634-d5457c35d747',
        },
        { meta: true }
      );
      expect(response.statusCode).to.eql(200);
      expect(response.body._source?.references).to.eql([
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
          index: '.kibana',
          id: 'alert:ece1ece2-9394-48df-a634-d5457c351ece',
        },
        { meta: true }
      );
      expect(response.statusCode).to.eql(200);
      expect(response.body._source?.alert?.params?.threatIndicatorPath).to.eql(
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
          index: '.kibana',
          id: 'alert:fce1ece2-9394-48df-a634-d5457c351fce',
        },
        { meta: true }
      );
      expect(response.statusCode).to.eql(200);
      expect(response.body._source?.alert?.params?.threatIndicatorPath).to.eql(
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
          index: '.kibana',
          id: 'alert:1ce1ece2-9394-48df-a634-d5457c3511ce',
        },
        { meta: true }
      );
      expect(response.statusCode).to.eql(200);
      expect(response.body._source?.alert?.params?.threatIndicatorPath).not.to.eql(
        FILEBEAT_7X_INDICATOR_PATH
      );
    });

    it('8.0 migrates incorrect action group spellings on the Metrics Inventory Threshold rule type', async () => {
      const response = await es.get<{ alert: RawRule }>(
        {
          index: '.kibana',
          id: 'alert:92237b30-4e03-11ec-9ab9-d980518a2d28',
        },
        { meta: true }
      );
      expect(response.statusCode).to.eql(200);
      expect(response.body._source?.alert?.actions?.[0].group).to.be(
        'metrics.inventory_threshold.fired'
      );
    });

    it('8.0 migrates and disables pre-existing rules', async () => {
      const response = await es.get<{ alert: RawRule }>(
        {
          index: '.kibana',
          id: 'alert:38482620-ef1b-11eb-ad71-7de7959be71c',
        },
        { meta: true }
      );
      expect(response.statusCode).to.eql(200);
      expect(response.body._source?.alert?.alertTypeId).to.be('siem.queryRule');
      expect(response.body._source?.alert?.enabled).to.be(false);
    });

    it('8.0.1 migrates and adds tags to disabled rules in 8.0', async () => {
      const responseEnabledBeforeMigration = await es.get<{ alert: RawRule }>(
        {
          index: '.kibana',
          id: 'alert:1efdfa40-8ec7-11ec-a700-5524407a7653',
        },
        { meta: true }
      );
      expect(responseEnabledBeforeMigration.statusCode).to.eql(200);
      const responseDisabledBeforeMigration = await es.get<{ alert: RawRule }>(
        {
          index: '.kibana',
          id: 'alert:13fdfa40-8ec7-11ec-a700-5524407a7667',
        },
        { meta: true }
      );
      expect(responseDisabledBeforeMigration.statusCode).to.eql(200);

      // Both should be disabled
      expect(responseEnabledBeforeMigration.body._source?.alert?.enabled).to.be(false);
      expect(responseDisabledBeforeMigration.body._source?.alert?.enabled).to.be(false);

      // Only the rule that was enabled should be tagged
      expect(responseEnabledBeforeMigration.body._source?.alert?.tags).to.eql([
        '__internal_rule_id:064e3fed-6328-416b-bb85-c08265088f41',
        '__internal_immutable:false',
        'auto_disabled_8.0',
      ]);
      expect(responseDisabledBeforeMigration.body._source?.alert?.tags).to.eql([
        '__internal_rule_id:364e3fed-6328-416b-bb85-c08265088f41',
        '__internal_immutable:false',
      ]);
    });

    it('8.2.0 migrates params to mapped_params for specific params properties', async () => {
      const response = await es.get<{ alert: RawRule }>(
        {
          index: '.kibana',
          id: 'alert:66560b6f-5ca4-41e2-a1a1-dcfd7117e124',
        },
        { meta: true }
      );

      expect(response.statusCode).to.equal(200);
      expect(response.body._source?.alert?.mapped_params).to.eql({
        risk_score: 90,
        severity: '80-critical',
      });
    });
  });
}
