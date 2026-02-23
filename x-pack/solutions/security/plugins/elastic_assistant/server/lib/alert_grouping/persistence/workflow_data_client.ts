/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/logging';
import type {
  SavedObjectsClientContract,
  SavedObjectsFindOptions,
  SavedObject,
} from '@kbn/core-saved-objects-api-server';
import { v4 as uuidv4 } from 'uuid';

import type {
  AlertGroupingWorkflowConfig,
  WorkflowExecution,
  WorkflowExecutionMetrics,
  WorkflowExecutionStatus,
  CaseTriggerConfig,
  BatchSizeCache,
} from '../types';
import {
  ALERT_GROUPING_WORKFLOW_SO_TYPE,
  ALERT_GROUPING_EXECUTION_SO_TYPE,
  CASE_TRIGGER_SO_TYPE,
  BATCH_SIZE_CACHE_SO_TYPE,
  MAX_WORKFLOWS_PER_SPACE,
  MAX_TRIGGERS_PER_SPACE,
} from './constants';

/**
 * Saved object attributes for workflow
 */
interface WorkflowSavedObjectAttributes {
  name: string;
  description?: string;
  enabled: boolean;
  schedule: string; // JSON stringified
  alertFilter?: string; // JSON stringified
  groupingConfig: string; // JSON stringified
  attackDiscoveryConfig?: string; // JSON stringified
  apiConfig?: string; // JSON stringified
  caseTemplate?: string; // JSON stringified
  tags?: string[];
  spaceId: string;
  createdAt: string;
  createdBy: string;
  updatedAt: string;
  updatedBy?: string;
}

/**
 * Saved object attributes for workflow execution
 */
interface ExecutionSavedObjectAttributes {
  workflowId: string;
  status: WorkflowExecutionStatus;
  startedAt: string;
  completedAt?: string;
  triggeredBy: 'schedule' | 'manual' | 'trigger';
  error?: string;
  metrics?: string; // JSON stringified
  isDryRun: boolean;
  spaceId: string;
}

/**
 * Saved object attributes for case trigger
 */
interface TriggerSavedObjectAttributes {
  name: string;
  description?: string;
  enabled: boolean;
  eventType: string;
  conditions?: string; // JSON stringified
  action: string; // JSON stringified
  spaceId: string;
  createdAt: string;
  createdBy: string;
  lastTriggered?: string;
  triggerCount: number;
}

/**
 * Saved object attributes for batch size cache
 */
interface BatchSizeCacheSavedObjectAttributes {
  connectorId: string;
  batchSize: number;
  updatedAt: string;
}

/**
 * Data client for alert grouping workflow persistence
 */
export class WorkflowDataClient {
  private readonly logger: Logger;
  private readonly soClient: SavedObjectsClientContract;
  private readonly spaceId: string;
  private readonly currentUser: string;

  constructor({
    logger,
    soClient,
    spaceId,
    currentUser,
  }: {
    logger: Logger;
    soClient: SavedObjectsClientContract;
    spaceId: string;
    currentUser: string;
  }) {
    this.logger = logger;
    this.soClient = soClient;
    this.spaceId = spaceId;
    this.currentUser = currentUser;
  }

  // ============================================================================
  // WORKFLOW CRUD
  // ============================================================================

  /**
   * Create a new workflow
   */
  async createWorkflow(
    config: Omit<AlertGroupingWorkflowConfig, 'id' | 'createdAt' | 'createdBy' | 'updatedAt' | 'spaceId'>
  ): Promise<AlertGroupingWorkflowConfig> {
    // Check workflow limit
    const existingCount = await this.countWorkflows();
    if (existingCount >= MAX_WORKFLOWS_PER_SPACE) {
      throw new Error(`Maximum number of workflows (${MAX_WORKFLOWS_PER_SPACE}) reached for this space`);
    }

    const id = uuidv4();
    const now = new Date().toISOString();

    const attributes: WorkflowSavedObjectAttributes = {
      name: config.name,
      description: config.description,
      enabled: config.enabled ?? true,
      schedule: JSON.stringify(config.schedule),
      alertFilter: config.alertFilter ? JSON.stringify(config.alertFilter) : undefined,
      groupingConfig: JSON.stringify(config.groupingConfig),
      attackDiscoveryConfig: config.attackDiscoveryConfig
        ? JSON.stringify(config.attackDiscoveryConfig)
        : undefined,
      apiConfig: config.apiConfig ? JSON.stringify(config.apiConfig) : undefined,
      caseTemplate: config.caseTemplate ? JSON.stringify(config.caseTemplate) : undefined,
      tags: config.tags,
      spaceId: this.spaceId,
      createdAt: now,
      createdBy: this.currentUser,
      updatedAt: now,
    };

    const savedObject = await this.soClient.create<WorkflowSavedObjectAttributes>(
      ALERT_GROUPING_WORKFLOW_SO_TYPE,
      attributes,
      { id }
    );

    this.logger.info(`Created alert grouping workflow: ${id}`);

    return this.savedObjectToWorkflow(savedObject);
  }

