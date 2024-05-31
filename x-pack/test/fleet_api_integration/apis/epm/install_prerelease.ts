/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../api_integration/ftr_provider_context';
import { skipIfNoDockerRegistry, isDockerRegistryEnabledOrSkipped } from '../../helpers';
import { setupFleetAndAgents } from '../agents/services';

export default function (providerContext: FtrProviderContext) {
  const { getService } = providerContext;
  const supertest = getService('supertest');

  const testPackage = 'prerelease';
  const testPackageVersion = '0.1.0-dev.0+abc';

  const deletePackage = async (pkg: string, version: string) => {
    await supertest.delete(`/api/fleet/epm/packages/${pkg}/${version}`).set('kbn-xsrf', 'xxxx');
  };

  describe('installs package that has a prerelease version', async () => {
    skipIfNoDockerRegistry(providerContext);
    setupFleetAndAgents(providerContext);

    after(async () => {
      if (isDockerRegistryEnabledOrSkipped(providerContext)) {
        // remove the package just in case it being installed will affect other tests
        await deletePackage(testPackage, testPackageVersion);
      }
    });

    it('should install the package correctly', async function () {
      await supertest
        .post(`/api/fleet/epm/packages/${testPackage}/${testPackageVersion}`)
        .set('kbn-xsrf', 'xxxx')
        .send({ force: true })
        .expect(200);
    });

    const gaVersion = '1.0.0';
    const betaVersion = '1.0.1-next';

    afterEach(async () => {
      await deletePackage(testPackage, gaVersion);
      await deletePackage(testPackage, betaVersion);
    });

    it('should install the GA package correctly', async function () {
      const response = await supertest
        .post(`/api/fleet/epm/packages/${testPackage}/${gaVersion}`)
        .set('kbn-xsrf', 'xxxx')
        .send({ force: true })
        .expect(200);

      expect(response.body.items.find((item: any) => item.id.includes(gaVersion)));
    });

    it('should install the GA package when no version is provided', async function () {
      const response = await supertest
        .post(`/api/fleet/epm/packages/${testPackage}`)
        .set('kbn-xsrf', 'xxxx')
        .send({ force: true })
        .expect(200);

      expect(response.body.items.find((item: any) => item.id.includes(gaVersion)));
    });

    it('should install the beta package when prerelease is true', async function () {
      const response = await supertest
        .post(`/api/fleet/epm/packages/${testPackage}/${testPackageVersion}?prerelease=true`)
        .set('kbn-xsrf', 'xxxx')
        .send({ force: true }) // using force to ignore package verification error
        .expect(200);
      expect(response.body.items.find((item: any) => item.id.includes(betaVersion)));
    });

    it('should install the beta package when no version is provided and prerelease is true', async function () {
      const response = await supertest
        .post(`/api/fleet/epm/packages/${testPackage}/${testPackageVersion}?prerelease=true`)
        .set('kbn-xsrf', 'xxxx')
        .send({ force: true }) // using force to ignore package verification error
        .expect(200);
      expect(response.body.items.find((item: any) => item.id.includes(betaVersion)));
    });

    it('should bulk install the beta packages when prerelease is true', async function () {
      const response = await supertest
        .post(`/api/fleet/epm/packages/_bulk?prerelease=true`)
        .set('kbn-xsrf', 'xxxx')
        .send({ packages: ['prerelease'], force: true })
        .expect(200);

      expect(response.body.items[0].version).equal(betaVersion);
    });

    it('should bulk install the GA packages when prerelease is not set', async function () {
      const response = await supertest
        .post(`/api/fleet/epm/packages/_bulk`)
        .set('kbn-xsrf', 'xxxx')
        .send({ packages: ['prerelease'], force: true })
        .expect(200);

      expect(response.body.items[0].version).equal(gaVersion);
    });
  });
}
