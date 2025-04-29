/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client } from '@elastic/elasticsearch';
import { epmRouteService } from '@kbn/fleet-plugin/common';
import { RetryService } from '@kbn/ftr-common-functional-services';
import {
  ENDPOINT_PACKAGE_NAME,
  PREBUILT_RULES_PACKAGE_NAME,
} from '@kbn/security-solution-plugin/common/detection_engine/constants';
import { ToolingLog } from '@kbn/tooling-log';
import type SuperTest from 'supertest';
import { refreshSavedObjectIndices } from '../../refresh_index';

interface DeleteFleetPackageDeps {
  supertest: SuperTest.Agent;
  retryService: RetryService;
  log: ToolingLog;
  es: Client;
}

interface DeleteFleetPackageArgs {
  packageName: string;
  dependencies: DeleteFleetPackageDeps;
}

/**
 * Delete the security_detection_engine package using fleet API.
 */
export async function deletePrebuiltRulesFleetPackage(params: DeleteFleetPackageDeps) {
  await deleteFleetPackage({
    packageName: PREBUILT_RULES_PACKAGE_NAME,
    dependencies: params,
  });
}

/**
 * Delete the endpoint package using fleet API.
 */
export async function deleteEndpointFleetPackage(params: DeleteFleetPackageDeps) {
  await deleteFleetPackage({
    packageName: ENDPOINT_PACKAGE_NAME,
    dependencies: params,
  });
}

async function deleteFleetPackage(params: DeleteFleetPackageArgs): Promise<void> {
  const { packageName, dependencies } = params;
  const { supertest, retryService, log, es } = dependencies;

  await retryService.tryWithRetries(
    'deleteFleetPackage',
    async () => {
      log.debug(`Deleting ${packageName} package`);

      const response = await supertest
        .delete(epmRouteService.getRemovePath(packageName))
        .set('kbn-xsrf', 'true')
        .set('elastic-api-version', '2023-10-31')
        .send({ force: true });

      if (response.status === 200) {
        log.debug(`Deleted ${packageName} package (was installed)`);
        return;
      } else if (
        response.status === 400 &&
        response.body.message === `${packageName} is not installed`
      ) {
        log.debug(`Deleted ${packageName} package (was not installed)`, response.body);
        return;
      } else {
        log.warning(`Error deleting ${packageName} package`, response.body);
        throw response.error;
      }
    },
    {
      retryCount: 2, // overall max 3 attempts
      timeout: 3 * 60000, // total timeout applied to all attempts altogether
    }
  );

  await refreshSavedObjectIndices(es);
}
