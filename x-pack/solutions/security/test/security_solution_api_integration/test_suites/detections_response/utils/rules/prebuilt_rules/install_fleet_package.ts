/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client } from '@elastic/elasticsearch';
import type SuperTest from 'supertest';
import type { InstallPackageResponse } from '@kbn/fleet-plugin/common/types';
import { EPM_API_ROUTES, epmRouteService } from '@kbn/fleet-plugin/common';
import { getPrebuiltRuleMock } from '@kbn/security-solution-plugin/server/lib/detection_engine/prebuilt_rules/mocks';
import type { FtrProviderContext, RetryService } from '@kbn/ftr-common-functional-services';
import { generatePrebuiltRulesPackageBuffer } from '@kbn/security-solution-test-api-clients/prebuilt_rules_package_generation';
import expect from 'expect';
import { PREBUILT_RULES_PACKAGE_NAME } from '@kbn/security-solution-plugin/common/detection_engine/constants';
import { refreshSavedObjectIndices } from '../../refresh_index';
import { retryFleetRequest } from './retry_fleet_request';

// Fleet rate limits package uploads
const FLEET_UPLOAD_RATE_LIMIT_DELAY = 10_000;

interface InstallFleetPackageParams {
  getService: FtrProviderContext['getService'];
  packageName: string;
  packageVersion?: string;
  force?: boolean;
}

/**
 * Installs `packageName` package from the registry.
 * Public Elastic Package Registry (EPR) is used by default.
 *
 * In Air gapped environments when EPR isn't configured
 * only bundled packages (<kibana-root>/fleet_packages.json) can be installed.
 *
 * `xpack.fleet.developer.bundledPackageLocation` allows to specify a custom location
 * for pre-bundled packages.
 */
export const installFleetPackage = async ({
  getService,
  packageName,
  packageVersion,
  force = false,
}: InstallFleetPackageParams): Promise<InstallPackageResponse> => {
  const supertest = getService('supertest');
  const es = getService('es');
  const log = getService('log');
  const retryService = getService('retry');

  log.debug(`Installing ${packageName} package`);

  const { body } = await retryFleetRequest(
    retryService,
    () =>
      supertest
        .post(epmRouteService.getInstallPath(packageName, packageVersion))
        .set('kbn-xsrf', 'xxxx')
        .set('elastic-api-version', '2023-10-31')
        .type('application/json')
        .send({ force }),
    { description: installFleetPackage.name }
  );
  const fleetResponse = body as InstallPackageResponse;

  expect(fleetResponse.items).toBeDefined();
  expect(fleetResponse.items.length).toBeGreaterThan(0);

  await refreshSavedObjectIndices(es);

  log.success(`${packageName} has been installed`);

  return fleetResponse;
};

interface UploadFleetPackageParams {
  getService: FtrProviderContext['getService'];
  packageBuffer: Buffer;
}

/**
 * Installs a provided Fleet package by uploading it to Fleet.
 */
export const installFleetPackageByUpload = async ({
  getService,
  packageBuffer,
}: UploadFleetPackageParams): Promise<InstallPackageResponse> => {
  const supertest = getService('supertest');
  const es = getService('es');
  const log = getService('log');
  const retryService = getService('retry');

  log.debug('Uploading a package to Fleet...');

  const { body } = await retryFleetRequest(
    retryService,
    () =>
      supertest
        .post(EPM_API_ROUTES.INSTALL_BY_UPLOAD_PATTERN)
        .set('kbn-xsrf', 'xxxx')
        .set('elastic-api-version', '2023-10-31')
        .type('application/zip')
        .send(packageBuffer),
    { description: installFleetPackageByUpload.name, retryDelay: FLEET_UPLOAD_RATE_LIMIT_DELAY }
  );
  const fleetResponse = body as InstallPackageResponse;

  expect(fleetResponse.items).toBeDefined();
  expect(fleetResponse.items.length).toBeGreaterThan(0);

  await refreshSavedObjectIndices(es);

  log.success('Mock prebuilt rules package has been installed');

  return fleetResponse;
};

