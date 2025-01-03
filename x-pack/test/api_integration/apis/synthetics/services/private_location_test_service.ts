/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import expect from '@kbn/expect';
import { PrivateLocation } from '@kbn/synthetics-plugin/common/runtime_types';
import { KibanaSupertestProvider } from '@kbn/ftr-common-functional-services';
import { SYNTHETICS_API_URLS } from '@kbn/synthetics-plugin/common/constants';
import {
  legacyPrivateLocationsSavedObjectId,
  legacyPrivateLocationsSavedObjectName,
} from '@kbn/synthetics-plugin/common/saved_objects/private_locations';
import { FtrProviderContext } from '../../../ftr_provider_context';

export const INSTALLED_VERSION = '1.1.1';

export class PrivateLocationTestService {
  private supertest: ReturnType<typeof KibanaSupertestProvider>;
  private readonly getService: FtrProviderContext['getService'];

  constructor(getService: FtrProviderContext['getService']) {
    this.supertest = getService('supertest');
    this.getService = getService;
  }

  async installSyntheticsPackage() {
    await this.supertest.post('/api/fleet/setup').set('kbn-xsrf', 'true').send().expect(200);
    const response = await this.supertest
      .get(`/api/fleet/epm/packages/synthetics/${INSTALLED_VERSION}`)
      .set('kbn-xsrf', 'true')
      .expect(200);
    if (response.body.item.status !== 'installed') {
      await this.supertest
        .post(`/api/fleet/epm/packages/synthetics/${INSTALLED_VERSION}`)
        .set('kbn-xsrf', 'true')
        .send({ force: true })
        .expect(200);
    }
  }

  async addFleetPolicy(name?: string) {
    return this.supertest
      .post('/api/fleet/agent_policies?sys_monitoring=true')
      .set('kbn-xsrf', 'true')
      .send({
        name: name ?? 'Fleet test server policy' + Date.now(),
        description: '',
        namespace: 'default',
        monitoring_enabled: [],
      })
      .expect(200);
  }

  async addPrivateLocation({ policyId, label }: { policyId?: string; label?: string } = {}) {
    let agentPolicyId = policyId;

    if (!agentPolicyId) {
      const apiResponse = await this.addFleetPolicy();
      agentPolicyId = apiResponse.body.item.id;
    }

    const location: Omit<PrivateLocation, 'id'> = {
      label: label ?? 'Test private location 0',
      agentPolicyId: agentPolicyId!,
      geo: {
        lat: 0,
        lon: 0,
      },
    };

    const response = await this.supertest
      .post(SYNTHETICS_API_URLS.PRIVATE_LOCATIONS)
      .set('kbn-xsrf', 'true')
      .send(location);

    expect(response.status).to.be(200);

    const { isInvalid, ...loc } = response.body;

    return loc;
  }

  async addLegacyPrivateLocations() {
    const server = this.getService('kibanaServer');
    const fleetPolicy = await this.addFleetPolicy();
    const fleetPolicy2 = await this.addFleetPolicy();

    const locs = [
      {
        id: fleetPolicy.body.item.id,
        agentPolicyId: fleetPolicy.body.item.id,
        name: 'Test private location 1',
        lat: 0,
        lon: 0,
      },
      {
        id: fleetPolicy2.body.item.id,
        agentPolicyId: fleetPolicy2.body.item.id,
        name: 'Test private location 2',
        lat: 0,
        lon: 0,
      },
    ];

    await server.savedObjects.create({
      type: legacyPrivateLocationsSavedObjectName,
      id: legacyPrivateLocationsSavedObjectId,
      attributes: {
        locations: locs,
      },
      overwrite: true,
    });
    return locs;
  }

  async fetchAll() {
    return this.supertest
      .get(SYNTHETICS_API_URLS.PRIVATE_LOCATIONS)
      .set('kbn-xsrf', 'true')
      .expect(200);
  }
}
