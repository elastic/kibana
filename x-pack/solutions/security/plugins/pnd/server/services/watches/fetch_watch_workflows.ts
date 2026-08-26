/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import {
  getManagedWorkflowSelectorVisibilityContext,
  type WorkflowDetailDto,
  type WorkflowListItemDto,
} from '@kbn/workflows';
import type { PluginScopedManagedWorkflowsApi } from '@kbn/workflows/server/types';
import { WATCH_TAG } from '@kbn/pnd-common';
import { PND_MANAGED_WORKFLOW_OWNER_ID } from '../../../common/constants';
import { watchRegistry, type WatchRegistration } from '../../managed_workflows/watch_registry';
import type { WatchWorkflowsManagementClient } from './watch_workflows_management_client';

const WATCH_VISIBILITY_CONTEXT = getManagedWorkflowSelectorVisibilityContext('watch');
const WORKFLOW_PAGE_SIZE = 100;
const WORKFLOW_MAX_RESULTS = 10_000;

export const toWatchListItem = (detail: WorkflowDetailDto): WorkflowListItemDto => ({
  id: detail.id,
  name: detail.name,
  description: detail.description ?? '',
  enabled: detail.enabled,
  managed: detail.managed,
  managedBy: detail.managedBy,
  definition: detail.definition,
  createdAt: detail.createdAt,
  tags: detail.definition?.tags ?? [],
  valid: detail.valid,
  history: undefined,
});

export interface FetchedWatchWorkflows {
  /** All watch workflow items — paginated results plus individually fetched installed-but-omitted catalog
   * watches. IDs are normalized to the canonical registration ID where applicable. */
  items: WorkflowListItemDto[];
  /** Registered watches that have no installed workflow document. */
  notInstalledRegistrations: WatchRegistration[];
}

/**
 * Fetches the full set of PND watch workflows for a space.
 *
 * Paginates `getWorkflows` to collect all tagged watches, then reconciles the results against the
 * registered catalog: installed watches that were excluded by the visibility selector are fetched
 * individually; uninstalled registered watches are reported separately so callers can render
 * not-installed placeholder rows.
 *
 * When `managedWorkflows` is undefined the catalog reconciliation step is skipped and only the
 * paginated search results are returned.
 */
export const fetchWatchWorkflows = async (
  management: WatchWorkflowsManagementClient,
  managedWorkflows: PluginScopedManagedWorkflowsApi | undefined,
  spaceId: string,
  logger: Logger,
  opts: { includeExecutionHistory?: boolean } = {}
): Promise<FetchedWatchWorkflows> => {
  // Paginate until all results are collected or the safety cap is hit.
  const allResults: WorkflowListItemDto[] = [];
  let page = 1;
  while (true) {
    const result = await management.getWorkflows(
      {
        tags: [WATCH_TAG],
        size: WORKFLOW_PAGE_SIZE,
        page,
        enabled: [true, false],
        managedFilter: 'all',
        visibilityContext: [WATCH_VISIBILITY_CONTEXT],
      },
      spaceId,
      {
        includeExecutionHistory: opts.includeExecutionHistory ?? false,
        includeManagedExecutionHistory: opts.includeExecutionHistory ?? false,
      }
    );
    allResults.push(...result.results);
    if (allResults.length >= result.total || allResults.length >= WORKFLOW_MAX_RESULTS) break;
    page++;
  }

  if (!managedWorkflows) {
    return { items: allResults, notInstalledRegistrations: [] };
  }

  // Resolve the per-space workflow document ID for every registered catalog watch.
  const statuses = await Promise.all(
    watchRegistry.list().map(async (registration) => ({
      registration,
      status: await managedWorkflows.getWorkflowStatus(registration.id, {
        spaceId,
        workflowIdSuffix: spaceId,
      }),
    }))
  );
  const registrationByDocumentId = new Map(
    statuses.map(({ registration, status }) => [status.workflowId, registration])
  );

  // Filter out legacy global PND-managed documents (pre-per-space era) and normalize IDs.
  const items: WorkflowListItemDto[] = allResults
    .filter((item) => {
      const isLegacyGlobalWatch =
        item.managedBy === PND_MANAGED_WORKFLOW_OWNER_ID &&
        watchRegistry.get(item.id) !== undefined;
      return !isLegacyGlobalWatch;
    })
    .map((item) => {
      const registration = registrationByDocumentId.get(item.id);
      return registration ? { ...item, id: registration.id } : item;
    });

  // Fetch registered watches that are installed but were omitted from the search results
  // (e.g. excluded by the visibility selector or beyond the pagination cap).
  const foundIds = new Set(items.map(({ id }) => id));
  const notInstalledRegistrations: WatchRegistration[] = [];

  await Promise.all(
    statuses
      .filter(({ registration }) => !foundIds.has(registration.id))
      .map(async ({ registration, status }) => {
        if (status.installed) {
          try {
            const detail = await management.getWorkflow(status.workflowId, spaceId);
            if (detail) {
              items.push({ ...toWatchListItem(detail), id: registration.id });
              return;
            }
          } catch (error) {
            logger.debug(
              `Failed to fetch installed watch ${registration.id}: ${
                error instanceof Error ? error.message : String(error)
              }`
            );
          }
        }
        notInstalledRegistrations.push(registration);
      })
  );

  return { items, notInstalledRegistrations };
};
