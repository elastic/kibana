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

  async function callApiAsLogMonitoringUser() {
    return await observabilityOnboardingApiClient.logMonitoringUser({
      endpoint: 'GET /internal/observability_onboarding/custom_logs/privileges',
    });
  }

  async function callApiAsAdminUser() {
    return await observabilityOnboardingApiClient.adminUser({
      endpoint: 'GET /internal/observability_onboarding/custom_logs/privileges',
    });
  }

  async function callApiAsReadUser() {
    return await observabilityOnboardingApiClient.readUser({
      endpoint: 'GET /internal/observability_onboarding/custom_logs/privileges',
    });
  }

  async function callApiAsNoAccessUser() {
    return await observabilityOnboardingApiClient.noAccessUser({
      endpoint: 'GET /internal/observability_onboarding/custom_logs/privileges',
    });
  }

  registry.when('Api Key privileges check', { config: 'basic' }, () => {
    describe('when missing required privileges', () => {
      it('returns false when user has reader privileges', async () => {
        const privileges = await callApiAsReadUser();

        expect(privileges.body.hasPrivileges).not.ok();
      });

      it('returns false when user has no access privileges', async () => {
        const privileges = await callApiAsNoAccessUser();

        expect(privileges.body.hasPrivileges).not.ok();
      });
    });

    describe('when required privileges are set', () => {
      it('returns true when user has logMonitoring privileges', async () => {
        const privileges = await callApiAsLogMonitoringUser();

        expect(privileges.body.hasPrivileges).ok();
      });

      it('returns true when user has admin privileges', async () => {
        const privileges = await callApiAsAdminUser();

        expect(privileges.body.hasPrivileges).ok();
      });
    });
  });
}