  /**
   * Get a workflow by ID
   */
  async getWorkflow(id: string): Promise<AlertGroupingWorkflowConfig | null> {
    try {
      const savedObject = await this.soClient.get<WorkflowSavedObjectAttributes>(
        ALERT_GROUPING_WORKFLOW_SO_TYPE,
        id
      );

      // Verify space
      if (savedObject.attributes.spaceId !== this.spaceId) {
        return null;
      }

      return this.savedObjectToWorkflow(savedObject);
    } catch (error) {
      if ((error as { output?: { statusCode?: number } }).output?.statusCode === 404) {
        return null;
      }
      throw error;
    }
  }

  /**
   * Update a workflow
   */
  async updateWorkflow(
    id: string,
    updates: Partial<Omit<AlertGroupingWorkflowConfig, 'id' | 'createdAt' | 'createdBy' | 'spaceId'>>
  ): Promise<AlertGroupingWorkflowConfig | null> {
    const existing = await this.getWorkflow(id);
    if (!existing) {
      return null;
    }

    const now = new Date().toISOString();

    const attributes: Partial<WorkflowSavedObjectAttributes> = {
      updatedAt: now,
      updatedBy: this.currentUser,
    };

    if (updates.name !== undefined) attributes.name = updates.name;
    if (updates.description !== undefined) attributes.description = updates.description;
    if (updates.enabled !== undefined) attributes.enabled = updates.enabled;
    if (updates.schedule !== undefined) attributes.schedule = JSON.stringify(updates.schedule);
    if (updates.alertFilter !== undefined)
      attributes.alertFilter = JSON.stringify(updates.alertFilter);
    if (updates.groupingConfig !== undefined)
      attributes.groupingConfig = JSON.stringify(updates.groupingConfig);
    if (updates.attackDiscoveryConfig !== undefined)
      attributes.attackDiscoveryConfig = JSON.stringify(updates.attackDiscoveryConfig);
    if (updates.apiConfig !== undefined) attributes.apiConfig = JSON.stringify(updates.apiConfig);
    if (updates.caseTemplate !== undefined)
      attributes.caseTemplate = JSON.stringify(updates.caseTemplate);
    if (updates.tags !== undefined) attributes.tags = updates.tags;

    const savedObject = await this.soClient.update<WorkflowSavedObjectAttributes>(
      ALERT_GROUPING_WORKFLOW_SO_TYPE,
      id,
      attributes,
      { refresh: 'wait_for' }
    );

    this.logger.info(`Updated alert grouping workflow: ${id}`);

    return this.getWorkflow(id);
  }

  /**
   * Delete a workflow
   */
  async deleteWorkflow(id: string, deleteHistory = false): Promise<boolean> {
    const existing = await this.getWorkflow(id);
    if (!existing) {
      return false;
    }

    await this.soClient.delete(ALERT_GROUPING_WORKFLOW_SO_TYPE, id);

    // Optionally delete execution history
    if (deleteHistory) {
      await this.deleteExecutionHistory(id);
    }

    this.logger.info(`Deleted alert grouping workflow: ${id}`);

    return true;
  }

