/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ALL_SAVED_OBJECT_INDICES } from '@kbn/core-saved-objects-server';
import { epmRouteService } from '@kbn/fleet-plugin/common';
import type { Client } from '@elastic/elasticsearch';
import type SuperTest from 'supertest';

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
}: {
  es: Client;
  supertest: SuperTest.SuperTest<SuperTest.Test>;
  version?: string;
  overrideExistingPackage: boolean;
}): Promise<void> => {
  if (version) {
    // Install a specific version
    await supertest
      .post(epmRouteService.getInstallPath('security_detection_engine', version))
      .set('kbn-xsrf', 'true')
      .send({
        force: overrideExistingPackage,
      })
      .expect(200);
  } else {
    // Install the latest version
    await supertest
      .post(epmRouteService.getBulkInstallPath())
      .query({ prerelease: true })
      .set('kbn-xsrf', 'true')
      .send({
        packages: ['security_detection_engine'],
        force: overrideExistingPackage,
      })
      .expect(200);
  }

  // Before we proceed, we need to refresh saved object indices.
  // At the previous step we installed the Fleet package with prebuilt detection rules.
  // Prebuilt rules are assets that Fleet indexes as saved objects of a certain type.
  // Fleet does this via a savedObjectsClient.import() call with explicit `refresh: false`.
  // So, despite of the fact that the endpoint waits until the prebuilt rule assets will be
  // successfully indexed, it doesn't wait until they become "visible" for subsequent read
  // operations.
  // And this is usually what we do next in integration tests: we read these SOs with utility
  // function such as getPrebuiltRulesAndTimelinesStatus().
  // Now, the time left until the next refresh can be anything from 0 to the default value, and
  // it depends on the time when savedObjectsClient.import() call happens relative to the time of
  // the next refresh. Also, probably the refresh time can be delayed when ES is under load?
  // Anyway, this can cause race condition between a write and subsequent read operation, and to
  // fix it deterministically we have to refresh saved object indices and wait until it's done.
  await es.indices.refresh({ index: ALL_SAVED_OBJECT_INDICES });
};

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
