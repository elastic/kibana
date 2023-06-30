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

  async function callApi({ id, name, status }: { id: string; name: string; status: string }) {
    return await observabilityOnboardingApiClient.logMonitoringUser({
      endpoint: 'POST /internal/observability_onboarding/custom_logs/{id}/step/{name}',
      params: {
        path: {
          id,
          name,
        },
        body: {
          status,
        },
      },
    });
  }

  registry.when('Update step progress', { config: 'basic' }, () => {
    let onboardingId: string;

    before(async () => {
      const req = await observabilityOnboardingApiClient.logMonitoringUser({
        endpoint: 'POST /internal/observability_onboarding/custom_logs/save',
        params: {
          body: {
            name: 'name',
            state: {},
          },
        },
      });

      onboardingId = req.body.onboardingId;
    });

    describe("when onboardingId doesn't exists", () => {
      it('fails with a 404 error', async () => {
        const err = await expectToReject<ObservabilityOnboardingApiError>(
          async () =>
            await callApi({
              id: 'my-onboarding-id',
              name: 'ea-download',
              status: 'complete',
            })
        );

        expect(err.res.status).to.be(404);
        expect(err.res.body.message).to.contain('onboarding session not found');
      });
    });

    describe('when onboardingId exists', () => {
      const step = {
        name: 'ea-download',
        status: 'complete',
      };

      before(async () => {
        const savedState = await kibanaServer.savedObjects.get({
          type: OBSERVABILITY_ONBOARDING_STATE_SAVED_OBJECT_TYPE,
          id: onboardingId,
        });

        expect(savedState.attributes.progress?.[step.name]).not.ok();
      });

      it('updates step status', async () => {
        const request = await callApi({
          id: onboardingId,
          ...step,
        });

        expect(request.status).to.be(200);

        const savedState = await kibanaServer.savedObjects.get({
          type: OBSERVABILITY_ONBOARDING_STATE_SAVED_OBJECT_TYPE,
          id: onboardingId,
        });

        expect(savedState.attributes.progress?.[step.name]).to.be(step.status);
      });
    });
  });
}
