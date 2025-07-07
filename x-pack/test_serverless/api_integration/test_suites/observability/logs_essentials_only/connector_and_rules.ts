/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../ftr_provider_context';
import { SupertestWithRoleScopeType } from '../../../../shared/services';

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
      expect(listIds).to.eql([
        '.es-query',
        'observability.rules.custom_threshold',
        'datasetQuality.degradedDocs',
      ]);
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
  });
}