  /**
   * Find workflows
   */
  async findWorkflows(options?: {
    page?: number;
    perPage?: number;
    enabled?: boolean;
  }): Promise<{ workflows: AlertGroupingWorkflowConfig[]; total: number }> {
    const findOptions: SavedObjectsFindOptions = {
      type: ALERT_GROUPING_WORKFLOW_SO_TYPE,
      page: options?.page ?? 1,
      perPage: options?.perPage ?? 20,
      filter: `${ALERT_GROUPING_WORKFLOW_SO_TYPE}.attributes.spaceId: "${this.spaceId}"`,
      sortField: 'updatedAt',
      sortOrder: 'desc',
    };

    if (options?.enabled !== undefined) {
      findOptions.filter += ` AND ${ALERT_GROUPING_WORKFLOW_SO_TYPE}.attributes.enabled: ${options.enabled}`;
    }

    const result = await this.soClient.find<WorkflowSavedObjectAttributes>(findOptions);

    return {
      workflows: result.saved_objects.map((so) => this.savedObjectToWorkflow(so)),
      total: result.total,
    };
  }

  /**
   * Count workflows in current space
   */
  async countWorkflows(): Promise<number> {
    const result = await this.soClient.find<WorkflowSavedObjectAttributes>({
      type: ALERT_GROUPING_WORKFLOW_SO_TYPE,
      filter: `${ALERT_GROUPING_WORKFLOW_SO_TYPE}.attributes.spaceId: "${this.spaceId}"`,
      perPage: 0,
    });
    return result.total;
  }

  // ============================================================================
  // WORKFLOW EXECUTIONS
  // ============================================================================

  /**
   * Create a workflow execution record
   */
  async createExecution(
    workflowId: string,
    triggeredBy: 'schedule' | 'manual' | 'trigger',
    isDryRun = false
  ): Promise<WorkflowExecution> {
    const id = uuidv4();
    const now = new Date().toISOString();

    const attributes: ExecutionSavedObjectAttributes = {
      workflowId,
      status: 'running' as WorkflowExecutionStatus,
      startedAt: now,
      triggeredBy,
      isDryRun,
      spaceId: this.spaceId,
    };

    await this.soClient.create<ExecutionSavedObjectAttributes>(
      ALERT_GROUPING_EXECUTION_SO_TYPE,
      attributes,
      { id }
    );

    return {
      id,
      workflowId,
      status: 'running' as WorkflowExecutionStatus,
      startedAt: now,
      triggeredBy,
      isDryRun,
    };
  }

  /**
   * Update execution status
   */
  async updateExecution(
    id: string,
    updates: {
      status?: WorkflowExecutionStatus;
      completedAt?: string;
      error?: string;
      metrics?: WorkflowExecutionMetrics;
    }
  ): Promise<void> {
    const attributes: Partial<ExecutionSavedObjectAttributes> = {};

    if (updates.status !== undefined) attributes.status = updates.status;
    if (updates.completedAt !== undefined) attributes.completedAt = updates.completedAt;
    if (updates.error !== undefined) attributes.error = updates.error;
    if (updates.metrics !== undefined) attributes.metrics = JSON.stringify(updates.metrics);

    await this.soClient.update<ExecutionSavedObjectAttributes>(
      ALERT_GROUPING_EXECUTION_SO_TYPE,
      id,
      attributes
    );
  }

  /**
   * Find executions for a workflow
   */
  async findExecutions(
    workflowId: string,
    options?: {
      page?: number;
      perPage?: number;
      status?: WorkflowExecutionStatus;
      start?: string;
      end?: string;
    }
  ): Promise<{ executions: WorkflowExecution[]; total: number }> {
    let filter = `${ALERT_GROUPING_EXECUTION_SO_TYPE}.attributes.workflowId: "${workflowId}"`;
    filter += ` AND ${ALERT_GROUPING_EXECUTION_SO_TYPE}.attributes.spaceId: "${this.spaceId}"`;

    if (options?.status) {
      filter += ` AND ${ALERT_GROUPING_EXECUTION_SO_TYPE}.attributes.status: "${options.status}"`;
    }

    const findOptions: SavedObjectsFindOptions = {
      type: ALERT_GROUPING_EXECUTION_SO_TYPE,
      page: options?.page ?? 1,
      perPage: options?.perPage ?? 20,
      filter,
      sortField: 'startedAt',
      sortOrder: 'desc',
    };

    const result = await this.soClient.find<ExecutionSavedObjectAttributes>(findOptions);

    return {
      executions: result.saved_objects.map((so) => this.savedObjectToExecution(so)),
      total: result.total,
    };
  }

  /**
   * Delete execution history for a workflow
   */
  async deleteExecutionHistory(workflowId: string): Promise<void> {
    const { executions } = await this.findExecutions(workflowId, { perPage: 1000 });
    
    if (executions.length > 0) {
      await Promise.all(
        executions.map((execution) =>
          this.soClient.delete(ALERT_GROUPING_EXECUTION_SO_TYPE, execution.id)
        )
      );
    }
  }

