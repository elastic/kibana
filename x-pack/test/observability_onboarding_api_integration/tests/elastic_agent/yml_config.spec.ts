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
  const apmApiClient = getService('apmApiClient');

  async function callApi(id: string) {
    return await apmApiClient.readUser({
      endpoint: 'GET /api/observability_onboarding/elastic_agent/config 2023-05-24',
      params: {
        query: {
          id,
        },
      },
    });
  }

  registry.when('Agent latest versions when configuration is defined', { archives: [] }, () => {
    it('returns a version when agent is listed in the file', async () => {
      const err = await expectToReject<ObservabilityOnboardingApiError>(
        async () => await callApi('my-id')
      );

      expect(err.res.status).to.be(500);
      expect(err.res.body.message).to.contain('transaction.type');
    });
  });
}
