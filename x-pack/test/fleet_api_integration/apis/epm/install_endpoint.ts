/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../api_integration/ftr_provider_context';
import { skipIfNoDockerRegistry } from '../../helpers';
import { setupFleetAndAgents } from '../agents/services';

export default function (providerContext: FtrProviderContext) {
  /**
   * There are a few features that are only currently supported for the Endpoint
   * package due to security concerns.
   */
  describe('Install endpoint package', () => {
    const { getService } = providerContext;
    skipIfNoDockerRegistry(providerContext);
    setupFleetAndAgents(providerContext);

    const supertest = getService('supertest');
    const dockerServers = getService('dockerServers');
    const server = dockerServers.get('registry');
    const es = getService('es');
    const pkgName = 'endpoint';
    let pkgVersion: string;

    const transforms = [
      {
        id: 'endpoint.metadata_current-default',
        dest: 'metrics-endpoint.metadata_current_default',
      },
      {
        id: 'endpoint.metadata_united-default',
        dest: '.metrics-endpoint.metadata_united_default',
      },
    ];

    before(async () => {
      if (!server.enabled) return;
      // The latest endpoint package is already installed by default in our FTR config,
      // just get the most recent version number.
      const getResp = await supertest.get(`/api/fleet/epm/packages/${pkgName}`).expect(200);
      pkgVersion = getResp.body.response.version;
    });

    describe('install', () => {
      transforms.forEach((transform) => {
        it(`should have installed the [${transform.id}] transform`, async function () {
          const res = await es.transport.request(
            {
              method: 'GET',
              path: `/_transform/${transform.id}-${pkgVersion}`,
            },
            { meta: true }
          );
          expect(res.statusCode).equal(200);
        });
        it(`should have created the destination index for the [${transform.id}] transform`, async function () {
          // the  index is defined in the transform file
          const res = await es.transport.request(
            {
              method: 'GET',
              path: `/${transform.dest}`,
            },
            { meta: true }
          );
          expect(res.statusCode).equal(200);
        });
      });
    });

    const uninstallPackage = async (pkg: string, version: string) =>
      supertest.delete(`/api/fleet/epm/packages/${pkg}/${version}`).set('kbn-xsrf', 'xxxx');

    // Endpoint doesn't currently support uninstalls
    describe.skip('uninstall', () => {
      before(async () => {
        await uninstallPackage(pkgName, pkgVersion);
      });

      transforms.forEach((transform) => {
        it(`should have uninstalled the [${transform.id}] transforms`, async function () {
          const res = await es.transport.request(
            {
              method: 'GET',
              path: `/_transform/${transform.id}`,
            },
            { meta: true, ignore: [404] }
          );
          expect(res.statusCode).equal(404);
        });

        it(`should have deleted the index for the [${transform.id}] transform`, async function () {
          // the  index is defined in the transform file
          const res = await es.transport.request(
            {
              method: 'GET',
              path: `/${transform.dest}`,
            },
            {
              meta: true,
              ignore: [404],
            }
          );
          expect(res.statusCode).equal(404);
        });
      });
    });
  });
}
