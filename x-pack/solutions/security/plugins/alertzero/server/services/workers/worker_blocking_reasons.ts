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

/** Why Workers can't run for the requesting user, the same for every Worker. */
export type GetWorkerBlockingReasons = (request: KibanaRequest) => Promise<WorkerBlockingReason[]>;

/**
 * Reports `no_model` when the requesting user has no model a Worker could run on.
 *
 * The answer is per user, not per space: stack connectors are listed with the caller's own actions
 * client. That matches run time, because Workers run as the user who enabled them and resolve
 * their model through the same `getForFeature` call, so a user who gets an empty list here would
 * enable a Worker that fails on every run.
 *
 * It resolves the AlertZero parent feature rather than a tier, because the parent has no picks or
 * recommendations of its own, so a tier whose picked model was deleted does not read as no model.
 * It must not pass `onlyReturnConfigured`: that mode returns only recommended models, which are
 * all EIS endpoints, so it would block every Worker on a cluster without EIS.
 *
 * Connector and saved-object read failures come back from `getForFeature` as an empty list and
 * read as no model, as they would at run time. Only a missing plugin, or a uiSettings or client
 * failure, answers with no reasons.
 */
export const createGetWorkerBlockingReasons = (
  searchInferenceEndpoints: SearchInferenceEndpointsPluginStart | undefined,
  logger: Logger
): GetWorkerBlockingReasons => {
  return async (request) => {
    if (!searchInferenceEndpoints) {
      return [];
    }
    try {
      const { endpoints } = await searchInferenceEndpoints.endpoints.getForFeature(
        ALERTZERO_INFERENCE_PARENT_FEATURE_ID,
        request
      );
      return endpoints.length > 0 ? [] : ['no_model'];
    } catch (error) {
      logger.warn(
        `Failed to check whether the user has an AI model: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
      return [];
    }
  };
};
