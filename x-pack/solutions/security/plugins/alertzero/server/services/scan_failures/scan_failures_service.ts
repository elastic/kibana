/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest, Logger } from '@kbn/core/server';
import { SYSTEM_SECURITY_WORKER_CATALOG, type ScanFailuresResponse } from '@kbn/alertzero-common';
import type { WorkflowExecutionDto, WorkflowExecutionListDto } from '@kbn/workflows';
import pMap from 'p-map';
import {
  classifyScanFailureDefinition,
  isCatalogWorkerDefinition,
} from './scan_failure_classification';

export const SCAN_FAILURE_PAGE_SIZE = 100;
export const SCAN_FAILURE_MAX_PAGES = 5;
/** Parallel parent walks. Chains of one failure stay serial; siblings share the cache. */
const SCAN_FAILURE_ATTRIBUTION_CONCURRENCY = 8;
/** Worker → child → grandchild is the deepest AlertZero chain. Stop past that. */
const SCAN_FAILURE_MAX_PARENT_HOPS = 8;
const WORKFLOW_STEP_TRIGGER = 'workflow-step';

const EMPTY_SCAN_FAILURES: ScanFailuresResponse = { workers: [], unknown: false };

export type FailedExecutionPage = Pick<WorkflowExecutionListDto, 'results' | 'total'>;

export interface FailedExecutionSearch {
  searchFailedManagedExecutions(
    params: { page: number; size: number },
    spaceId: string,
    request: KibanaRequest
  ): Promise<FailedExecutionPage>;

  getWorkflowExecution(
    workflowExecutionId: string,
    spaceId: string,
    request: KibanaRequest
  ): Promise<WorkflowExecutionDto | null>;
}

interface AttributableExecution {
  id?: string;
  originManagedWorkflowId?: string | null;
  workflowId?: string;
  triggeredBy?: string;
  context?: { parentWorkflowExecutionId?: string };
}

type LoadExecution = (executionId: string) => Promise<AttributableExecution | null>;

const definitionIdOf = (execution: {
  originManagedWorkflowId?: string | null;
  workflowId?: string;
}): string | undefined => execution.originManagedWorkflowId || execution.workflowId || undefined;

const parentExecutionIdOf = (execution: AttributableExecution): string | undefined => {
  const parentId = execution.context?.parentWorkflowExecutionId;
  return typeof parentId === 'string' && parentId.length > 0 ? parentId : undefined;
};

/**
 * The catalog Worker that owns this failure.
 * A failed catalog Worker counts on its own. A child counts only when walking
 * `parentWorkflowExecutionId` reaches a catalog Worker. Anything else is skipped:
 * a manual test of a shared workflow is not a Worker scan.
 */
export const attributeFailedExecution = async (
  execution: AttributableExecution,
  loadExecution: LoadExecution
): Promise<string | undefined> => {
  const definitionId = definitionIdOf(execution);
  if (classifyScanFailureDefinition(definitionId).kind === 'exclude') {
    return undefined;
  }
  if (isCatalogWorkerDefinition(definitionId)) {
    return definitionId;
  }
  if (execution.triggeredBy !== WORKFLOW_STEP_TRIGGER) {
    return undefined;
  }

  const seen = new Set<string>();
  if (execution.id) {
    seen.add(execution.id);
  }
  let current = execution;

  for (let hop = 0; hop < SCAN_FAILURE_MAX_PARENT_HOPS; hop++) {
    let parentId = parentExecutionIdOf(current);
    if (!parentId && current.id) {
      const loaded = await loadExecution(current.id);
      parentId = loaded ? parentExecutionIdOf(loaded) : undefined;
    }
    if (!parentId || seen.has(parentId)) {
      return undefined;
    }
    seen.add(parentId);

    const parent = await loadExecution(parentId);
    if (!parent) {
      return undefined;
    }
    const parentDefinitionId = definitionIdOf(parent);
    if (isCatalogWorkerDefinition(parentDefinitionId)) {
      return parentDefinitionId;
    }
    if (parent.triggeredBy !== WORKFLOW_STEP_TRIGGER) {
      return undefined;
    }
    current = parent;
  }

  return undefined;
};

/** Folds failed executions onto distinct catalog Workers, in catalog order. */
export const foldFailedExecutions = async (
  executions: FailedExecutionPage['results'],
  loadExecution: LoadExecution
): Promise<ScanFailuresResponse> => {
  const attributed = await pMap(
    executions,
    (execution) => attributeFailedExecution(execution, loadExecution),
    { concurrency: SCAN_FAILURE_ATTRIBUTION_CONCURRENCY }
  );
  const workerIds = new Set<string>();

  for (const workerId of attributed) {
    if (workerId) {
      workerIds.add(workerId);
    }
  }

  const workers = SYSTEM_SECURITY_WORKER_CATALOG.filter((entry) => workerIds.has(entry.id)).map(
    (entry) => ({ workerId: entry.id, watchId: entry.watchId })
  );

  return { workers, unknown: false };
};

export const collectScanFailures = async (
  searchPage: (page: number) => Promise<FailedExecutionPage>,
  loadExecution: LoadExecution
): Promise<ScanFailuresResponse> => {
  const executions: FailedExecutionPage['results'] = [];
  let incomplete = false;

  for (let page = 1; page <= SCAN_FAILURE_MAX_PAGES; page++) {
    const { results, total } = await searchPage(page);
    executions.push(...results);

    // The same definition can be started by different Workers, so a definition
    // id on an earlier page does not mean later pages can be skipped.
    const coveredTheWindow =
      results.length === 0 ||
      results.length < SCAN_FAILURE_PAGE_SIZE ||
      page * SCAN_FAILURE_PAGE_SIZE >= total;

    if (coveredTheWindow) {
      break;
    }
    if (page === SCAN_FAILURE_MAX_PAGES) {
      incomplete = true;
    }
  }

  const folded = await foldFailedExecutions(executions, loadExecution);
  return incomplete ? { ...folded, unknown: true } : folded;
};

export class ScanFailuresService {
  constructor(
    private readonly executions: FailedExecutionSearch | undefined,
    private readonly logger: Logger
  ) {}

  async list(request: KibanaRequest, spaceId: string): Promise<ScanFailuresResponse> {
    const executions = this.executions;
    if (!executions) {
      this.logger.warn('Scan failure query skipped because workflows management is unavailable');
      return EMPTY_SCAN_FAILURES;
    }

    const pendingLoads = new Map<string, Promise<WorkflowExecutionDto | null>>();
    let lookupFailed = false;
    const loadExecution = (executionId: string) => {
      const pending = pendingLoads.get(executionId);
      if (pending) {
        return pending;
      }
      const next = executions.getWorkflowExecution(executionId, spaceId, request).catch(() => {
        // A missing parent is null. A thrown lookup is not, or one failed child
        // would make the other Workers look like the complete set.
        lookupFailed = true;
        return null;
      });
      pendingLoads.set(executionId, next);
      return next;
    };

    try {
      const failures = await collectScanFailures(
        (page) =>
          executions.searchFailedManagedExecutions(
            { page, size: SCAN_FAILURE_PAGE_SIZE },
            spaceId,
            request
          ),
        loadExecution
      );
      return lookupFailed ? { ...failures, unknown: true } : failures;
    } catch (error) {
      this.logger.warn(
        `Scan failure query failed: ${error instanceof Error ? error.message : String(error)}`
      );
      return EMPTY_SCAN_FAILURES;
    }
  }
}