interface InstallMockPrebuiltRulesPackageParams {
  getService: FtrProviderContext['getService'];
}

/**
 * Installs a prepared mock prebuilt rules package `security_detection_engine`.
 * Installing it up front prevents installing the real package when making API requests.
 *
 * On TEST_CLOUD (MKI quality gate) Fleet rejects that upload because the name
 * exists in the registry, and `kbnTestServerArgs` are not applied to the
 * pre-deployed Kibana. Leave the environment package in place.
 */
export const installMockPrebuiltRulesPackage = async ({
  getService,
}: InstallMockPrebuiltRulesPackageParams): Promise<InstallPackageResponse | undefined> => {
  const log = getService('log');

  if (process.env.TEST_CLOUD === '1') {
    log.info('Skipping mock prebuilt rules package upload on TEST_CLOUD');
    return undefined;
  }

  log.info('Installing mock prebuilt rules package...');

  const securityDetectionEnginePackageZip = await generatePrebuiltRulesPackageBuffer({
    packageName: PREBUILT_RULES_PACKAGE_NAME,
    // Use a high version to avoid conflicts with real packages
    // including mock bundled packages path configured via "xpack.fleet.developer.bundledPackageLocation"
    packageSemver: '1000.0.0',
    prebuiltRuleAssets: [getPrebuiltRuleMock({ rule_id: 'mock-prebuilt-rule', version: 1 })],
  });

  return installFleetPackageByUpload({
    getService,
    packageBuffer: securityDetectionEnginePackageZip,
  });
};

/**
 * Installs latest available non-prerelease prebuilt rules package `security_detection_engine`.
 *
 * @param es Elasticsearch client
 * @param supertest SuperTest instance
 * @param version Semver version of the `security_detection_engine` package to install
 * @returns Fleet install package response
 */

export const installPrebuiltRulesPackageViaFleetAPI = async (
  es: Client,
  supertest: SuperTest.Agent,
  retryService: RetryService
): Promise<InstallPackageResponse> => {
  const { body } = await retryFleetRequest(
    retryService,
    () =>
      supertest
        .post(`/api/fleet/epm/packages/security_detection_engine`)
        .set('kbn-xsrf', 'xxxx')
        .set('elastic-api-version', '2023-10-31')
        .type('application/json')
        .send({ force: true }),
    { description: installPrebuiltRulesPackageViaFleetAPI.name }
  );
  const fleetResponse = body as InstallPackageResponse;

  expect(fleetResponse.items).toBeDefined();
  expect(fleetResponse.items.length).toBeGreaterThan(0);

  await refreshSavedObjectIndices(es);

  return fleetResponse;
};

/**
 * Installs prebuilt rules package `security_detection_engine`, passing in the version
 * of the package as a parameter to the url.
 *
 * @param es Elasticsearch client
 * @param supertest SuperTest instance
 * @param version Semver version of the `security_detection_engine` package to install
 * @returns Fleet install package response
 */

export const installPrebuiltRulesPackageByVersion = async (
  es: Client,
  supertest: SuperTest.Agent,
  version: string,
  retryService: RetryService
): Promise<InstallPackageResponse> => {
  const { body } = await retryFleetRequest(
    retryService,
    () =>
      supertest
        .post(epmRouteService.getInstallPath('security_detection_engine', version))
        .set('kbn-xsrf', 'xxxx')
        .set('elastic-api-version', '2023-10-31')
        .type('application/json')
        .send({ force: true }),
    { description: installPrebuiltRulesPackageByVersion.name }
  );
  const fleetResponse = body as InstallPackageResponse;

  expect(fleetResponse.items).toBeDefined();
  expect(fleetResponse.items.length).toBeGreaterThan(0);

  await refreshSavedObjectIndices(es);

  return fleetResponse;
};
