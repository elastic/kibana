/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { Client } from '@elastic/elasticsearch';
import expect from '@kbn/expect';
import { INGEST_SAVED_OBJECT_INDEX } from '@kbn/core-saved-objects-server';
import { Installation } from '@kbn/fleet-plugin/server/types';
import { FtrProviderContext } from '../../../api_integration/ftr_provider_context';
import { skipIfNoDockerRegistry, isDockerRegistryEnabledOrSkipped } from '../../helpers';
import { setupFleetAndAgents } from '../agents/services';

const TEST_KEY_ID = 'd2a182a7b0e00c14';
export default function (providerContext: FtrProviderContext) {
  const { getService } = providerContext;
  const es: Client = getService('es');
  const supertest = getService('supertest');

  const uninstallPackage = async (pkg: string, version: string) => {
    await supertest.delete(`/api/fleet/epm/packages/${pkg}/${version}`).set('kbn-xsrf', 'xxxx');
  };
  const installPackage = (pkg: string, version: string, opts?: { force?: boolean }) => {
    return supertest
      .post(`/api/fleet/epm/packages/${pkg}/${version}`)
      .set('kbn-xsrf', 'xxxx')
      .send({ force: !!opts?.force });
  };

  const getInstallationSavedObject = async (pkg: string): Promise<Installation | undefined> => {
    const res: { _source?: { 'epm-packages': Installation } } = await es.transport.request({
      method: 'GET',
      path: `/${INGEST_SAVED_OBJECT_INDEX}/_doc/epm-packages:${pkg}`,
    });

    return res?._source?.['epm-packages'] as Installation;
  };

  describe('Installs verified and unverified packages', async () => {
    skipIfNoDockerRegistry(providerContext);
    setupFleetAndAgents(providerContext);

    describe('verified package', async () => {
      after(async () => {
        if (!isDockerRegistryEnabledOrSkipped(providerContext)) return;
        await uninstallPackage('verified', '1.0.0');
      });
      it('should install a package with a valid signature', async () => {
        await installPackage('verified', '1.0.0').expect(200);
        const installationSO = await getInstallationSavedObject('verified');
        expect(installationSO?.verification_status).equal('verified');
        expect(installationSO?.verification_key_id).equal(TEST_KEY_ID);
      });
    });
    describe('unverified packages', async () => {
      describe('unverified package content', async () => {
        after(async () => {
          if (!isDockerRegistryEnabledOrSkipped(providerContext)) return;
          await uninstallPackage('unverified_content', '1.0.0');
        });
        it('should return 400 for valid signature but incorrect content', async () => {
          const res = await installPackage('unverified_content', '1.0.0');

          expect(res.status).equal(400);
          expect(res.body.attributes).eql({
            type: 'verification_failed',
          });
        });
        it('should return 200 for valid signature but incorrect content force install', async () => {
          await installPackage('unverified_content', '1.0.0', { force: true }).expect(200);
          const installationSO = await getInstallationSavedObject('unverified_content');
          expect(installationSO?.verification_status).equal('unverified');
          expect(installationSO?.verification_key_id).equal(TEST_KEY_ID);
        });
      });
      describe('package verified with wrong key', async () => {
        after(async () => {
          if (!isDockerRegistryEnabledOrSkipped(providerContext)) return;
          await uninstallPackage('wrong_key', '1.0.0');
        });
        it('should return 400 for valid signature but incorrect key', async () => {
          const res = await installPackage('wrong_key', '1.0.0');
          expect(res.status).equal(400);
          expect(res.body.attributes).eql({
            type: 'verification_failed',
          });
        });
        it('should return 200 for valid signature but incorrect key force install', async () => {
          await installPackage('wrong_key', '1.0.0', { force: true }).expect(200);
          const installationSO = await getInstallationSavedObject('wrong_key');
          expect(installationSO?.verification_status).equal('unverified');
          expect(installationSO?.verification_key_id).equal(TEST_KEY_ID);
        });
      });
    });
  });
}
