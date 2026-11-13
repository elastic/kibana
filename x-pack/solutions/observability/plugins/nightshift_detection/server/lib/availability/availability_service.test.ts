/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { of } from 'rxjs';
import { coreMock } from '@kbn/core/server/mocks';
import { cloudMock } from '@kbn/cloud-plugin/server/mocks';
import { licensingMock } from '@kbn/licensing-plugin/server/mocks';
import { licenseMock } from '@kbn/licensing-plugin/common/licensing.mock';
import { AvailabilityService } from './availability_service';

interface IScenario {
  flagEnabled?: boolean;
  projectType?: 'observability' | 'security';
  tierAvailable?: boolean;
  hasEnterpriseLicense?: boolean;
  licenseActive?: boolean;
}

function createService({
  flagEnabled = true,
  projectType = 'observability',
  tierAvailable = true,
  hasEnterpriseLicense = true,
  licenseActive = true,
}: IScenario = {}) {
  const core = coreMock.createStart();
  core.featureFlags.getBooleanValue$.mockReturnValue(of(flagEnabled));
  core.pricing.isFeatureAvailable.mockReturnValue(tierAvailable);

  const license = licenseMock.createLicenseMock();
  license.isActive = licenseActive;
  license.hasAtLeast.mockReturnValue(hasEnterpriseLicense);
  const licensing = licensingMock.createStart();
  licensing.getLicense.mockResolvedValue(license);

  const cloud = cloudMock.createSetup();
  cloud.isServerlessEnabled = true;
  cloud.serverless.projectType = projectType;

  return {
    core,
    service: new AvailabilityService(core.featureFlags, core.pricing, licensing, cloud),
  };
}

describe('AvailabilityService', () => {
  describe('isAvailable', () => {
    it('is available when every requirement is met', async () => {
      const { service } = createService();

      await expect(service.isAvailable()).resolves.toBe(true);
      await expect(service.getUnavailableReason()).resolves.toBeUndefined();
    });

    it('is available on a classic deployment without cloud', async () => {
      const { core } = createService();
      const license = licenseMock.createLicenseMock();
      const licensing = licensingMock.createStart();
      licensing.getLicense.mockResolvedValue(license);
      const service = new AvailabilityService(
        core.featureFlags,
        core.pricing,
        licensing,
        undefined
      );

      await expect(service.isAvailable()).resolves.toBe(true);
    });
  });

  describe('getUnavailableReason', () => {
    it('reports the feature flag when Nightshift is off', async () => {
      const { service } = createService({ flagEnabled: false });

      await expect(service.isAvailable()).resolves.toBe(false);
      await expect(service.getUnavailableReason()).resolves.toBe('feature_flag');
    });

    it('reports the project type on a non-observability serverless project', async () => {
      const { service } = createService({ projectType: 'security' });

      await expect(service.getUnavailableReason()).resolves.toBe('project_type');
    });

    it('reports the pricing tier when the engine is not part of it', async () => {
      const { service } = createService({ tierAvailable: false });

      await expect(service.getUnavailableReason()).resolves.toBe('pricing_tier');
    });

    it('reports the license below enterprise', async () => {
      const { service } = createService({ hasEnterpriseLicense: false });

      await expect(service.getUnavailableReason()).resolves.toBe('license');
    });

    it('reports the license when an Enterprise license has expired', async () => {
      const { service } = createService({ licenseActive: false });

      await expect(service.getUnavailableReason()).resolves.toBe('license');
    });
  });
});
