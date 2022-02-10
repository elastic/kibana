/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../api_integration/ftr_provider_context';
import { skipIfNoDockerRegistry } from '../../helpers';
import {
  BulkInstallPackageInfo,
  BulkInstallPackagesResponse,
  IBulkInstallPackageHTTPError,
} from '../../../../plugins/fleet/common';
import { setupFleetAndAgents } from '../agents/services';
import { testUsers } from '../test_users';

export default function (providerContext: FtrProviderContext) {
  const { getService } = providerContext;
  const supertest = getService('supertest');
  const supertestWithoutAuth = getService('supertestWithoutAuth');

  const deletePackage = async (name: string, version: string) => {
    await supertest.delete(`/api/fleet/epm/packages/${name}/${version}`).set('kbn-xsrf', 'xxxx');
  };

  describe('bulk package upgrade api', async () => {
    skipIfNoDockerRegistry(providerContext);
    setupFleetAndAgents(providerContext);

    describe('bulk package upgrade with a package already installed', async () => {
      beforeEach(async () => {
        await supertest
          .post(`/api/fleet/epm/packages/multiple_versions/0.1.0`)
          .set('kbn-xsrf', 'xxxx')
          .send({ force: true })
          .expect(200);
      });
      afterEach(async () => {
        await deletePackage('multiple_versions', '0.1.0');
        await deletePackage('multiple_versions', '0.3.0');
        await deletePackage('overrides', '0.1.0');
      });

      it('should return 400 if no packages are requested for upgrade', async function () {
        await supertest.post(`/api/fleet/epm/packages/_bulk`).set('kbn-xsrf', 'xxxx').expect(400);
      });
      it('should return 403 if user without integrations all requests upgrade', async function () {
        await supertestWithoutAuth
          .post(`/api/fleet/epm/packages/_bulk`)
          .auth(testUsers.fleet_all_int_read.username, testUsers.fleet_all_int_read.password)
          .set('kbn-xsrf', 'xxxx')
          .expect(403);
      });
      it('should return 403 if user without fleet access requests upgrade', async function () {
        await supertestWithoutAuth
          .post(`/api/fleet/epm/packages/_bulk`)
          .auth(testUsers.integr_all_only.username, testUsers.integr_all_only.password)
          .set('kbn-xsrf', 'xxxx')
          .expect(403);
      });
      it('should return 200 and an array for upgrading a package', async function () {
        const { body }: { body: BulkInstallPackagesResponse } = await supertest
          .post(`/api/fleet/epm/packages/_bulk`)
          .set('kbn-xsrf', 'xxxx')
          .send({ packages: ['multiple_versions'] })
          .expect(200);
        expect(body.items.length).equal(1);
        expect(body.items[0].name).equal('multiple_versions');
        const entry = body.items[0] as BulkInstallPackageInfo;
        expect(entry.version).equal('0.3.0');
      });
      it('should return an error for packages that do not exist', async function () {
        const { body }: { body: BulkInstallPackagesResponse } = await supertest
          .post(`/api/fleet/epm/packages/_bulk`)
          .set('kbn-xsrf', 'xxxx')
          .send({ packages: ['multiple_versions', 'blahblah'] })
          .expect(200);
        expect(body.items.length).equal(2);
        expect(body.items[0].name).equal('multiple_versions');
        const entry = body.items[0] as BulkInstallPackageInfo;
        expect(entry.version).equal('0.3.0');

        const err = body.items[1] as IBulkInstallPackageHTTPError;
        expect(err.statusCode).equal(404);
        expect(body.items[1].name).equal('blahblah');
      });
      it('should upgrade multiple packages', async function () {
        const { body }: { body: BulkInstallPackagesResponse } = await supertest
          .post(`/api/fleet/epm/packages/_bulk`)
          .set('kbn-xsrf', 'xxxx')
          .send({ packages: ['multiple_versions', 'overrides'] })
          .expect(200);
        expect(body.items.length).equal(2);
        expect(body.items[0].name).equal('multiple_versions');
        let entry = body.items[0] as BulkInstallPackageInfo;
        expect(entry.version).equal('0.3.0');

        entry = body.items[1] as BulkInstallPackageInfo;
        expect(entry.version).equal('0.1.0');
        expect(entry.name).equal('overrides');
      });
    });

    describe('bulk upgrade without package already installed', async () => {
      afterEach(async () => {
        await deletePackage('multiple_versions', '0.3.0');
      });

      it('should return 200 and an array for upgrading a package', async function () {
        const { body }: { body: BulkInstallPackagesResponse } = await supertest
          .post(`/api/fleet/epm/packages/_bulk`)
          .set('kbn-xsrf', 'xxxx')
          .send({ packages: ['multiple_versions'] })
          .expect(200);
        expect(body.items.length).equal(1);
        expect(body.items[0].name).equal('multiple_versions');
        const entry = body.items[0] as BulkInstallPackageInfo;
        expect(entry.version).equal('0.3.0');
      });
    });
  });
}
