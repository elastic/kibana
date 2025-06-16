/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { ObservabilityOnboardingApiClientKey } from '../../../common/config';
import { FtrProviderContext } from '../../../common/ftr_provider_context';
import { ObservabilityOnboardingApiError } from '../../../common/observability_onboarding_api_supertest';
import { expectToReject } from '../../../common/utils/expect_to_reject';

export default function ApiTest({ getService }: FtrProviderContext) {
  const registry = getService('registry');
  const observabilityOnboardingApiClient = getService('observabilityOnboardingApiClient');

  async function callApi({
    onboardingId,
    user = 'logMonitoringUser',
  }: {
    onboardingId: string;
    user?: ObservabilityOnboardingApiClientKey;
  }) {
    return await observabilityOnboardingApiClient[user]({
      endpoint: 'GET /internal/observability_onboarding/flow/{onboardingId}/progress',
      params: {
        path: {
          onboardingId,
        },
      },
    });
  }

  registry.when('Get progress', { config: 'basic' }, () => {
    let onboardingId: string;

    before(async () => {
      const req = await observabilityOnboardingApiClient.logMonitoringUser({
        endpoint: 'POST /internal/observability_onboarding/flow',
      });

      onboardingId = req.body.onboardingFlow.id;
    });

    describe('when missing required privileges', () => {
      it('fails with a 404 error', async () => {
        const err = await expectToReject<ObservabilityOnboardingApiError>(
          async () =>
            await callApi({
              onboardingId,
              user: 'noAccessUser',
            })
        );

        expect(err.res.status).to.be(404);
        expect(err.res.body.message).to.contain('onboarding session not found');
      });
    });
  });
}
