/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest, Logger } from '@kbn/core/server';
import { SYSTEM_SECURITY_WORKER_CATALOG, type ScanFailuresResponse } from '@kbn/alertzero-common';
import type { WorkflowExecutionDto, WorkflowExecutionListDto } from '@kbn/workflows';
import {
  SCAN_FAILURE_DEFINITION_IDS,
  classifyScanFailureDefinition,
  isCatalogWorkerDefinition,
} from './scan_failure_classification';

export const SCAN_FAILURE_PAGE_SIZE = 100;
export const SCAN_FAILURE_MAX_PAGES = 5;
/** Worker → child → grandchild is the deepest AlertZero chain. Stop past that. */
const SCAN_FAILURE_MAX_PARENT_HOPS = 8;
const WORKFLOW_STEP_TRIGGER = 'workflow-step';

const EMPTY_SCAN_FAILURES: ScanFailuresResponse = { workers: [], unknown: false };

const CLASSIFIED_DEFINITION_IDS = new Set<string>(SCAN_FAILURE_DEFINITION_IDS);

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
  const workerIds = new Set<string>();

  for (const execution of executions) {
    const workerId = await attributeFailedExecution(execution, loadExecution);
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
  const seenDefinitionIds = new Set<string>();
  const executions: FailedExecutionPage['results'] = [];

  for (let page = 1; page <= SCAN_FAILURE_MAX_PAGES; page++) {
    const { results, total } = await searchPage(page);
    executions.push(...results);

    for (const execution of results) {
      const definitionId = definitionIdOf(execution);
      if (definitionId && CLASSIFIED_DEFINITION_IDS.has(definitionId)) {
        seenDefinitionIds.add(definitionId);
      }
    }

    const everyClassifiedIdSeen = SCAN_FAILURE_DEFINITION_IDS.every((id) =>
      seenDefinitionIds.has(id)
    );
    const noFurtherPage =
      results.length === 0 ||
      results.length < SCAN_FAILURE_PAGE_SIZE ||
      page * SCAN_FAILURE_PAGE_SIZE >= total;

    if (everyClassifiedIdSeen || noFurtherPage) {
      break;
    }
  }

  return foldFailedExecutions(executions, loadExecution);
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

    const loadExecution = (executionId: string) =>
      executions.getWorkflowExecution(executionId, spaceId, request).catch(() => null);

    try {
      return await collectScanFailures(
        (page) =>
          executions.searchFailedManagedExecutions(
            { page, size: SCAN_FAILURE_PAGE_SIZE },
            spaceId,
            request
          ),
        loadExecution
      );
    } catch (error) {
      this.logger.warn(
        `Scan failure query failed: ${error instanceof Error ? error.message : String(error)}`
      );
      return EMPTY_SCAN_FAILURES;
    }
  }
}
