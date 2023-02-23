/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { epmRouteService } from '@kbn/fleet-plugin/common';
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
  supertest,
  version,
  overrideExistingPackage,
}: {
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
