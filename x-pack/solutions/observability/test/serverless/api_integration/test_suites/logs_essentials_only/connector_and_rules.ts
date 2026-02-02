/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import type { FtrProviderContext } from '../../ftr_provider_context';
import type { SupertestWithRoleScopeType } from '../../services';

export default function ({ getService }: FtrProviderContext) {
  const roleScopedSupertest = getService('roleScopedSupertest');
  const svlCommonApi = getService('svlCommonApi');

  describe('ConnectorsAndRules', function () {
    let supertestAdminWithCookieCredentials: SupertestWithRoleScopeType;

    before(async () => {
      supertestAdminWithCookieCredentials = await roleScopedSupertest.getSupertestWithRoleScope(
        'admin',
        {
          useCookieHeader: true,
          withInternalHeaders: true,
        }
      );
    });

    it('limit set of available connectors', async () => {
      const resp = await supertestAdminWithCookieCredentials
        .get('/api/actions/connector_types')
        .set(svlCommonApi.getInternalRequestHeader())
        .expect(200);
      const listIds = resp.body
        .filter((item: { enabled: boolean }) => item.enabled)
        .map((item: { id: string; enabled: boolean }) => item.id);
      expect(listIds).to.eql([
        '.email',
        '.pagerduty',
        '.slack',
        '.slack_api',
        '.webhook',
        '.servicenow',
        '.jira',
        '.teams',
        '.torq',
        '.opsgenie',
        '.tines',
        '.resilient',
      ]);
    });

    it('limit set of available rules', async () => {
      const resp = await supertestAdminWithCookieCredentials
        .get('/api/alerting/rule_types')
        .set(svlCommonApi.getInternalRequestHeader())
        .expect(200);
      const listIds = resp.body.map((item: { id: string; enabled: boolean }) => item.id);
      expect(listIds.sort()).to.eql(
        ['.es-query', 'observability.rules.custom_threshold', 'datasetQuality.degradedDocs'].sort()
      );
    });

    it('does not register annotations API', async () => {
      await supertestAdminWithCookieCredentials
        .post('/api/observability/annotation')
        .send({})
        .set(svlCommonApi.getInternalRequestHeader())
        .expect(404, {
          statusCode: 404,
          error: 'Not Found',
          message: 'Not Found',
        });
    });

    it('can create a custom threshold rule', async () => {
      const rule = {
        tags: [],
        params: {
          criteria: [
            {
              comparator: '>',
              metrics: [
                {
                  name: 'A',
                  aggType: 'count',
                },
              ],
              threshold: [100],
              timeSize: 1,
              timeUnit: 'm',
            },
          ],
          alertOnNoData: false,
          alertOnGroupDisappear: false,
          searchConfiguration: {
            query: {
              query: '',
              language: 'kuery',
            },
            index: 'befe6dd7-ec0b-4cb7-aa59-e4d5e6f39ae9',
          },
        },
        schedule: {
          interval: '1m',
        },
        consumer: 'logs',
        name: 'Custom threshold rule',
        rule_type_id: 'observability.rules.custom_threshold',
        actions: [],
        alert_delay: {
          active: 1,
        },
      };

      const resp = await supertestAdminWithCookieCredentials
        .post('/api/alerting/rule')
        .set(svlCommonApi.getInternalRequestHeader())
        .send(rule);

      expect(resp.status).to.equal(200);
      expect(resp.body).to.have.property('id');
      expect(resp.body.name).to.equal(rule.name);
    });

    it('can create a degraded docs rule', async () => {
      const rule = {
        tags: [],
        params: {
          comparator: '>',
          threshold: [3],
          timeSize: 5,
          timeUnit: 'm',
          groupBy: ['_index'],
          searchConfiguration: {
            index: 'demo-employees',
          },
        },
        schedule: {
          interval: '1m',
        },
        consumer: 'alerts',
        name: 'Degraded docs rule',
        rule_type_id: 'datasetQuality.degradedDocs',
        actions: [],
        alert_delay: {
          active: 1,
        },
      };

      const resp = await supertestAdminWithCookieCredentials
        .post('/api/alerting/rule')
        .set(svlCommonApi.getInternalRequestHeader())
        .send(rule);

      expect(resp.status).to.equal(200);
      expect(resp.body).to.have.property('id');
      expect(resp.body.name).to.equal(rule.name);
    });

    it('can create an es query dsl rule', async () => {
      const rule = {
        tags: [],
        params: {
          searchType: 'esQuery',
          timeWindowSize: 5,
          timeWindowUnit: 'm',
          threshold: [1000],
          thresholdComparator: '>',
          size: 10,
          esQuery: '{\n    "query":{\n      "match_all" : {}\n    }\n  }',
          aggType: 'count',
          groupBy: 'all',
          termSize: 5,
          excludeHitsFromPreviousRun: false,
          sourceFields: [],
          index: ['demo-employees'],
          timeField: 'join_date',
        },
        schedule: {
          interval: '1m',
        },
        consumer: 'logs',
        name: 'Elasticsearch query rule',
        rule_type_id: '.es-query',
        actions: [],
        alert_delay: {
          active: 1,
        },
      };

      const resp = await supertestAdminWithCookieCredentials
        .post('/api/alerting/rule')
        .set(svlCommonApi.getInternalRequestHeader())
        .send(rule);

      expect(resp.status).to.equal(200);
      expect(resp.body).to.have.property('id');
      expect(resp.body.name).to.equal(rule.name);
    });
  });
}
