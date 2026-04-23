/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FakeRawRequest, KibanaRequest } from '@kbn/core-http-server';
import { kibanaRequestFactory } from '@kbn/core-http-server-utils';
import type { Logger, StartServicesAccessor } from '@kbn/core/server';
import type { WorkflowsServerPluginSetup } from '@kbn/workflows-management-plugin/server';
import type { SecuritySolutionPluginStartDependencies } from '../../plugin_contract';
import { PREBUILT_WORKFLOWS } from './definitions';

interface InstallPrebuiltWorkflowsParams {
  logger: Logger;
  getStartServices: StartServicesAccessor<SecuritySolutionPluginStartDependencies>;
  managementApi: WorkflowsServerPluginSetup['management'];
}

/**
 * Ensures all prebuilt Security workflows are installed and up-to-date
 * in the default space. Uses overwrite mode so definitions are always
 * synced with the latest code.
 *
 * Called from plugin setup; awaits `getStartServices` so core is ready.
 */
export const installPrebuiltWorkflows = async ({
  logger,
  getStartServices,
  managementApi,
}: InstallPrebuiltWorkflowsParams): Promise<void> => {
  const scopedLogger = logger.get('workflows.prebuilt');
  try {
    await getStartServices();

    const spaceId = 'default';
    const fakeRequest = createFakeRequest();

    const toInstall = PREBUILT_WORKFLOWS.map(({ id, yaml }) => ({ id, yaml }));
    const result = await managementApi.bulkCreateWorkflows(toInstall, spaceId, fakeRequest, {
      overwrite: true,
    });

    for (const created of result.created) {
      scopedLogger.info(`Installed prebuilt workflow '${created.id}'`);
    }
    for (const failure of result.failed) {
      scopedLogger.warn(`Failed to install prebuilt workflow '${failure.id}': ${failure.error}`);
    }
  } catch (err) {
    scopedLogger.warn(
      `Failed to install prebuilt workflows: ${err instanceof Error ? err.message : String(err)}`
    );
  }
};

function createFakeRequest(): KibanaRequest {
  const fakeRawRequest: FakeRawRequest = {
    headers: {},
    path: '/',
  };
  return kibanaRequestFactory(fakeRawRequest);
}
