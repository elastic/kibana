/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../../../api_integration/ftr_provider_context';
import { skipIfNoDockerRegistry } from '../../helpers';

export default function (providerContext: FtrProviderContext) {
  const { getService } = providerContext;
  const supertest = getService('supertest');
  const requiredPackage = 'system-0.13.3';

  const installPackage = async (pkgkey: string) => {
    await supertest
      .post(`/api/fleet/epm/packages/${pkgkey}`)
      .set('kbn-xsrf', 'xxxx')
      .send({ force: true });
  };

  const deletePackage = async (pkgkey: string) => {
    await supertest
      .delete(`/api/fleet/epm/packages/${pkgkey}`)
      .set('kbn-xsrf', 'xxxx')
      .send({ force: true });
  };

  describe('delete and force delete scenarios', async () => {
    skipIfNoDockerRegistry(providerContext);
    before(async () => {
      await installPackage(requiredPackage);
    });
    after(async () => {
      await deletePackage(requiredPackage);
    });

    it('should return 400 if trying to uninstall a required package', async function () {
      await supertest
        .delete(`/api/fleet/epm/packages/${requiredPackage}`)
        .set('kbn-xsrf', 'xxxx')
        .expect(400);
    });

    it('should return 200 if trying to force uninstall a required package', async function () {
      await supertest
        .delete(`/api/fleet/epm/packages/${requiredPackage}`)
        .set('kbn-xsrf', 'xxxx')
        .send({ force: true })
        .expect(200);
    });
  });
}
