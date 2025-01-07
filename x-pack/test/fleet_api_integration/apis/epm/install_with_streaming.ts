/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { Client } from '@elastic/elasticsearch';
import { INGEST_SAVED_OBJECT_INDEX } from '@kbn/core-saved-objects-server';
import { Installation } from '@kbn/fleet-plugin/server/types';
import expect from 'expect';
import { FtrProviderContext } from '../../../api_integration/ftr_provider_context';
import { skipIfNoDockerRegistry, isDockerRegistryEnabledOrSkipped } from '../../helpers';

export default function (providerContext: FtrProviderContext) {
  const { getService } = providerContext;
  const es: Client = getService('es');
  const supertest = getService('supertest');
  const fleetAndAgents = getService('fleetAndAgents');

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

  describe('Installs a package using stream-based approach', () => {
    skipIfNoDockerRegistry(providerContext);

    before(async () => {
      await fleetAndAgents.setup();
    });

    describe('security_detection_engine package', () => {
      after(async () => {
        if (!isDockerRegistryEnabledOrSkipped(providerContext)) return;
        await uninstallPackage('security_detection_engine', '8.16.0');
      });
      it('should install security-rule assets from the package', async () => {
        // Force install to install an outdatded version
        await installPackage('security_detection_engine', '8.16.0', { force: true }).expect(200);
        const installationSO = await getInstallationSavedObject('security_detection_engine');
        expect(installationSO?.installed_kibana).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              id: expect.any(String),
              type: 'security-rule',
            }),
          ])
        );
      });
    });
  });
}
