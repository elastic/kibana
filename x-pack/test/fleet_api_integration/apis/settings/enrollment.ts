/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../api_integration/ftr_provider_context';
import { skipIfNoDockerRegistry } from '../../helpers';

export default function (providerContext: FtrProviderContext) {
  const { getService } = providerContext;
  const supertest = getService('supertest');
  const esArchiver = getService('esArchiver');
  const fleetAndAgents = getService('fleetAndAgents');

  describe('Enrollment settings - get', function () {
    skipIfNoDockerRegistry(providerContext);

    before(async () => {
      await fleetAndAgents.setup();
    });

    it('should respond with empty enrollment settings on empty cluster', async function () {
      const response = await supertest
        .get(`/internal/fleet/settings/enrollment`)
        .set('kbn-xsrf', 'xxxx')
        .expect(200);

      expect(response.body).to.eql({
        fleet_server: {
          policies: [],
          has_active: false,
        },
        download_source: {
          id: 'fleet-default-download-source',
          name: 'Elastic Artifacts',
          is_default: true,
          host: 'https://artifacts.elastic.co/downloads/',
        },
      });
    });

    describe('should respond with correct enrollment settings', function () {
      before(async () => {
        await esArchiver.load('x-pack/test/functional/es_archives/fleet/fleet_server');
        // package verification error without force
        await supertest
          .post(`/api/fleet/epm/packages/fleet_server`)
          .set('kbn-xsrf', 'xxxx')
          .send({ force: true })
          .expect(200);
      });
      after(async () => {
        await esArchiver.unload('x-pack/test/functional/es_archives/fleet/fleet_server');
      });

      it('when there are multiple fleet server policies and an active host', async function () {
        const response = await supertest
          .get(`/internal/fleet/settings/enrollment`)
          .set('kbn-xsrf', 'xxxx')
          .expect(200);

        expect(response.body).to.eql({
          fleet_server: {
            policies: [
              {
                id: 'fleet-server-policy',
                is_default_fleet_server: true,
                is_managed: false,
                name: 'Fleet Server Policy',
                space_ids: [],
              },
              {
                id: 'fleet-server-policy-2',
                is_default_fleet_server: false,
                is_managed: false,
                name: 'Fleet Server Policy 2',
                space_ids: [],
              },
            ],
            has_active: true,
            host: {
              id: 'test-default-123',
              name: 'Default',
              is_default: true,
              is_preconfigured: false,
              host_urls: ['https://test.fr:8080', 'https://test.fr:8081'],
              proxy_id: 'my-proxy',
            },
            host_proxy: {
              id: 'my-proxy',
              name: 'my proxy',
              url: 'https://my-proxy',
              certificate: '',
              certificate_authorities: '',
              certificate_key: '',
              is_preconfigured: false,
            },
          },
          download_source: {
            id: 'fleet-default-download-source',
            name: 'Elastic Artifacts',
            is_default: true,
            host: 'https://artifacts.elastic.co/downloads/',
          },
        });
      });

      it('when a fleet server policy is scoped', async function () {
        const response = await supertest
          .get(`/internal/fleet/settings/enrollment?agentPolicyId=fleet-server-policy-2`)
          .set('kbn-xsrf', 'xxxx')
          .expect(200);

        expect(response.body).to.eql({
          fleet_server: {
            policies: [
              {
                id: 'fleet-server-policy-2',
                is_default_fleet_server: false,
                is_managed: false,
                name: 'Fleet Server Policy 2',
                space_ids: [],
              },
            ],
            has_active: true,
            host: {
              id: 'test-default-123',
              name: 'Default',
              is_default: true,
              is_preconfigured: false,
              host_urls: ['https://test.fr:8080', 'https://test.fr:8081'],
              proxy_id: 'my-proxy',
            },
            host_proxy: {
              id: 'my-proxy',
              name: 'my proxy',
              url: 'https://my-proxy',
              certificate: '',
              certificate_authorities: '',
              certificate_key: '',
              is_preconfigured: false,
            },
          },
          download_source: {
            id: 'fleet-default-download-source',
            name: 'Elastic Artifacts',
            is_default: true,
            host: 'https://artifacts.elastic.co/downloads/',
          },
        });
      });

      it('when a normal agent policy is scoped', async function () {
        const response = await supertest
          .get(`/internal/fleet/settings/enrollment?agentPolicyId=policy1`)
          .set('kbn-xsrf', 'xxxx')
          .expect(200);

        expect(response.body).to.eql({
          fleet_server: {
            policies: [],
            has_active: false,
            host: {
              id: 'second-host',
              name: 'Second host',
              is_default: false,
              is_preconfigured: false,
              host_urls: ['https://second-host:8080'],
            },
          },
          download_source: {
            id: 'new-source',
            name: 'new source',
            is_default: false,
            host: 'https://localhost:2222',
            proxy_id: 'my-proxy',
          },
        });
      });
    });
  });
}
