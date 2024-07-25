/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { v4 as uuidv4 } from 'uuid';
import { privateLocationsSavedObjectName } from '@kbn/synthetics-plugin/common/saved_objects/private_locations';
import { privateLocationsSavedObjectId } from '@kbn/synthetics-plugin/server/saved_objects/private_locations';
import { SyntheticsPrivateLocations } from '@kbn/synthetics-plugin/common/runtime_types';
import { KibanaSupertestProvider } from '@kbn/test-suites-src/api_integration/services/supertest';
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

  async addTestPrivateLocation() {
    const apiResponse = await this.addFleetPolicy(uuidv4());
    const testPolicyId = apiResponse.body.item.id;
    return (await this.setTestLocations([testPolicyId]))[0];
  }

  async addFleetPolicy(name: string) {
    return this.supertest
      .post('/api/fleet/agent_policies?sys_monitoring=true')
      .set('kbn-xsrf', 'true')
      .send({
        name,
        description: '',
        namespace: 'default',
        monitoring_enabled: [],
      })
      .expect(200);
  }

  async setTestLocations(testFleetPolicyIds: string[]) {
    const server = this.getService('kibanaServer');

    const locations: SyntheticsPrivateLocations = testFleetPolicyIds.map((id, index) => ({
      label: 'Test private location ' + index,
      agentPolicyId: id,
      id,
      geo: {
        lat: 0,
        lon: 0,
      },
      isServiceManaged: false,
    }));

    await server.savedObjects.create({
      type: privateLocationsSavedObjectName,
      id: privateLocationsSavedObjectId,
      attributes: {
        locations,
      },
      overwrite: true,
    });
    return locations;
  }
}
