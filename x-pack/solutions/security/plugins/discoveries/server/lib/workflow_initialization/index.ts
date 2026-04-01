/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AnalyticsServiceSetup, KibanaRequest, Logger } from '@kbn/core/server';
import type { WorkflowsServerPluginSetup } from '@kbn/workflows-management-plugin/server';

import { reportMisconfiguration } from '@kbn/discoveries/impl/lib/telemetry/report_misconfiguration';
import type { WorkflowIntegrityResult } from '@kbn/discoveries/impl/attack_discovery/generation/types';
import type { DefaultWorkflowIds } from '../../workflows/register_default_workflows';
import { registerDefaultWorkflows } from '../../workflows/register_default_workflows';
import { getBundledYamlEntries } from '../../workflows/helpers/get_bundled_yaml_entries';
import { verifyAndRepairWorkflows } from './verify_and_repair_workflows';

const DEFAULT_SPACE_ID = 'default';
const INITIAL_RETRY_DELAY_MS = 30 * 1000;
const RETRY_BACKOFF_BASE_MS = 2 * 60 * 1000;

export interface WorkflowInitializationService {
  ensureWorkflowsForSpace(params: {
    logger: Logger;
    request: KibanaRequest;
    spaceId: string;
  }): Promise<DefaultWorkflowIds | null>;

  verifyAndRepairWorkflows(params: {
    defaultWorkflowIds: DefaultWorkflowIds;
    logger: Logger;
    request: KibanaRequest;
    spaceId: string;
  }): Promise<WorkflowIntegrityResult>;
}

interface RetryInfo {
  attempts: number;
  lastAttemptTime: number;
}

export const calculateRetryDelay = (attempts: number): number => {
  if (attempts <= 1) {
    return INITIAL_RETRY_DELAY_MS;
  }

  return RETRY_BACKOFF_BASE_MS * Math.pow(2, attempts - 2);
};

export const createWorkflowInitializationService = ({
  analytics,
  workflowsManagementApi,
}: {
  analytics?: AnalyticsServiceSetup;
  workflowsManagementApi?: WorkflowsServerPluginSetup['management'];
}): WorkflowInitializationService => {
  const initializedSpaces = new Map<string, Promise<DefaultWorkflowIds | null>>();
  const retryTracking = new Map<string, RetryInfo>();

  const initializeSpace = ({
    logger,
    request,
    spaceId,
  }: {
    logger: Logger;
    request: KibanaRequest;
    spaceId: string;
  }): Promise<DefaultWorkflowIds | null> => {
    if (workflowsManagementApi == null) {
      return Promise.resolve(null);
    }

    const cached = initializedSpaces.get(spaceId);
    if (cached != null) {
      return cached;
    }

    const failure = retryTracking.get(spaceId);
    if (failure != null) {
      const delay = calculateRetryDelay(failure.attempts);
      const elapsed = Date.now() - failure.lastAttemptTime;

      if (elapsed < delay) {
        logger.debug(
          () =>
            `Skipping workflow init for space '${spaceId}' (throttled, next retry in ${
              delay - elapsed
            }ms)`
        );
        return Promise.resolve(null);
      }
    }

    const promise = registerDefaultWorkflows(workflowsManagementApi, spaceId, logger, request)
      .then((ids) => {
        retryTracking.delete(spaceId);
        return ids;
      })
      .catch((error) => {
        initializedSpaces.delete(spaceId);

        const message = error instanceof Error ? error.message : String(error);
        retryTracking.set(spaceId, {
          attempts: (failure?.attempts ?? 0) + 1,
          lastAttemptTime: Date.now(),
        });

        logger.warn(`Failed to initialize workflows for space '${spaceId}': ${message}`);

        if (analytics != null) {
          reportMisconfiguration({
            analytics,
            logger,
            params: {
              detail: `Failed to initialize workflows for space '${spaceId}': ${message}`,
              misconfiguration_type: 'default_workflows_resolution_failed',
              space_id: spaceId,
            },
          });
        }

        return null;
      });

    initializedSpaces.set(spaceId, promise);
    return promise;
  };

  return {
    ensureWorkflowsForSpace: ({ logger, request, spaceId }) => {
      const result = initializeSpace({ logger, request, spaceId });

      if (spaceId !== DEFAULT_SPACE_ID && !initializedSpaces.has(DEFAULT_SPACE_ID)) {
        initializeSpace({ logger, request, spaceId: DEFAULT_SPACE_ID });
      }

      return result;
    },

    verifyAndRepairWorkflows: ({ defaultWorkflowIds, logger, request, spaceId }) => {
      if (workflowsManagementApi == null) {
        return Promise.resolve({
          optionalRepaired: [],
          optionalWarnings: [],
          repaired: [],
          status: 'all_intact' as const,
          unrepairableErrors: [],
        });
      }

      return verifyAndRepairWorkflows({
        bundledYamlEntries: getBundledYamlEntries(logger),
        defaultWorkflowIds,
        invalidateCache: (sid) => initializedSpaces.delete(sid),
        logger,
        request,
        spaceId,
        workflowsManagementApi,
      });
    },
  };
};
