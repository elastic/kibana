/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, KibanaRequest, Logger } from '@kbn/core/server';
import type { HuntWorkerIndexCoverageResponse } from '@kbn/alertzero-common';
import {
  SYSTEM_SECURITY_WORKER_HUNT_CONTINUOUS_THREAT_HUNT_ID,
  WORKER_SERVICE_ACCOUNT_NAMES,
} from '@kbn/alertzero-common';
import { isIndexExclusion } from '../../../../../common/remote_cluster';
import type { WatchWorkflowsManagementClient } from '../../watch_workflows_management_client';
import { readLatestFinishedSweepIndexScope } from './read_last_sweep_index_scope';
import { readWorkerRole, statusCodeOf, uncoveredPatterns } from './role_pattern_coverage';
import { unresolvedPatterns } from './resolve_index_scope';

export type HuntWorkerIndexCoverage = HuntWorkerIndexCoverageResponse;

/**
 * The text that names the Hunt worker's account to the user. The stored id when it has the
 * Elasticsearch service account shape `<namespace>/<name>` (stateful); otherwise the account name,
 * since a UIAM id on Serverless is opaque. Never the role name, which differs by deployment type.
 */
export const getHuntAccountLabel = ({
  serviceAccountId,
}: {
  serviceAccountId: string | null | undefined;
}): string => {
  if (serviceAccountId && serviceAccountId.split('/').length === 2) return serviceAccountId;
  return WORKER_SERVICE_ACCOUNT_NAMES[SYSTEM_SECURITY_WORKER_HUNT_CONTINUOUS_THREAT_HUNT_ID];
};

interface ResolveWorkerIndexCoverageParams {
  /** The caller's client: used for the resolve and for the role read. */
  esClient: ElasticsearchClient;
  management: WatchWorkflowsManagementClient | undefined;
  request: KibanaRequest;
  spaceId: string;
  indexPatterns: string[];
  workflowId: string | null;
  serviceAccountId: string | null;
  roleName: string;
  isServerless: boolean;
  logger: Logger;
}

const minus = (values: string[], remove: string[]): string[] =>
  values.filter((value) => !remove.includes(value));

const sameMembers = (a: string[], b: string[]): boolean =>
  a.length === b.length && a.every((value) => b.includes(value));

/**
 * Which patterns of the space's default data view the caller can resolve and the Hunt worker's
 * service account cannot. The last finished sweep is the account's own view and is used when it
 * evaluated the current patterns; otherwise the caller's role lookup stands in.
 */
export const resolveWorkerIndexCoverage = async ({
  esClient,
  management,
  request,
  spaceId,
  indexPatterns,
  workflowId,
  serviceAccountId,
  roleName,
  isServerless,
  logger,
}: ResolveWorkerIndexCoverageParams): Promise<HuntWorkerIndexCoverage> => {
  const universe = indexPatterns.filter((pattern) => !isIndexExclusion(pattern));
  const base = {
    universe,
    service_account_id: serviceAccountId,
    role_name: roleName,
    account_label: getHuntAccountLabel({ serviceAccountId }),
    is_serverless: isServerless,
  };

  let missingForEveryone: string[];
  try {
    // Same options as `resolveHuntScope`, so the caller's `missing` and the sweep's agree.
    const resolved = await esClient.indices.resolveIndex({
      name: indexPatterns,
      allow_no_indices: true,
      expand_wildcards: ['open'],
    });
    missingForEveryone = unresolvedPatterns(universe, resolved);
  } catch (err) {
    if (statusCodeOf(err) === 403) {
      return {
        ...base,
        unreadable_by_worker: [],
        missing_for_everyone: [],
        source: 'unavailable',
        unavailable_reason: 'caller_unreadable',
        checked_at: null,
      };
    }
    return {
      ...base,
      unreadable_by_worker: [],
      missing_for_everyone: universe,
      source: 'unavailable',
      unavailable_reason: 'discovery_failed',
      checked_at: null,
    };
  }

  const readRole = () => readWorkerRole({ esClient, roleName, isServerless });

  if (workflowId && management) {
    const sweep = await readLatestFinishedSweepIndexScope({
      management,
      workflowId,
      spaceId,
      request,
      logger,
    });
    const scope = sweep?.scope;
    if (sweep && scope && scope.resolution !== 'blocked:discovery_failed') {
      const evaluated =
        scope.status === 'blocked'
          ? scope.missing
          : scope.index_patterns.filter((pattern) => !isIndexExclusion(pattern));
      if (sameMembers(evaluated, universe)) {
        let sweepMissing = scope.missing;
        try {
          const role = await readRole();
          if (role) {
            const uncovered = uncoveredPatterns({ role, patterns: universe, isServerless });
            // On Serverless the local role cannot show that a project-qualified miss is stale: the
            // linked project may not be searchable by the worker whatever `logs-*` grants locally.
            sweepMissing = sweepMissing.filter(
              (pattern) => uncovered.includes(pattern) || (isServerless && pattern.includes(':'))
            );
          }
        } catch (err) {
          logger.warn(
            `Reading role ${roleName} to refine the hunt sweep coverage failed: ${
              err instanceof Error ? err.message : String(err)
            }`
          );
        }
        return {
          ...base,
          unreadable_by_worker: minus(sweepMissing, missingForEveryone),
          missing_for_everyone: missingForEveryone,
          source: 'last_sweep',
          checked_at: sweep.checkedAt,
        };
      }
    }
  }

  const role = await readRole();
  if (!role) {
    return {
      ...base,
      unreadable_by_worker: [],
      missing_for_everyone: missingForEveryone,
      source: 'unavailable',
      unavailable_reason: 'role_unreadable',
      checked_at: null,
    };
  }
  return {
    ...base,
    unreadable_by_worker: minus(
      uncoveredPatterns({ role, patterns: universe, isServerless }),
      missingForEveryone
    ),
    missing_for_everyone: missingForEveryone,
    source: 'role',
    checked_at: new Date().toISOString(),
  };
};
