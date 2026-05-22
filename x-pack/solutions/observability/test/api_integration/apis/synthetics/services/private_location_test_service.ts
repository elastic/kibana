/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import expect from '@kbn/expect';
import type { PrivateLocation } from '@kbn/synthetics-plugin/common/runtime_types';
import type { KibanaSupertestProvider, RetryService } from '@kbn/ftr-common-functional-services';
import { SYNTHETICS_API_URLS } from '@kbn/synthetics-plugin/common/constants';
import {
  legacyPrivateLocationsSavedObjectId,
  legacyPrivateLocationsSavedObjectName,
} from '@kbn/synthetics-plugin/common/saved_objects/private_locations';
import type { PackagePolicy } from '@kbn/fleet-plugin/common';
import type { KbnClient } from '@kbn/kbn-client';
import { omit } from 'lodash';
import type { FtrProviderContext } from '../../../ftr_provider_context';

export const DEFAULT_SYNTHETICS_VERSION = '1.5.0';

/**
 * Saved-object types that synthetics tests actually create and therefore need
 * cleaning between suites. This is an explicit allow-list, *not* a subset of
 * the shared `STANDARD_LIST_TYPES`, because the shared list wipes several
 * types whose presence is required for the synthetics Fleet package to stay
 * functional across suites:
 *
 *   - `epm-packages` / `epm-packages-assets`: Fleet's record of the installed
 *     synthetics package. Wiping these forces `installSyntheticsPackage()` to
 *     do a full DELETE+POST reinstall on every suite (the primary source of
 *     502 / "backend closed connection" Fleet flakes in CI).
 *   - Kibana asset types (`dashboard`, `index-pattern`, `visualization`,
 *     `search`, `lens`, `map`, etc.): these are installed *by* the synthetics
 *     Fleet package, referenced from `epm-packages.installed_kibana`.
 *     Wiping them while preserving `epm-packages` leaves dangling references
 *     that break subsequent tests which resolve package assets in new spaces.
 *
 * Keep this list narrow: only SO types the tests themselves create.
 */
const SYNTHETICS_TEST_SO_TYPES = [
  // Synthetics test artifacts
  'synthetics-monitor',
  'synthetics-monitor-multi-space',
  'synthetics-privates-locations',
  'synthetics-private-location',
  'synthetics-param',
  'uptime-dynamic-settings',
  // Fleet agent / package policies created to back private locations
  'ingest-agent-policies',
  'fleet-agent-policies',
  'ingest-package-policies',
  'fleet-package-policies',
  // Alerting artifacts created by synthetics rule / maintenance-window suites
  'alert',
  'action',
  'maintenance-window',
];

/**
 * Drop-in replacement for `kibanaServer.savedObjects.cleanStandardList()` for
 * synthetics suites. Wipes only the SO types the tests themselves create,
 * leaving the synthetics Fleet package installation (and the Kibana/ES
 * assets it owns) intact so `installSyntheticsPackage()` can short-circuit
 * across suites.
 */
export async function cleanSyntheticsTestData(
  kibanaServer: KbnClient,
  options?: { space?: string }
) {
  await kibanaServer.savedObjects.clean({
    types: SYNTHETICS_TEST_SO_TYPES,
    space: options?.space,
  });
}

// Module-level caches shared across every PrivateLocationTestService instance
// in a single FTR run. Combined with `cleanSyntheticsTestData` (which leaves
// the `epm-packages` SO intact), these let the per-describe `before` hooks
// that call `installSyntheticsPackage()` short-circuit after the first real
// install, avoiding the Fleet churn that produced 502 flakes in CI.
let fleetSetupDone = false;
let installedVersionCache: string | null = null;

/** Reset the module-level cache. Exposed for tests that intentionally mutate
 *  deployment state. */
export function resetInstallSyntheticsPackageCache() {
  fleetSetupDone = false;
  installedVersionCache = null;
}

export class PrivateLocationTestService {
  private supertest: ReturnType<typeof KibanaSupertestProvider>;
  private readonly getService: FtrProviderContext['getService'];
  private readonly retry: RetryService;

  public get installedVersion(): string {
    return installedVersionCache ?? DEFAULT_SYNTHETICS_VERSION;
  }

  constructor(getService: FtrProviderContext['getService']) {
    this.supertest = getService('supertest');
    this.getService = getService;
    this.retry = getService('retry');
  }

  async fetchSyntheticsPackageVersion(): Promise<string> {
    const res = await this.supertest
      .get('/api/fleet/epm/packages/synthetics')
      .set('kbn-xsrf', 'true');
    return res.body?.item?.version ?? DEFAULT_SYNTHETICS_VERSION;
  }

