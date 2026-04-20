/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { v4 as uuidv4 } from 'uuid';
import type { RetryService } from '@kbn/ftr-common-functional-services';
import { X_ELASTIC_INTERNAL_ORIGIN_REQUEST } from '@kbn/core-http-common';
import { privateLocationSavedObjectName } from '@kbn/synthetics-plugin/common/saved_objects/private_locations';
import type { SyntheticsPrivateLocations } from '@kbn/synthetics-plugin/common/runtime_types';
import type { KibanaSupertestProvider } from '@kbn/ftr-common-functional-services';
import type { PackagePolicy } from '@kbn/fleet-plugin/common';
import type { KbnClient } from '@kbn/kbn-client';
import type { DeploymentAgnosticFtrProviderContext } from '../ftr_provider_context';

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
  // Alerting artifacts created by enable_default_alerting & related suites
  'alert',
  'action',
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
// the `epm-packages` SO intact), these let the ~25 suite-level `before` hooks
// that call `installSyntheticsPackage()` short-circuit after the first real
// install, avoiding the Fleet churn that produced 502 flakes in downstream
// tests.
let fleetSetupDone = false;
let installedVersionCache: string | null = null;

/** Reset the module-level cache. Exposed for tests that intentionally mutate
 *  deployment state (e.g. the synthetics auto-upgrade test). */
export function resetInstallSyntheticsPackageCache() {
  fleetSetupDone = false;
  installedVersionCache = null;
}

export class PrivateLocationTestService {
  private supertestWithAuth: ReturnType<typeof KibanaSupertestProvider>;
  private readonly retry: RetryService;

  constructor(getService: DeploymentAgnosticFtrProviderContext['getService']) {
    // TODO: Replace with roleScopedSupertest for deployment-agnostic compatibility
    // eslint-disable-next-line @kbn/eslint/deployment_agnostic_test_context
    this.supertestWithAuth = getService('supertest');
    this.retry = getService('retry');
  }

  async fetchSyntheticsPackageVersion(): Promise<string> {
    const res = await this.supertestWithAuth
      .get('/api/fleet/epm/packages/synthetics')
      .set('kbn-xsrf', 'true');
    return res.body?.item?.version ?? DEFAULT_SYNTHETICS_VERSION;
  }

  /** Returns the Fleet-reported { version, status } for the synthetics
   *  package, or `null` if Fleet hasn't observed it at all. */
  async getInstalledSyntheticsPackage(): Promise<{ version: string; status: string } | null> {
    const res = await this.supertestWithAuth
      .get('/api/fleet/epm/packages/synthetics')
      .set('kbn-xsrf', 'true');
    const item = res.body?.item;
    if (!item?.version) {
      return null;
    }
    return { version: item.version, status: item.status ?? 'unknown' };
  }

  /**
   * Ensures the synthetics Fleet package is installed at the requested version.
   *
   * This method is idempotent across all FTR suites in a single run:
   * - `POST /api/fleet/setup` only runs the first time any suite calls it.
   * - If the package is already installed at the requested version, it
   *   returns without issuing `DELETE` + `POST`.
   *
   * Historically every one of the ~25 Synthetics `describe` `before` hooks
   * performed a full uninstall + reinstall cycle, which saturated Fleet and
   * produced 502 / "backend closed connection" flakes in downstream tests.
   * Callers that genuinely need a clean reinstall (the auto-upgrade test)
   * should pass `{ force: true }`.
   */
  async installSyntheticsPackage({
    version,
    force = false,
  }: { version?: string; force?: boolean } = {}) {
    if (!fleetSetupDone) {
      await this.retry.try(async () => {
        await this.supertestWithAuth
          .post('/api/fleet/setup')
          .set('kbn-xsrf', 'true')
          .send()
          .expect(200);
      });
      fleetSetupDone = true;
    }

    const installed = await this.getInstalledSyntheticsPackage();
    const resolvedVersion =
      version ?? installed?.version ?? installedVersionCache ?? DEFAULT_SYNTHETICS_VERSION;

    const alreadyInstalled =
      !force &&
      installed?.status === 'installed' &&
      installed?.version === resolvedVersion &&
      installedVersionCache === resolvedVersion;

    if (alreadyInstalled) {
      return;
    }

    await this.retry.try(async () => {
      await this.supertestWithAuth
        .delete(`/api/fleet/epm/packages/synthetics`)
        .set('kbn-xsrf', 'true');
      await this.supertestWithAuth
        .post(`/api/fleet/epm/packages/synthetics/${resolvedVersion}`)
        .set('kbn-xsrf', 'true')
        .send({ force: true })
        .expect(200);
      // Verify the version actually took effect — background Fleet tasks
      // (e.g. deferred upgradePackageInstallVersion) can race and overwrite it
      const after = await this.getInstalledSyntheticsPackage();
      if (after?.version !== resolvedVersion) {
        throw new Error(
          `Package version mismatch after install: expected ${resolvedVersion} but got ${after?.version}`
        );
      }
      installedVersionCache = resolvedVersion;
    });
  }

  async addTestPrivateLocation(spaceId = 'default') {
    const apiResponse = await this.addFleetPolicy(uuidv4(), [spaceId]);
    const testPolicyId = apiResponse.body.item.id;
    return (await this.setTestLocations([testPolicyId], spaceId))[0];
  }

  async addFleetPolicy(name: string, spaceIds = ['default']) {
    return await this.retry.try(async () => {
      const response = await this.supertestWithAuth
        .post(
          `${
            spaceIds[0] !== 'default' ? `/s/${spaceIds[0]}` : ``
          }/api/fleet/agent_policies?sys_monitoring=true`
        )
        .set('kbn-xsrf', 'true')
        .send({
          name,
          description: '',
          namespace: 'default',
          monitoring_enabled: [],
          space_ids: spaceIds.length > 1 ? spaceIds : undefined,
        })
        .expect(200);
      return response;
    });
  }

  async getPackagePolicies(): Promise<PackagePolicy[]> {
    const apiResponse = await this.supertestWithAuth.get(
      '/api/fleet/package_policies?page=1&perPage=2000&kuery=ingest-package-policies.package.name%3A%20synthetics'
    );
    return apiResponse.body.items;
  }

  async setTestLocations(testFleetPolicyIds: string[], spaceId?: string | string[]) {
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
    const urlSpaceId = spaceId ? (Array.isArray(spaceId) ? spaceId[0] : spaceId) : 'default';

    await this.supertestWithAuth
      .post(`/s/${urlSpaceId}/api/saved_objects/_bulk_create`)
      .set(X_ELASTIC_INTERNAL_ORIGIN_REQUEST, 'kibana')
      .set('kbn-xsrf', 'true')
      .send(
        locations.map((location) => ({
          type: privateLocationSavedObjectName,
          id: location.id,
          attributes: location,
          initialNamespaces: spaceId ? (Array.isArray(spaceId) ? spaceId : [spaceId]) : ['default'],
        }))
      )
      .expect(200);

    return locations;
  }
}
