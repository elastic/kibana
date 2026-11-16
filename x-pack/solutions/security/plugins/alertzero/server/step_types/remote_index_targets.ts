/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreStart, KibanaRequest, Logger } from '@kbn/core/server';
import { SECURITY_SOLUTION_DEFAULT_INDEX_ID } from '@kbn/management-settings-ids';
import { createServerStepDefinition } from '@kbn/workflows-extensions/server';
import type { RemoteIndexTargets } from '../../common/remote_index_targets';
import { remoteIndexTargets } from '../../common/remote_index_targets';
import { remoteIndexTargetsStepCommonDefinition } from '../../common/step_types/remote_index_targets';

export interface RemoteIndexTargetsStepDependencies {
  getCoreStart: () => CoreStart;
  logger?: Logger;
}

const localOnly = (localTargets: readonly string[]): RemoteIndexTargets => ({
  index: localTargets.join(','),
  clusters: [],
});

/**
 * Reads `securitySolution:defaultIndex` as the running identity and turns its
 * cluster aliases into a search target for `localTargets`. A missing setting or a
 * failed read returns the local patterns, so the caller still searches this cluster.
 */
export const resolveRemoteIndexTargets = async (
  getCoreStart: () => CoreStart,
  request: KibanaRequest,
  localTargets: readonly string[],
  logger?: Logger
): Promise<RemoteIndexTargets> => {
  try {
    const coreStart = getCoreStart();
    const configured = await coreStart.uiSettings
      .asScopedToClient(coreStart.savedObjects.getScopedClient(request))
      .get<unknown>(SECURITY_SOLUTION_DEFAULT_INDEX_ID);
    if (!Array.isArray(configured)) return localOnly(localTargets);
    return remoteIndexTargets(
      configured.filter((pattern): pattern is string => typeof pattern === 'string'),
      localTargets
    );
  } catch (error) {
    logger?.warn(
      `Reading ${SECURITY_SOLUTION_DEFAULT_INDEX_ID} failed; searching the local patterns: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
    return localOnly(localTargets);
  }
};

export const getRemoteIndexTargetsStepDefinition = ({
  getCoreStart,
  logger,
}: RemoteIndexTargetsStepDependencies) =>
  createServerStepDefinition({
    ...remoteIndexTargetsStepCommonDefinition,
    handler: async (context) => {
      const { patterns } = context.input;
      const request = context.contextManager.getFakeRequest();
      if (!request) {
        logger?.warn('Remote index targets step has no request; searching the local patterns');
        return { output: localOnly(patterns) };
      }
      return { output: await resolveRemoteIndexTargets(getCoreStart, request, patterns, logger) };
    },
  });
