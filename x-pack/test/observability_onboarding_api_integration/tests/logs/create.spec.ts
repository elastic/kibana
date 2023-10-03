/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { OBSERVABILITY_ONBOARDING_STATE_SAVED_OBJECT_TYPE } from '@kbn/observability-onboarding-plugin/server/saved_objects/observability_onboarding_status';
import { FtrProviderContext } from '../../common/ftr_provider_context';
import { ObservabilityOnboardingApiError } from '../../common/observability_onboarding_api_supertest';
import { expectToReject } from '../../common/utils/expect_to_reject';

export default function ApiTest({ getService }: FtrProviderContext) {
  const registry = getService('registry');
  const kibanaServer = getService('kibanaServer');
  const observabilityOnboardingApiClient = getService('observabilityOnboardingApiClient');

  async function callApiWithoutPrivileges(state = {}) {
    return await observabilityOnboardingApiClient.readUser({
      endpoint: 'POST /internal/observability_onboarding/logs/flow',
      params: {
        body: {
          type: 'logFiles',
          name: 'name',
          state,
        },
      },
    });
  }

  async function callApiWithPrivileges(type: 'logFiles' | 'systemLogs', state = {}) {
    return await observabilityOnboardingApiClient.logMonitoringUser({
      endpoint: 'POST /internal/observability_onboarding/logs/flow',
      params: {
        body: {
          type,
          name: 'name',
          state,
        },
      },
    });
  }

  registry.when('Save state', { config: 'basic' }, () => {
    describe('when missing required privileges', () => {
      it('fails with a 500 error', async () => {
        const err = await expectToReject<ObservabilityOnboardingApiError>(
          async () => await callApiWithoutPrivileges()
        );

        expect(err.res.status).to.be(500);
        expect(err.res.body.message).to.contain('unauthorized');
      });
    });

    describe('when required privileges are set', () => {
      it('returns a flow id and apiKey encoded', async () => {
        const state = {
          datasetName: 'my-dataset',
          serviceName: 'my-service',
          namespace: 'my-namespace',
          logFilePaths: ['my-service-logs.log'],
        };

        const request = await callApiWithPrivileges('logFiles', state);

        expect(request.status).to.be(200);
        expect(request.body.apiKeyEncoded).to.not.empty();
        expect(request.body.onboardingId).to.not.empty();
      });

      it('saves the expected state for logFiles', async () => {
        const state = {
          datasetName: 'my-dataset',
          serviceName: 'my-service',
          namespace: 'my-namespace',
          logFilePaths: ['my-service-logs.log'],
        };

        const request = await callApiWithPrivileges('logFiles', state);

        const savedState = await kibanaServer.savedObjects.get({
          type: OBSERVABILITY_ONBOARDING_STATE_SAVED_OBJECT_TYPE,
          id: request.body.onboardingId,
        });

        expect(savedState.attributes).to.be.eql({ type: 'logFiles', state, progress: {} });
      });

      it('saves the expected state for systemLogs', async () => {
        const state = {
          namespace: 'default',
        };

        const request = await callApiWithPrivileges('systemLogs');

        const savedState = await kibanaServer.savedObjects.get({
          type: OBSERVABILITY_ONBOARDING_STATE_SAVED_OBJECT_TYPE,
          id: request.body.onboardingId,
        });

        expect(savedState.attributes).to.be.eql({ type: 'systemLogs', state, progress: {} });
      });
    });
  });
}
