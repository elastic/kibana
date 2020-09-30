/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import expect from '@kbn/expect';
import { FtrProviderContext } from '../services';
import {
  LicensingPluginSetup,
  LicensingPluginStart,
  LicenseType,
} from '../../../plugins/licensing/public';
import '../../../../test/plugin_functional/plugins/core_provider_plugin/types';

interface FeatureUsage {
  last_used?: number;
  license_level: LicenseType;
  name: string;
}

// eslint-disable-next-line import/no-default-export
export default function (ftrContext: FtrProviderContext) {
  const { getService, getPageObjects } = ftrContext;
  const supertest = getService('supertest');
  const browser = getService('browser');
  const PageObjects = getPageObjects(['common', 'security']);

  const registerFeature = async (featureName: string, licenseType: LicenseType) => {
    await browser.executeAsync(
      async (feature, type, cb) => {
        const { setup } = window._coreProvider;
        const licensing: LicensingPluginSetup = setup.plugins.licensing;
        await licensing.featureUsage.register(feature, type);
        cb();
      },
      featureName,
      licenseType
    );
  };

  const notifyFeatureUsage = async (featureName: string, lastUsed: number) => {
    await browser.executeAsync(
      async (feature, time, cb) => {
        const { start } = window._coreProvider;
        const licensing: LicensingPluginStart = start.plugins.licensing;
        await licensing.featureUsage.notifyUsage(feature, time);
        cb();
      },
      featureName,
      lastUsed
    );
  };

  describe('feature_usage API', () => {
    before(async () => {
      await PageObjects.security.login();
    });

    it('allows to register features to the server', async () => {
      await registerFeature('test-client-A', 'gold');
      await registerFeature('test-client-B', 'enterprise');

      const response = await supertest.get('/api/licensing/feature_usage').expect(200);
      const features = response.body.features.map(({ name }: FeatureUsage) => name);

      expect(features).to.contain('test-client-A');
      expect(features).to.contain('test-client-B');
    });

    it('allows to notify feature usage', async () => {
      const now = new Date();

      await notifyFeatureUsage('test-client-A', now.getTime());

      const response = await supertest.get('/api/licensing/feature_usage').expect(200);
      const features = response.body.features as FeatureUsage[];

      expect(features.find((f) => f.name === 'test-client-A')?.last_used).to.be(now.toISOString());
      expect(features.find((f) => f.name === 'test-client-B')?.last_used).to.be(null);
    });
  });
}