  // ============================================================================
  // CASE TRIGGERS
  // ============================================================================

  /**
   * Create a case trigger
   */
  async createTrigger(
    config: Omit<CaseTriggerConfig, 'id' | 'createdAt' | 'createdBy' | 'spaceId' | 'triggerCount'>
  ): Promise<CaseTriggerConfig> {
    // Check trigger limit
    const existingCount = await this.countTriggers();
    if (existingCount >= MAX_TRIGGERS_PER_SPACE) {
      throw new Error(`Maximum number of triggers (${MAX_TRIGGERS_PER_SPACE}) reached for this space`);
    }

    const id = uuidv4();
    const now = new Date().toISOString();

    const attributes: TriggerSavedObjectAttributes = {
      name: config.name,
      description: config.description,
      enabled: config.enabled ?? true,
      eventType: config.eventType,
      conditions: config.conditions ? JSON.stringify(config.conditions) : undefined,
      action: JSON.stringify(config.action),
      spaceId: this.spaceId,
      createdAt: now,
      createdBy: this.currentUser,
      triggerCount: 0,
    };

    const savedObject = await this.soClient.create<TriggerSavedObjectAttributes>(
      CASE_TRIGGER_SO_TYPE,
      attributes,
      { id }
    );

    this.logger.info(`Created case trigger: ${id}`);

    return this.savedObjectToTrigger(savedObject);
  }

  /**
   * Get a trigger by ID
   */
  async getTrigger(id: string): Promise<CaseTriggerConfig | null> {
    try {
      const savedObject = await this.soClient.get<TriggerSavedObjectAttributes>(
        CASE_TRIGGER_SO_TYPE,
        id
      );

      if (savedObject.attributes.spaceId !== this.spaceId) {
        return null;
      }

      return this.savedObjectToTrigger(savedObject);
    } catch (error) {
      if ((error as { output?: { statusCode?: number } }).output?.statusCode === 404) {
        return null;
      }
      throw error;
    }
  }

  /**
   * Delete a trigger
   */
  async deleteTrigger(id: string): Promise<boolean> {
    const existing = await this.getTrigger(id);
    if (!existing) {
      return false;
    }

    await this.soClient.delete(CASE_TRIGGER_SO_TYPE, id);
    this.logger.info(`Deleted case trigger: ${id}`);

    return true;
  }

  /**
   * Find triggers
   */
  async findTriggers(options?: {
    page?: number;
    perPage?: number;
    eventType?: string;
  }): Promise<{ triggers: CaseTriggerConfig[]; total: number }> {
    let filter = `${CASE_TRIGGER_SO_TYPE}.attributes.spaceId: "${this.spaceId}"`;

    if (options?.eventType) {
      filter += ` AND ${CASE_TRIGGER_SO_TYPE}.attributes.eventType: "${options.eventType}"`;
    }

    const findOptions: SavedObjectsFindOptions = {
      type: CASE_TRIGGER_SO_TYPE,
      page: options?.page ?? 1,
      perPage: options?.perPage ?? 20,
      filter,
      sortField: 'createdAt',
      sortOrder: 'desc',
    };

    const result = await this.soClient.find<TriggerSavedObjectAttributes>(findOptions);

    return {
      triggers: result.saved_objects.map((so) => this.savedObjectToTrigger(so)),
      total: result.total,
    };
  }

  /**
   * Count triggers in current space
   */
  async countTriggers(): Promise<number> {
    const result = await this.soClient.find<TriggerSavedObjectAttributes>({
      type: CASE_TRIGGER_SO_TYPE,
      filter: `${CASE_TRIGGER_SO_TYPE}.attributes.spaceId: "${this.spaceId}"`,
      perPage: 0,
    });
    return result.total;
  }

  /**
   * Record trigger execution
   */
  async recordTriggerExecution(id: string): Promise<void> {
    const trigger = await this.getTrigger(id);
    if (!trigger) {
      return;
    }

    const now = new Date().toISOString();
    await this.soClient.update<TriggerSavedObjectAttributes>(CASE_TRIGGER_SO_TYPE, id, {
      lastTriggered: now,
      triggerCount: (trigger.triggerCount ?? 0) + 1,
    });
  }

