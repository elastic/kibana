/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { OBSERVABILITY_ONBOARDING_STATE_SAVED_OBJECT_TYPE } from '@kbn/observability-onboarding-plugin/server/saved_objects/observability_onboarding_status';
import { DeploymentAgnosticFtrProviderContext } from '../../../ftr_provider_context';
import { SupertestWithRoleScopeType } from '../../../services';

export default function ({ getService }: DeploymentAgnosticFtrProviderContext) {
  const kibanaServer = getService('kibanaServer');
  const roleScopedSupertest = getService('roleScopedSupertest');
  let viewerClient: SupertestWithRoleScopeType;
  let adminClient: SupertestWithRoleScopeType;

  describe('Creating onboarding logs flow', () => {
    before(async () => {
      viewerClient = await roleScopedSupertest.getSupertestWithRoleScope('viewer', {
        withInternalHeaders: true,
        useCookieHeader: true,
      });
      adminClient = await roleScopedSupertest.getSupertestWithRoleScope('admin', {
        withInternalHeaders: true,
        useCookieHeader: true,
      });
    });

    it('fails with a 500 error when missing privileges', async () => {
      const response = await viewerClient
        .post('/internal/observability_onboarding/logs/flow')
        .send({
          type: 'logFiles',
          name: 'name',
          state: {},
        });

      expect(response.statusCode).to.be(500);
      expect(response.body.message).to.contain('unauthorized');
    });

    it('returns a flow id and apiKey encoded', async () => {
      const state = {
        datasetName: 'my-dataset',
        serviceName: 'my-service',
        namespace: 'my-namespace',
        logFilePaths: ['my-service-logs.log'],
      };

      const response = await adminClient.post('/internal/observability_onboarding/logs/flow').send({
        type: 'logFiles',
        name: 'name',
        state,
      });

      expect(response.statusCode).to.be(200);
      expect(response.body.apiKeyEncoded).to.not.empty();
      expect(response.body.onboardingId).to.not.empty();
    });

    it('saves the expected state for logFiles', async () => {
      const state = {
        datasetName: 'my-dataset',
        serviceName: 'my-service',
        namespace: 'my-namespace',
        logFilePaths: ['my-service-logs.log'],
      };

      const response = await adminClient.post('/internal/observability_onboarding/logs/flow').send({
        type: 'logFiles',
        name: 'name',
        state,
      });

      const savedState = await kibanaServer.savedObjects.get({
        type: OBSERVABILITY_ONBOARDING_STATE_SAVED_OBJECT_TYPE,
        id: response.body.onboardingId,
      });

      expect(savedState.attributes).to.be.eql({ type: 'logFiles', state, progress: {} });
    });
  });
}
