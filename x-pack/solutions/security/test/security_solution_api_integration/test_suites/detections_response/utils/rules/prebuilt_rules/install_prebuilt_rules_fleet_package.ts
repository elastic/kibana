/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  BulkInstallPackageInfo,
  BulkInstallPackagesResponse,
  IBulkInstallPackageHTTPError,
} from '@kbn/fleet-plugin/common';
import { epmRouteService } from '@kbn/fleet-plugin/common';
import type { Client } from '@elastic/elasticsearch';
import type { InstallPackageResponse } from '@kbn/fleet-plugin/common/types';
import type SuperTest from 'supertest';
import type { RetryService } from '@kbn/ftr-common-functional-services';
import expect from 'expect';
import { refreshSavedObjectIndices } from '../../refresh_index';
import { isTransientFleetStatus, retryFleetRequest } from './retry_fleet_request';

/**
 * Installs the `security_detection_engine` package via fleet API. This will
 * create real `security-rule` asset saved objects from the package.
 *
 * @param supertest The supertest deps
 * @param version The version to install, e.g. '8.4.1'
 * @param overrideExistingPackage Whether or not to force the install
 */
export const installPrebuiltRulesFleetPackage = async ({
  es,
  supertest,
  version,
  overrideExistingPackage,
  retryService,
}: {
  es: Client;
  supertest: SuperTest.Agent;
  version?: string;
  overrideExistingPackage: boolean;
  retryService: RetryService;
}): Promise<InstallPackageResponse | BulkInstallPackagesResponse> => {
  if (version) {
    // Install a specific version
    const { body } = await retryFleetRequest(
      retryService,
      () =>
        supertest
          .post(epmRouteService.getInstallPath('security_detection_engine', version))
          .set('kbn-xsrf', 'true')
          .send({
            force: overrideExistingPackage,
          }),
      { description: installPrebuiltRulesFleetPackage.name }
    );
    const response = body as InstallPackageResponse;

    expect(response.items).toBeDefined();
    expect(response.items.length).toBeGreaterThan(0);

    await refreshSavedObjectIndices(es);

    return response;
  } else {
    // Install the latest version
    const { body } = await retryFleetRequest(
      retryService,
      () =>
        supertest
          .post(epmRouteService.getBulkInstallPath())
          .query({ prerelease: true })
          .set('kbn-xsrf', 'true')
          .send({
            packages: ['security_detection_engine'],
            force: overrideExistingPackage,
          }),
      {
        description: installPrebuiltRulesFleetPackage.name,
        // Bulk install reports per-package failures within a 200 response
        isTransient: ({ status, body: bulkBody }) =>
          isTransientFleetStatus(status) ||
          isTransientBulkInstallError(bulkBody as BulkInstallPackagesResponse),
        isSuccess: ({ status, body: bulkBody }) =>
          status === 200 && !hasBulkInstallError(bulkBody as BulkInstallPackagesResponse),
      }
    );
    const response = body as BulkInstallPackagesResponse;

    // First and only item in the response should be the security_detection_engine package
    expect(response.items[0]).toBeDefined();
    expect((response.items[0] as BulkInstallPackageInfo).result.assets).toBeDefined();
    // Endpoint call should have installed at least 1 security-rule asset
    expect((response.items[0] as BulkInstallPackageInfo).result.assets?.length).toBeGreaterThan(0);

    await refreshSavedObjectIndices(es);

    return response;
  }
};

const getBulkInstallErrors = ({ items = [] }: BulkInstallPackagesResponse) =>
  items.filter((item): item is IBulkInstallPackageHTTPError => 'statusCode' in item);

const hasBulkInstallError = (response: BulkInstallPackagesResponse): boolean =>
  getBulkInstallErrors(response).length > 0;

const isTransientBulkInstallError = (response: BulkInstallPackagesResponse): boolean =>
  getBulkInstallErrors(response).some(({ statusCode }) => isTransientFleetStatus(statusCode));

/**
 * Returns the `--xpack.securitySolution.prebuiltRulesPackageVersion=8.3.1` setting
 * as configured in the kbnServerArgs from the test's config.ts.
 * @param kbnServerArgs Kibana server args within scope
 */
export const getPrebuiltRulesPackageVersionFromServerArgs = (kbnServerArgs: string[]): string => {
  const re =
    /--xpack\.securitySolution\.prebuiltRulesPackageVersion=(?<prebuiltRulesPackageVersion>.*)/;
  for (const serverArg of kbnServerArgs) {
    const match = re.exec(serverArg);
    const prebuiltRulesPackageVersion = match?.groups?.prebuiltRulesPackageVersion;
    if (prebuiltRulesPackageVersion) {
      return prebuiltRulesPackageVersion;
    }
  }

  throw Error(
    'xpack.securitySolution.prebuiltRulesPackageVersion is not set in the server arguments'
  );
};