  // ============================================================================
  // BATCH SIZE CACHE
  // ============================================================================

  /**
   * Get cached batch size for a connector
   */
  async getCachedBatchSize(connectorId: string): Promise<number | null> {
    try {
      const result = await this.soClient.find<BatchSizeCacheSavedObjectAttributes>({
        type: BATCH_SIZE_CACHE_SO_TYPE,
        filter: `${BATCH_SIZE_CACHE_SO_TYPE}.attributes.connectorId: "${connectorId}"`,
        perPage: 1,
      });

      if (result.total > 0) {
        return result.saved_objects[0].attributes.batchSize;
      }
      return null;
    } catch {
      return null;
    }
  }

  /**
   * Cache batch size for a connector
   */
  async cacheBatchSize(connectorId: string, batchSize: number): Promise<void> {
    const now = new Date().toISOString();

    // Find existing cache entry
    const result = await this.soClient.find<BatchSizeCacheSavedObjectAttributes>({
      type: BATCH_SIZE_CACHE_SO_TYPE,
      filter: `${BATCH_SIZE_CACHE_SO_TYPE}.attributes.connectorId: "${connectorId}"`,
      perPage: 1,
    });

    if (result.total > 0) {
      // Update existing
      await this.soClient.update<BatchSizeCacheSavedObjectAttributes>(
        BATCH_SIZE_CACHE_SO_TYPE,
        result.saved_objects[0].id,
        { batchSize, updatedAt: now }
      );
    } else {
      // Create new
      await this.soClient.create<BatchSizeCacheSavedObjectAttributes>(BATCH_SIZE_CACHE_SO_TYPE, {
        connectorId,
        batchSize,
        updatedAt: now,
      });
    }

    this.logger.debug(`Cached batch size ${batchSize} for connector ${connectorId}`);
  }

  // ============================================================================
  // HELPERS
  // ============================================================================

  private savedObjectToWorkflow(
    so: SavedObject<WorkflowSavedObjectAttributes>
  ): AlertGroupingWorkflowConfig {
    const attrs = so.attributes;
    return {
      id: so.id,
      name: attrs.name,
      description: attrs.description,
      enabled: attrs.enabled,
      schedule: JSON.parse(attrs.schedule),
      alertFilter: attrs.alertFilter ? JSON.parse(attrs.alertFilter) : undefined,
      groupingConfig: JSON.parse(attrs.groupingConfig),
      attackDiscoveryConfig: attrs.attackDiscoveryConfig
        ? JSON.parse(attrs.attackDiscoveryConfig)
        : undefined,
      apiConfig: attrs.apiConfig ? JSON.parse(attrs.apiConfig) : undefined,
      caseTemplate: attrs.caseTemplate ? JSON.parse(attrs.caseTemplate) : undefined,
      tags: attrs.tags,
      spaceId: attrs.spaceId,
      createdAt: attrs.createdAt,
      createdBy: attrs.createdBy,
      updatedAt: attrs.updatedAt,
      updatedBy: attrs.updatedBy,
    };
  }

  private savedObjectToExecution(
    so: SavedObject<ExecutionSavedObjectAttributes>
  ): WorkflowExecution {
    const attrs = so.attributes;
    return {
      id: so.id,
      workflowId: attrs.workflowId,
      status: attrs.status,
      startedAt: attrs.startedAt,
      completedAt: attrs.completedAt,
      triggeredBy: attrs.triggeredBy,
      error: attrs.error,
      metrics: attrs.metrics ? JSON.parse(attrs.metrics) : undefined,
      isDryRun: attrs.isDryRun,
    };
  }

  private savedObjectToTrigger(so: SavedObject<TriggerSavedObjectAttributes>): CaseTriggerConfig {
    const attrs = so.attributes;
    return {
      id: so.id,
      name: attrs.name,
      description: attrs.description,
      enabled: attrs.enabled,
      eventType: attrs.eventType as CaseTriggerConfig['eventType'],
      conditions: attrs.conditions ? JSON.parse(attrs.conditions) : undefined,
      action: JSON.parse(attrs.action),
      spaceId: attrs.spaceId,
      createdAt: attrs.createdAt,
      createdBy: attrs.createdBy,
      lastTriggered: attrs.lastTriggered,
      triggerCount: attrs.triggerCount,
    };
  }
}
