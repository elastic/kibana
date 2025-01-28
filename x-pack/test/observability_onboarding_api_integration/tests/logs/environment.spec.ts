/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../common/ftr_provider_context';
import { MOCKED_KIBANA_URL, MOCKED_PUBLIC_BASE_URL } from '../../configs';

export default function ApiTest({ getService }: FtrProviderContext) {
  const registry = getService('registry');
  const observabilityOnboardingApiClient = getService('observabilityOnboardingApiClient');

  async function callApiWithPrivileges() {
    return await observabilityOnboardingApiClient.logMonitoringUser({
      endpoint: 'GET /internal/observability_onboarding/logs/setup/environment',
    });
  }

  registry.when('Install shipper setup', { config: 'basic' }, () => {
    it('returns apiEndpoint and scriptDownloadUrl prioritizing server.publicBaseUrl', async () => {
      const request = await callApiWithPrivileges();

      expect(request.status).to.be(200);
      expect(request.body.apiEndpoint).to.be(
        `${MOCKED_PUBLIC_BASE_URL}/internal/observability_onboarding`
      );
      expect(request.body.scriptDownloadUrl).to.match(
        new RegExp(
          `${MOCKED_PUBLIC_BASE_URL}/.+?/plugins/observabilityOnboarding/assets/standalone_agent_setup.sh`,
          'i'
        )
      );
    });
  });

  registry.when('Install shipper setup', { config: 'cloud' }, () => {
    it('returns apiEndpoint and scriptDownloadUrl prioritizing cloudId', async () => {
      const request = await callApiWithPrivileges();

      expect(request.status).to.be(200);
      expect(request.body.apiEndpoint).to.be(
        `${MOCKED_KIBANA_URL}/internal/observability_onboarding`
      );
      expect(request.body.scriptDownloadUrl).to.match(
        new RegExp(
          `${MOCKED_KIBANA_URL}/.+?/plugins/observabilityOnboarding/assets/standalone_agent_setup.sh`,
          'i'
        )
      );
    });
  });
}
