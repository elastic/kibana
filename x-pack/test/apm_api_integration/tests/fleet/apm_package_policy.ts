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
  const apmApiClient = getService('apmApiClient');

  async function createApmPackagePolicy() {
    return apmApiClient.superuser({
      endpoint: 'POST /internal/apm/fleet/cloud_apm_package_policy',
    });
  }

  registry.when('APM package policy', { config: 'basic', archives: [] }, () => {
    before(async () => {
      await createApmPackagePolicy();
    });

    describe('pagination', () => {
      it('can retrieve the first page', async () => {
        expect(true).to.be(true);
      });
    });
  });
}
