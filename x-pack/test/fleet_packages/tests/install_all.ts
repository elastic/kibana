/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../../api_integration/ftr_provider_context';

export default function (providerContext: FtrProviderContext) {
  const { getService } = providerContext;
  const supertest = getService('supertest');
  const logger = getService('log');

  function installPackage(
    name: string,
    version: string
  ): Promise<{ name: string; version: string; success: boolean; error?: any; took?: number }> {
    const start = Date.now();
    return supertest
      .post(`/api/fleet/epm/packages/${name}/${version}`)
      .set('kbn-xsrf', 'xxx')
      .send({ force: true })
      .expect(200)
      .then(() => {
        const end = Date.now();
        return { name, version, success: true, took: (end - start) / 1000 };
      })
      .catch((error) => {
        return { name, version, success: false, error };
      });
  }

  async function deletePackage(
    name: string,
    version: string
  ): Promise<{ name: string; success: boolean; error?: any }> {
    return supertest
      .delete(`/api/fleet/epm/packages/${name}/${version}`)
      .set('kbn-xsrf', 'xxx')
      .expect(200)
      .then(() => {
        return { name, success: true };
      })
      .catch((error) => {
        return { name, success: false, error };
      });
  }

  describe('install all fleet packages', function () {
    this.timeout(1000 * 60 * 60); // 1 hour
    it('should work and install all packages', async () => {
      const {
        body: { items: packages },
      } = await supertest.get('/api/fleet/epm/packages?prerelease=true').expect(200);
      const allResults = [];
      for (const pkg of packages) {
        // skip deprecated failing package https://github.com/elastic/integrations/issues/4947
        if (pkg.name === 'zscaler') continue;
        const res = await installPackage(pkg.name, pkg.version);
        allResults.push(res);
        if (res.success) {
          await deletePackage(pkg.name, pkg.version);
        }
      }
      const succeededInstall = allResults
        .filter((res) => res.success === true)
        .sort((a, b) => (b.took ?? 0) - (a.took ?? 0));
      succeededInstall.forEach((res) => {
        const pkgName = `${res.name}@${res.version}`;
        if (!res.success) {
          logger.info(`❌ ${pkgName} failed: ${res?.error?.message}`);
        } else {
          logger.info(`✅ ${pkgName} took ${res.took}s`);
        }
      });
      const failedInstall = allResults.filter((res) => res.success === false);
      if (failedInstall.length) {
        throw new Error(
          `Some package install failed: ${failedInstall
            .map((res) => `${res.name}@${res.version}`)
            .join(', ')}`
        );
      }
    });
  });
}
