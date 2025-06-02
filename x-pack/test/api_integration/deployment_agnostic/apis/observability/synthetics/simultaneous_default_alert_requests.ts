/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { INTERNAL_ALERTING_API_FIND_RULES_PATH } from '@kbn/alerting-plugin/common';
import { SYNTHETICS_API_URLS } from '@kbn/synthetics-plugin/common/constants';
import { DYNAMIC_SETTINGS_DEFAULTS } from '@kbn/synthetics-plugin/common/constants/settings_defaults';
import type { RoleCredentials } from '@kbn/ftr-common-functional-services';
import type { DeploymentAgnosticFtrProviderContext } from '../../../ftr_provider_context';

export default function ({ getService }: DeploymentAgnosticFtrProviderContext) {
  const kibanaServer = getService('kibanaServer');
  const supertest = getService('supertest');
  const samlAuth = getService('samlAuth');

  describe('Simultaneous Default Alert Requests', () => {
    let editorUser: RoleCredentials;

    before(async () => {
      await kibanaServer.savedObjects.cleanStandardList();
      editorUser = await samlAuth.createM2mApiKeyWithRoleScope('editor');
    });

    beforeEach(async () => {
      // ensure alerts are enabled before testing the feature
      await supertest
        .put(SYNTHETICS_API_URLS.DYNAMIC_SETTINGS)
        .set(editorUser.apiKeyHeader)
        .set(samlAuth.getInternalRequestHeader())
        .send(DYNAMIC_SETTINGS_DEFAULTS)
        .expect(200);
    });

    after(() => kibanaServer.savedObjects.cleanStandardList());

    it('should handle multiple simultaneous requests for default alerting', async () => {
      // make many simultaneous requests to the default alerting API
      const REQUEST_COUNT = 5;
      const requests = Array.from({ length: REQUEST_COUNT }, () =>
        supertest
          .post(SYNTHETICS_API_URLS.ENABLE_DEFAULT_ALERTING)
          .set(editorUser.apiKeyHeader)
          .set(samlAuth.getInternalRequestHeader())
          .send()
          .expect(200)
      );

      // let all requests finish
      const responses = await Promise.all(requests);

      expect(responses).to.have.length(REQUEST_COUNT);

      // All the alerting responses should match
      const {
        statusRule: { id: statusId },
        tlsRule: { id: tlsId },
      } = responses[0].body;
      responses.forEach((response: any) => {
        expect(response.body).to.be.ok();
        const {
          body: {
            statusRule: { id: curStatusId },
          },
        } = response;
        expect(curStatusId).to.be(statusId);
        expect(response.status).to.be(200);
      });

      // fetch all the rules, there should be two
      const alertingResponse = await supertest
        .post(INTERNAL_ALERTING_API_FIND_RULES_PATH)
        .set(editorUser.apiKeyHeader)
        .set(samlAuth.getInternalRequestHeader())
        .send({})
        .expect(200);

      expect(alertingResponse.body.data).to.have.length(2);

      // the two rules should have IDs matching the ones from our create responses above
      const statusRule = alertingResponse.body.data.find(
        (rule: any) => rule.rule_type_id === 'xpack.synthetics.alerts.monitorStatus'
      );
      const tlsRule = alertingResponse.body.data.find(
        (rule: any) => rule.rule_type_id === 'xpack.synthetics.alerts.tls'
      );
      expect(statusRule).to.be.ok();
      expect(tlsRule).to.be.ok();
      expect(statusRule.id).to.be(statusId);
      expect(tlsRule.id).to.be(tlsId);
    });
  });
}
