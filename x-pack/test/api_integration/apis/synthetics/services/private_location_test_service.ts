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
  private supertestAPI: ReturnType<typeof KibanaSupertestProvider>;
  private readonly getService: FtrProviderContext['getService'];

  constructor(getService: FtrProviderContext['getService']) {
    this.supertestAPI = getService('supertest');
    this.getService = getService;
  }
  async addFleetPolicy(name: string) {
    return this.supertestAPI
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
