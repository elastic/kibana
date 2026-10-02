/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest, Logger } from '@kbn/core/server';
import type { SearchInferenceEndpointsPluginStart } from '@kbn/search-inference-endpoints/server';
import {
  ALERTZERO_INFERENCE_PARENT_FEATURE_ID,
  type WorkerBlockingReason,
} from '@kbn/alertzero-common';

/** Whether the caller's space has at least one model a Worker could run on. */
export type HasSpaceModel = (request: KibanaRequest) => Promise<boolean>;

/**
 * Builds the space-wide model check shared by the Workers list and the enable guard.
 *
 * It resolves the AlertZero parent feature in the default mode, which lists the operator's pick,
 * then the recommended models that exist, then every other model in the space, and honours "use
 * only the default connector". That list is empty only when the space has nothing to run on. The
 * parent is used rather than a tier because it has no picks or recommendations of its own, so a
 * tier whose picked model was deleted does not read as "no model". `onlyReturnConfigured` must
 * not be used: its recommendations are all EIS ids, so it would block every Worker on a cluster
 * without EIS even when the space has working connectors.
 *
 * When the check cannot run (plugin absent or resolution failed) it answers true, so a Worker is
 * never blocked on a signal nobody could read.
 */
export const createHasSpaceModel = (
  searchInferenceEndpoints: SearchInferenceEndpointsPluginStart | undefined,
  logger: Logger
): HasSpaceModel => {
  return async (request) => {
    if (!searchInferenceEndpoints) {
      return true;
    }
    try {
      const { endpoints } = await searchInferenceEndpoints.endpoints.getForFeature(
        ALERTZERO_INFERENCE_PARENT_FEATURE_ID,
        request
      );
      return endpoints.length > 0;
    } catch (error) {
      logger.warn(
        `Failed to check whether the space has an AI model: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
      return true;
    }
  };
};

/** Blocking reasons that apply to every Worker in the space, hardest first. */
export const getSpaceBlockingReasons = (hasSpaceModel: boolean): WorkerBlockingReason[] =>
  hasSpaceModel ? [] : ['no_model'];
