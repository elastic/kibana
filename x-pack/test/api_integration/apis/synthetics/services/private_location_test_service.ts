/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { privateLocationsSavedObjectName } from '@kbn/synthetics-plugin/common/saved_objects/private_locations';
import { privateLocationsSavedObjectId } from '@kbn/synthetics-plugin/server/legacy_uptime/lib/saved_objects/private_locations';
import { FtrProviderContext } from '../../../ftr_provider_context';
import { KibanaSupertestProvider } from '../../../../../../test/api_integration/services/supertest';

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
      .get('/api/fleet/epm/packages/synthetics/1.0.1')
      .set('kbn-xsrf', 'true')
      .expect(200);
    if (response.body.item.status !== 'installed') {
      await this.supertest
        .post('/api/fleet/epm/packages/synthetics/1.0.1')
        .set('kbn-xsrf', 'true')
        .send({ force: true })
        .expect(200);
    }
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

    await server.savedObjects.create({
      type: privateLocationsSavedObjectName,
      id: privateLocationsSavedObjectId,
      attributes: {
        locations: testFleetPolicyIds.map((id, index) => ({
          label: 'Test private location ' + index,
          agentPolicyId: id,
          id,
          geo: {
            lat: '',
            lon: '',
          },
          concurrentMonitors: 1,
        })),
      },
      overwrite: true,
    });
  }
}
