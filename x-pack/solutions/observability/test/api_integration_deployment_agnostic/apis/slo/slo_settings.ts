/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import type { RoleCredentials } from '@kbn/ftr-common-functional-services';
import { DEFAULT_SETTINGS } from '@kbn/slo-plugin/server/services/slo_settings_repository';
import { pick } from 'lodash';
import type { DeploymentAgnosticFtrProviderContext } from '../../ftr_provider_context';

export default function ({ getService }: DeploymentAgnosticFtrProviderContext) {
  const sloApi = getService('sloApi');
  const samlAuth = getService('samlAuth');
  const config = getService('config');
  const isServerless = !!config.get('serverless');

  let adminRoleAuthc: RoleCredentials;

  describe('SLO Settings', function () {
    before(async () => {
      adminRoleAuthc = await samlAuth.createM2mApiKeyWithRoleScope('admin');
    });

    after(async () => {
      await samlAuth.invalidateM2mApiKeyWithRoleScope(adminRoleAuthc);
    });

    describe('GET /internal/slo/settings', () => {
      it('returns default settings', async () => {
        const settings = await sloApi.getSettings(adminRoleAuthc);

        expect(settings).to.eql(DEFAULT_SETTINGS);
      });
    });

    describe('PUT /internal/slo/settings', () => {
      afterEach(async () => {
        const defaultSettings = isServerless
          ? pick(DEFAULT_SETTINGS, ['staleThresholdInHours', 'staleInstancesCleanupEnabled'])
          : DEFAULT_SETTINGS;

        await sloApi.updateSettings(defaultSettings, adminRoleAuthc);
      });

      if (isServerless) {
        it('updates setting (serverless)', async () => {
          const updatedSettings = await sloApi.updateSettings(
            { staleThresholdInHours: 72, staleInstancesCleanupEnabled: true },
            adminRoleAuthc
          );

          expect(updatedSettings).to.eql({
            staleThresholdInHours: 72,
            staleInstancesCleanupEnabled: true,
            useAllRemoteClusters: DEFAULT_SETTINGS.useAllRemoteClusters,
            selectedRemoteClusters: DEFAULT_SETTINGS.selectedRemoteClusters,
          });

          const retrievedSettings = await sloApi.getSettings(adminRoleAuthc);
          expect(retrievedSettings).to.eql({
            staleThresholdInHours: 72,
            staleInstancesCleanupEnabled: true,
            useAllRemoteClusters: DEFAULT_SETTINGS.useAllRemoteClusters,
            selectedRemoteClusters: DEFAULT_SETTINGS.selectedRemoteClusters,
          });
        });
      }

      if (!isServerless) {
        it('updates settings (non-serverless only)', async () => {
          const payload = {
            useAllRemoteClusters: true,
            selectedRemoteClusters: ['cluster-1', 'cluster-2'],
            staleThresholdInHours: 12,
            staleInstancesCleanupEnabled: true,
          };

          const updatedSettings = await sloApi.updateSettings(payload, adminRoleAuthc);
          expect(updatedSettings).to.eql({
            useAllRemoteClusters: true,
            selectedRemoteClusters: ['cluster-1', 'cluster-2'],
            staleThresholdInHours: 12,
            staleInstancesCleanupEnabled: true,
          });

          const retrievedSettings = await sloApi.getSettings(adminRoleAuthc);
          expect(retrievedSettings).to.eql({
            useAllRemoteClusters: true,
            selectedRemoteClusters: ['cluster-1', 'cluster-2'],
            staleThresholdInHours: 12,
            staleInstancesCleanupEnabled: true,
          });
        });
      }
    });
  });
}
