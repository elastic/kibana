/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import path from 'path';
import fs from 'fs';
import type { Client } from '@elastic/elasticsearch';
import type SuperTest from 'supertest';
import { InstallPackageResponse } from '@kbn/fleet-plugin/common/types';
import { epmRouteService } from '@kbn/fleet-plugin/common';
import { FtrProviderContext, RetryService } from '@kbn/ftr-common-functional-services';
import expect from 'expect';
import { refreshSavedObjectIndices } from '../../refresh_index';

const MAX_RETRIES = 2;
const TOTAL_TIMEOUT = 6 * 60000; // 6 mins, applies to all attempts (1 + MAX_RETRIES)

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
  const fleetResponse = await retryService.tryWithRetries<InstallPackageResponse>(
    installPrebuiltRulesPackageViaFleetAPI.name,
    async () => {
      const testResponse = await supertest
        .post(`/api/fleet/epm/packages/security_detection_engine`)
        .set('kbn-xsrf', 'xxxx')
        .set('elastic-api-version', '2023-10-31')
        .type('application/json')
        .send({ force: true })
        .expect(200);
      expect((testResponse.body as InstallPackageResponse).items).toBeDefined();
      expect((testResponse.body as InstallPackageResponse).items.length).toBeGreaterThan(0);

      return testResponse.body;
    },
    {
      retryCount: MAX_RETRIES,
      timeout: TOTAL_TIMEOUT,
    }
  );

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
  const fleetResponse = await retryService.tryWithRetries<InstallPackageResponse>(
    installPrebuiltRulesPackageByVersion.name,
    async () => {
      const testResponse = await supertest
        .post(epmRouteService.getInstallPath('security_detection_engine', version))
        .set('kbn-xsrf', 'xxxx')
        .set('elastic-api-version', '2023-10-31')
        .type('application/json')
        .send({ force: true })
        .expect(200);
      expect((testResponse.body as InstallPackageResponse).items).toBeDefined();
      expect((testResponse.body as InstallPackageResponse).items.length).toBeGreaterThan(0);

      return testResponse.body;
    },
    {
      retryCount: MAX_RETRIES,
      timeout: TOTAL_TIMEOUT,
    }
  );

  await refreshSavedObjectIndices(es);

  return fleetResponse as InstallPackageResponse;
};

const MOCK_SECURITY_DETECTION_ENGINE_PACKAGE_PATH = path.join(
  path.dirname(__filename),
  '../../../rules_management/prebuilt_rules/common/fixtures/packages/security_detection_engine-99.0.0.zip'
);

const FLEET_RATE_LIMIT_TIMEOUT = 10000; // 10 seconds

interface InstallMockPrebuiltRulesPackageParams {
  getService: FtrProviderContext['getService'];
}

/**
 * Installs a prepared mock prebuilt rules package `security_detection_engine`.
 * Installing it up front prevents installing the real package when making API requests.
 */
export const installMockPrebuiltRulesPackage = async ({
  getService,
}: InstallMockPrebuiltRulesPackageParams): Promise<InstallPackageResponse> => {
  const supertest = getService('supertest');
  const es = getService('es');
  const log = getService('log');
  const retryService = getService('retry');

  log.info('Installing mock prebuilt rules package...');

  const buffer = fs.readFileSync(MOCK_SECURITY_DETECTION_ENGINE_PACKAGE_PATH);

  const fleetResponse = await retryService.tryWithRetries<InstallPackageResponse>(
    installMockPrebuiltRulesPackage.name,
    async () => {
      const response = await supertest
        .post(`/api/fleet/epm/packages`)
        .set('kbn-xsrf', 'xxxx')
        .set('elastic-api-version', '2023-10-31')
        .type('application/zip')
        .send(buffer)
        .expect(200);

      expect((response.body as InstallPackageResponse).items).toBeDefined();
      expect((response.body as InstallPackageResponse).items.length).toBeGreaterThan(0);

      await refreshSavedObjectIndices(es);

      log.success('Mock prebuilt rules package has been installed');

      return response.body;
    },
    {
      retryCount: MAX_RETRIES,
      timeout: FLEET_RATE_LIMIT_TIMEOUT * 3,
    }
  );

  return fleetResponse;
};
