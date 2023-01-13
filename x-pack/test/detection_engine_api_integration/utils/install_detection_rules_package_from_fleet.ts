/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { epmRouteService } from '@kbn/fleet-plugin/common';
import { InstallPackageResponse } from '@kbn/fleet-plugin/common/types';
import type { ToolingLog } from '@kbn/tooling-log';
import type SuperTest from 'supertest';

/**
 * Installed the security_detection_engine package via fleet API. Will
 * @param supertest The supertest deps
 * @param log The tooling logger
 * @param version The version to install, e.g. '8.4.1'
 * @param overrideExistingPackage Whether or not to force the install
 */
export const installDetectionRulesPackageFromFleet = async (
  supertest: SuperTest.SuperTest<SuperTest.Test>,
  log: ToolingLog,
  version: string,
  overrideExistingPackage: true
): Promise<InstallPackageResponse> => {
  const response = await supertest
    .post(epmRouteService.getInstallPath('security_detection_engine', version))
    .set('kbn-xsrf', 'true')
    .send({
      force: overrideExistingPackage,
    });
  if (response.status !== 200) {
    log.error(
      `Did not get an expected 200 "ok" when installing 'security_detection_engine' fleet package'. body: ${JSON.stringify(
        response.body
      )}, status: ${JSON.stringify(response.status)}`
    );
  }
  return response.body;
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
