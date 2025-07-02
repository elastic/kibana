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
      const listIds = resp.body.map((item: { id: string }) => item.id);
      expect(listIds).to.eql([
        '.email',
        '.index',
        '.pagerduty',
        '.swimlane',
        '.server-log',
        '.slack',
        '.slack_api',
        '.webhook',
        '.cases-webhook',
        '.xmatters',
        '.servicenow',
        '.servicenow-sir',
        '.servicenow-itom',
        '.jira',
        '.teams',
        '.torq',
        '.opsgenie',
        '.tines',
        '.gen-ai',
        '.bedrock',
        '.gemini',
        '.d3security',
        '.resilient',
        '.thehive',
        '.xsoar',
        '.sentinelone',
        '.crowdstrike',
        '.inference',
        '.microsoft_defender_endpoint',
      ]);
    });
  });
}
