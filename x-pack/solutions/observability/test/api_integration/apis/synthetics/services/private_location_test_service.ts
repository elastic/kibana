/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import expect from '@kbn/expect';
import type { PrivateLocation } from '@kbn/synthetics-plugin/common/runtime_types';
import type { KibanaSupertestProvider } from '@kbn/ftr-common-functional-services';
import { SYNTHETICS_API_URLS } from '@kbn/synthetics-plugin/common/constants';
import {
  legacyPrivateLocationsSavedObjectId,
  legacyPrivateLocationsSavedObjectName,
} from '@kbn/synthetics-plugin/common/saved_objects/private_locations';
import type { PackagePolicy } from '@kbn/fleet-plugin/common';
import { omit } from 'lodash';
import type { FtrProviderContext } from '../../../ftr_provider_context';

export const INSTALLED_VERSION = '1.4.2';

export class PrivateLocationTestService {
  private supertest: ReturnType<typeof KibanaSupertestProvider>;
  private readonly getService: FtrProviderContext['getService'];

  constructor(getService: FtrProviderContext['getService']) {
    this.supertest = getService('supertest');
    this.getService = getService;
  }

  async cleanupFleetPolicies() {
    // Delete package policies first (they reference agent policies)
    const packagePoliciesRes = await this.supertest
      .get('/api/fleet/package_policies?perPage=1000')
      .set('kbn-xsrf', 'true');

    if (packagePoliciesRes.status === 200) {
      const packagePolicies = packagePoliciesRes.body.items || [];
      for (const packagePolicy of packagePolicies) {
        await this.supertest
          .delete(`/api/fleet/package_policies/${packagePolicy.id}?force=true`)
          .set('kbn-xsrf', 'true');
      }
    }

    // Then delete agent policies
    const agentPoliciesRes = await this.supertest
      .get('/api/fleet/agent_policies?perPage=1000')
      .set('kbn-xsrf', 'true');

    if (agentPoliciesRes.status === 200) {
      const agentPolicies = agentPoliciesRes.body.items || [];
      for (const agentPolicy of agentPolicies) {
        if (agentPolicy.is_managed) {
          continue;
        }
        await this.supertest
          .post('/api/fleet/agent_policies/delete')
          .set('kbn-xsrf', 'true')
          .send({ agentPolicyId: agentPolicy.id });
      }
    }
  }

  async installSyntheticsPackage() {
    await this.supertest.post('/api/fleet/setup').set('kbn-xsrf', 'true').send().expect(200);
    // Attempt to delete any existing package so we can install a specific version
    await this.supertest.delete(`/api/fleet/epm/packages/synthetics`).set('kbn-xsrf', 'true');
    await this.supertest
      .post(`/api/fleet/epm/packages/synthetics/${INSTALLED_VERSION}`)
      .set('kbn-xsrf', 'true')
      .send({ force: true })
      .expect(200);
  }

  async addFleetPolicy(name?: string) {
    const apiRes = await this.supertest
      .post('/api/fleet/agent_policies?sys_monitoring=true')
      .set('kbn-xsrf', 'true')
      .send({
        name: name ?? 'Fleet test server policy' + Date.now(),
        description: '',
        namespace: 'default',
        monitoring_enabled: [],
      });
    expect(apiRes.status).to.eql(200, JSON.stringify(apiRes.body));
    return apiRes;
  }

  async createPrivateLocation({
    policyId,
    label,
    spaceId,
  }: { policyId?: string; label?: string; spaceId?: string } = {}) {
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
      ...(spaceId ? { spaces: [spaceId] } : {}),
    };

    const response = await this.supertest
      .post(SYNTHETICS_API_URLS.PRIVATE_LOCATIONS)
      .set('kbn-xsrf', 'true')
      .send(location);

    expect(response.status).to.be(200);

    const { isInvalid, ...loc } = response.body;

    if (spaceId) {
      return omit(loc, ['spaces']);
    }

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

  async getPackagePolicy({
    monitorId,
    locId,
    spaceId = 'default',
  }: {
    monitorId: string;
    locId: string;
    spaceId?: string;
  }) {
    const apiResponse = await this.supertest.get(
      '/api/fleet/package_policies?page=1&perPage=2000&kuery=ingest-package-policies.package.name%3A%20synthetics'
    );

    return apiResponse.body.items.find(
      (pkgPolicy: PackagePolicy) => pkgPolicy.id === `${monitorId}-${locId}-${spaceId}`
    );
  }
}
