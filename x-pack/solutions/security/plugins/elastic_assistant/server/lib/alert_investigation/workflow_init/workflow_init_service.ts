/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createHash } from 'crypto';
import type { Logger, KibanaRequest } from '@kbn/core/server';

import {
  PIPELINE_WORKFLOW_YAML,
  PIPELINE_WORKFLOW_VERSION,
  PIPELINE_WORKFLOW_ID_PREFIX,
} from './pipeline_workflow_yaml';

/**
 * Minimal interface for the WorkflowsManagement API.
 * Avoids direct dependency on the workflows_management plugin types.
 */
interface WorkflowManagementApi {
  getWorkflow(id: string, spaceId: string): Promise<{
    id: string;
    yaml: string;
    valid: boolean;
    enabled: boolean;
  } | null>;
  bulkCreateWorkflows(
    workflows: Array<{ id?: string; yaml: string }>,
    spaceId: string,
    request: KibanaRequest,
    options?: { overwrite?: boolean }
  ): Promise<{
    created: Array<{ id: string; valid: boolean }>;
    failed: Array<{ index: number; id: string; error: string }>;
  }>;
  updateWorkflow(
    id: string,
    workflow: Partial<{ enabled: boolean }>,
    spaceId: string,
    request: KibanaRequest
  ): Promise<unknown>;
}

interface WorkflowInitResult {
  workflowId: string;
  action: 'created' | 'verified' | 'repaired';
  valid: boolean;
}

/**
 * WorkflowInitService ensures the Alert Investigation Pipeline workflow
 * exists and is healthy per Kibana space.
 *
 * Features:
 * - **Lazy initialization**: Workflow created on first use, not at plugin boot
 * - **Per-space isolation**: Each space gets its own workflow instance
 * - **Self-healing**: Detects deleted/modified/disabled workflows and repairs them
 * - **Idempotent**: Safe to call multiple times (uses overwrite: true)
 *
 * Inspired by Andrew Goldstein's WorkflowInitService pattern.
 */
export class WorkflowInitService {
  private readonly initializedSpaces = new Map<string, string>(); // spaceId → workflowId
  private readonly yamlChecksum: string;

  constructor(
    private readonly logger: Logger,
    private readonly workflowsManagement?: WorkflowManagementApi
  ) {
    this.yamlChecksum = this.computeChecksum(PIPELINE_WORKFLOW_YAML);
  }

  /**
   * Ensure the pipeline workflow exists in the given space.
   * Returns the workflow ID for use in subsequent API calls.
   *
   * Call this lazily — on first pipeline run per space, not on every request.
   */
  async ensureWorkflowForSpace(
    spaceId: string,
    request: KibanaRequest
  ): Promise<WorkflowInitResult> {
    if (!this.workflowsManagement) {
      throw new Error('WorkflowsManagement plugin not available');
    }

    const workflowId = `${PIPELINE_WORKFLOW_ID_PREFIX}-${spaceId}`;

    // Fast path: already verified this session
    if (this.initializedSpaces.has(spaceId)) {
      return {
        workflowId: this.initializedSpaces.get(spaceId)!,
        action: 'verified',
        valid: true,
      };
    }

    try {
      const existing = await this.workflowsManagement.getWorkflow(workflowId, spaceId);

      if (existing) {
        // Workflow exists — verify integrity
        const result = await this.verifyIntegrity(existing, spaceId, request);
        this.initializedSpaces.set(spaceId, workflowId);
        return result;
      }

      // Workflow doesn't exist — create it
      const result = await this.createWorkflow(workflowId, spaceId, request);
      this.initializedSpaces.set(spaceId, workflowId);
      return result;
    } catch (error) {
      this.logger.error(
        `Failed to ensure workflow for space ${spaceId}: ${
          error instanceof Error ? error.message : error
        }`
      );
      throw error;
    }
  }

  /**
   * Verify an existing workflow's integrity.
   * Repairs if: deleted definition, wrong version, disabled, or invalid.
   */
  private async verifyIntegrity(
    existing: { id: string; yaml: string; valid: boolean; enabled: boolean },
    spaceId: string,
    request: KibanaRequest
  ): Promise<WorkflowInitResult> {
    const workflowId = existing.id;
    const existingChecksum = this.computeChecksum(existing.yaml);

    // Check 1: YAML matches bundled version
    if (existingChecksum !== this.yamlChecksum) {
      this.logger.info(
        `Workflow ${workflowId} YAML changed (expected ${this.yamlChecksum.substring(0, 8)}, ` +
          `got ${existingChecksum.substring(0, 8)}). Repairing...`
      );
      return this.createWorkflow(workflowId, spaceId, request, 'repaired');
    }

    // Check 2: Workflow is valid
    if (!existing.valid) {
      this.logger.info(`Workflow ${workflowId} is invalid. Repairing...`);
      return this.createWorkflow(workflowId, spaceId, request, 'repaired');
    }

    // Check 3: Workflow is enabled
    if (!existing.enabled) {
      this.logger.info(`Workflow ${workflowId} is disabled. Re-enabling...`);
      try {
        await this.workflowsManagement!.updateWorkflow(
          workflowId,
          { enabled: true },
          spaceId,
          request
        );
      } catch {
        // Fall back to full recreate
        return this.createWorkflow(workflowId, spaceId, request, 'repaired');
      }
      return { workflowId, action: 'repaired', valid: true };
    }

    this.logger.debug(`Workflow ${workflowId} verified OK for space ${spaceId}`);
    return { workflowId, action: 'verified', valid: true };
  }

  /**
   * Create or overwrite the pipeline workflow.
   */
  private async createWorkflow(
    workflowId: string,
    spaceId: string,
    request: KibanaRequest,
    action: 'created' | 'repaired' = 'created'
  ): Promise<WorkflowInitResult> {
    const result = await this.workflowsManagement!.bulkCreateWorkflows(
      [{ id: workflowId, yaml: PIPELINE_WORKFLOW_YAML }],
      spaceId,
      request,
      { overwrite: true }
    );

    if (result.failed.length > 0) {
      const failure = result.failed[0];
      this.logger.error(`Failed to create workflow ${workflowId}: ${failure.error}`);
      return { workflowId, action, valid: false };
    }

    const created = result.created[0];
    this.logger.info(
      `${action === 'repaired' ? 'Repaired' : 'Created'} pipeline workflow ` +
        `${workflowId} for space ${spaceId} (valid=${created.valid}, version=${PIPELINE_WORKFLOW_VERSION})`
    );

    return { workflowId, action, valid: created.valid };
  }

  /**
   * Force re-initialization for a space (e.g., after config change).
   */
  invalidateSpace(spaceId: string): void {
    this.initializedSpaces.delete(spaceId);
  }

  /**
   * Force re-initialization for all spaces.
   */
  invalidateAll(): void {
    this.initializedSpaces.clear();
  }

  /**
   * Get the workflow ID for a space (without ensuring it exists).
   */
  getWorkflowId(spaceId: string): string {
    return `${PIPELINE_WORKFLOW_ID_PREFIX}-${spaceId}`;
  }

  /**
   * Check if a space has been initialized this session.
   */
  isInitialized(spaceId: string): boolean {
    return this.initializedSpaces.has(spaceId);
  }

  private computeChecksum(yaml: string): string {
    return createHash('sha256').update(yaml.trim()).digest('hex');
  }
}