  /** Returns the Fleet-reported { version, status } for the synthetics
   *  package, or `null` if Fleet hasn't observed it at all. */
  async getInstalledSyntheticsPackage(): Promise<{ version: string; status: string } | null> {
    const res = await this.supertest
      .get('/api/fleet/epm/packages/synthetics')
      .set('kbn-xsrf', 'true');
    const item = res.body?.item;
    if (!item?.version) {
      return null;
    }
    return { version: item.version, status: item.status ?? 'unknown' };
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

  /**
   * Ensures the synthetics Fleet package is installed at the requested version.
   *
   * This method is idempotent across all FTR suites in a single run:
   * - `POST /api/fleet/setup` only runs the first time any suite calls it.
   * - If the package is already installed at the requested version, it
   *   returns without issuing `DELETE` + `POST`.
   *
   * Historically every per-file `before` hook performed a full uninstall +
   * reinstall cycle, which saturated Fleet and produced 502 / "backend closed
   * connection" flakes. Callers that genuinely need a clean reinstall should
   * pass `{ force: true }`.
   */
  async installSyntheticsPackage({ force = false }: { force?: boolean } = {}) {
    if (!fleetSetupDone) {
      await this.retry.try(async () => {
        await this.supertest.post('/api/fleet/setup').set('kbn-xsrf', 'true').send().expect(200);
      });
      fleetSetupDone = true;
    }

    const installed = await this.getInstalledSyntheticsPackage();
    const resolvedVersion =
      installed?.version ?? installedVersionCache ?? DEFAULT_SYNTHETICS_VERSION;

    const alreadyInstalled =
      !force &&
      installed?.status === 'installed' &&
      installed?.version === resolvedVersion &&
      installedVersionCache === resolvedVersion;

    if (alreadyInstalled) {
      return;
    }

    await this.retry.try(async () => {
      await this.supertest.delete(`/api/fleet/epm/packages/synthetics`).set('kbn-xsrf', 'true');
      await this.supertest
        .post(`/api/fleet/epm/packages/synthetics/${resolvedVersion}`)
        .set('kbn-xsrf', 'true')
        .send({ force: true })
        .expect(200);
      installedVersionCache = resolvedVersion;
    });
  }

  async addFleetPolicy(name?: string, spaceIds?: string[]) {
    return await this.retry.try(async () => {
      const apiRes = await this.supertest
        .post('/api/fleet/agent_policies?sys_monitoring=true')
        .set('kbn-xsrf', 'true')
        .send({
          name: name ?? 'Fleet test server policy' + Date.now(),
          description: '',
          namespace: 'default',
          monitoring_enabled: [],
          space_ids: spaceIds || ['default'],
        });
      expect(apiRes.status).to.eql(200, JSON.stringify(apiRes.body));
      return apiRes;
    });
  }

  async createPrivateLocation({
    policyId,
    label,
    spaces,
  }: { policyId?: string; label?: string; spaces?: string[] } = {}) {
    let agentPolicyId = policyId;

    if (!agentPolicyId) {
      const apiResponse = await this.addFleetPolicy(undefined, spaces);
      agentPolicyId = apiResponse.body.item.id;
    }

    const location: Omit<PrivateLocation, 'id'> = {
      label: label ?? 'Test private location 0',
      agentPolicyId: agentPolicyId!,
      geo: {
        lat: 0,
        lon: 0,
      },
      ...(spaces ? { spaces } : {}),
    };

    let url: string = SYNTHETICS_API_URLS.PRIVATE_LOCATIONS;
    if (spaces) {
      url = `/s/${spaces[0]}${SYNTHETICS_API_URLS.PRIVATE_LOCATIONS}`;
    }

    const response = await this.supertest.post(url).set('kbn-xsrf', 'true').send(location);

    expect(response.status).to.eql(200, JSON.stringify(response.body));

    const { isInvalid, ...loc } = response.body;

    if (spaces) {
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
    spaceId,
  }: {
    monitorId: string;
    locId: string;
    spaceId?: string;
  }) {
    const apiResponse = await this.supertest.get(
      `/s/${
        spaceId ?? 'default'
      }/api/fleet/package_policies?page=1&perPage=2000&kuery=ingest-package-policies.package.name%3A%20synthetics`
    );

    return apiResponse.body.items.find(
      (pkgPolicy: PackagePolicy) => pkgPolicy.id === `${monitorId}-${locId}`
    );
  }
}
