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
  const { getService } = providerContext;
  const supertest = getService('supertest');
  const esArchiver = getService('esArchiver');

  describe('fleet_output_crud', async function () {
    skipIfNoDockerRegistry(providerContext);
    before(async () => {
      await esArchiver.load('x-pack/test/functional/es_archives/fleet/empty_fleet_server');
    });
    setupFleetAndAgents(providerContext);

    let defaultOutputId: string;

    before(async function () {
      const { body: getOutputsRes } = await supertest.get(`/api/fleet/outputs`).expect(200);

      const defaultOutput = getOutputsRes.items.find((item: any) => item.is_default);
      if (!defaultOutput) {
        throw new Error('default output not set');
      }

      defaultOutputId = defaultOutput.id;
    });

    after(async () => {
      await esArchiver.unload('x-pack/test/functional/es_archives/fleet/empty_fleet_server');
    });

    it('GET /outputs should list the default output', async () => {
      const { body: getOutputsRes } = await supertest.get(`/api/fleet/outputs`).expect(200);

      expect(getOutputsRes.items.length).to.eql(1);
    });

    it('GET /outputs/{defaultOutputId} should return the default output', async () => {
      const { body: getOutputRes } = await supertest
        .get(`/api/fleet/outputs/${defaultOutputId}`)
        .expect(200);

      expect(getOutputRes.item).to.have.keys('id', 'name', 'type', 'is_default', 'hosts');
    });

    it('PUT /output/{defaultOutputId} should explicitly set port on ES hosts', async function () {
      await supertest
        .put(`/api/fleet/outputs/${defaultOutputId}`)
        .set('kbn-xsrf', 'xxxx')
        .send({ hosts: ['https://test.fr'] })
        .expect(200);

      const { body: getSettingsRes } = await supertest
        .get(`/api/fleet/outputs/${defaultOutputId}`)
        .expect(200);
      expect(getSettingsRes.item.hosts).to.eql(['https://test.fr:443']);
    });
  });
}
