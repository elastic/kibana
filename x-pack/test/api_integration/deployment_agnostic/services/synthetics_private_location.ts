/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { v4 as uuidv4 } from 'uuid';
import { RetryService } from '@kbn/ftr-common-functional-services';
import { X_ELASTIC_INTERNAL_ORIGIN_REQUEST } from '@kbn/core-http-common';
import { privateLocationSavedObjectName } from '@kbn/synthetics-plugin/common/saved_objects/private_locations';
import { SyntheticsPrivateLocations } from '@kbn/synthetics-plugin/common/runtime_types';
import { KibanaSupertestProvider } from '@kbn/ftr-common-functional-services';
import { DeploymentAgnosticFtrProviderContext } from '../ftr_provider_context';

export const INSTALLED_VERSION = '1.1.1';

export class PrivateLocationTestService {
  private supertestWithAuth: ReturnType<typeof KibanaSupertestProvider>;
  private readonly retry: RetryService;

  constructor(getService: DeploymentAgnosticFtrProviderContext['getService']) {
    this.supertestWithAuth = getService('supertest');
    this.retry = getService('retry');
  }

  async installSyntheticsPackage() {
    await this.supertestWithAuth
      .post('/api/fleet/setup')
      .set('kbn-xsrf', 'true')
      .send()
      .expect(200);
    const response = await this.supertestWithAuth
      .get(`/api/fleet/epm/packages/synthetics/${INSTALLED_VERSION}`)
      .set('kbn-xsrf', 'true')
      .expect(200);
    if (response.body.item.status !== 'installed') {
      await this.supertestWithAuth
        .post(`/api/fleet/epm/packages/synthetics/${INSTALLED_VERSION}`)
        .set('kbn-xsrf', 'true')
        .send({ force: true })
        .expect(200);
    }
  }

  async addTestPrivateLocation(spaceId?: string) {
    const apiResponse = await this.addFleetPolicy(uuidv4());
    const testPolicyId = apiResponse.body.item.id;
    return (await this.setTestLocations([testPolicyId], spaceId))[0];
  }

  async addFleetPolicy(name: string) {
    return await this.retry.try(async () => {
      const response = await this.supertestWithAuth
        .post('/api/fleet/agent_policies?sys_monitoring=true')
        .set('kbn-xsrf', 'true')
        .send({
          name,
          description: '',
          namespace: 'default',
          monitoring_enabled: [],
        });
      return response;
    });
  }

  async setTestLocations(testFleetPolicyIds: string[], spaceId?: string) {
    const locations: SyntheticsPrivateLocations = testFleetPolicyIds.map((id, index) => ({
      label: `Test private location ${id}`,
      agentPolicyId: id,
      id,
      geo: {
        lat: 0,
        lon: 0,
      },
      isServiceManaged: false,
    }));

    await this.supertestWithAuth
      .post(`/s/${spaceId || 'default'}/api/saved_objects/_bulk_create`)
      .set(X_ELASTIC_INTERNAL_ORIGIN_REQUEST, 'kibana')
      .set('kbn-xsrf', 'true')
      .send(
        locations.map((location) => ({
          type: privateLocationSavedObjectName,
          id: location.id,
          attributes: location,
          initialNamespaces: [spaceId ? spaceId : 'default'],
        }))
      )
      .expect(200);

    return locations;
  }
}
