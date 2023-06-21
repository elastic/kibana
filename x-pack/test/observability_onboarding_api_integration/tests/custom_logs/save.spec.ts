/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../common/ftr_provider_context';
import { ObservabilityOnboardingApiError } from '../../common/observability_onboarding_api_supertest';
import { expectToReject } from '../../common/utils/expect_to_reject';

export default function ApiTest({ getService }: FtrProviderContext) {
  const registry = getService('registry');
  const observabilityOnboardingApiClient = getService('observabilityOnboardingApiClient');

  async function callApi(state = {}) {
    return await observabilityOnboardingApiClient.readUser({
      endpoint: 'POST /internal/observability_onboarding/custom_logs/save',
      params: {
        body: {
          name: 'name',
          state,
        },
      },
    });
  }

  registry.when('Agent latest versions when configuration is defined', { archives: [] }, () => {
    it('returns a version when agent is listed in the file', async () => {
      const err = await expectToReject<ObservabilityOnboardingApiError>(
        async () => await callApi()
      );

      expect(err.res.status).to.be(500);
      expect(err.res.body.message).to.contain('unauthorized');
    });
  });
}
