/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../common/ftr_provider_context';

export default function ApiTest({ getService }: FtrProviderContext) {
  const registry = getService('registry');
  const observabilityOnboardingApiClient = getService('observabilityOnboardingApiClient');

  async function callApiWithPrivileges() {
    return await observabilityOnboardingApiClient.logMonitoringUser({
      endpoint: 'GET /internal/observability_onboarding/custom_logs/privileges',
    });
  }

  async function callApiWithoutPrivileges() {
    return await observabilityOnboardingApiClient.readUser({
      endpoint: 'GET /internal/observability_onboarding/custom_logs/privileges',
    });
  }

  registry.when("User doesn't have required privileges", { archives: [] }, () => {
    it('returns hasPrivileges:false', async () => {
      const privileges = await callApiWithoutPrivileges();

      expect(privileges.body.hasPrivileges).not.ok();
    });
  });

  registry.when('User has required privileges', { archives: [] }, () => {
    it('returns hasPrivileges:true', async () => {
      const privileges = await callApiWithPrivileges();

      expect(privileges.body.hasPrivileges).ok();
    });
  });
}
