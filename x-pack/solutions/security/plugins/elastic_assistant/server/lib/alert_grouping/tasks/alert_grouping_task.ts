/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger, CoreStart } from '@kbn/core/server';
import type {
  ConcreteTaskInstance,
  TaskManagerSetupContract,
  TaskManagerStartContract,
} from '@kbn/task-manager-plugin/server';
import type { ActionsClient } from '@kbn/actions-plugin/server';
import type { CasesServerStart } from '@kbn/cases-plugin/server';
import { GEN_AI_SETTINGS_DEFAULT_AI_CONNECTOR } from '@kbn/management-settings-ids';

import { ALERT_GROUPING_TASK_TYPE } from '../persistence/constants';
import { WorkflowDataClient } from '../persistence';
import { AlertGroupingWorkflowExecutor } from '../workflows/default_alert_grouping_workflow';
import {
  createCase,
  attachAlertsToCase,
  fetchOpenSecurityCases,
  type CasesClientLike,
} from '../helpers';
import { generateAttackDiscoveries } from '../../../routes/attack_discovery/helpers/generate_discoveries';
import { getDefaultAnonymizationFields } from '../../../../common/anonymization';
import type { AIAssistantService } from '../../../ai_assistant_service';

const TASK_TIMEOUT = '10m';

export interface AlertGroupingTaskState {
  runs: number;
  lastExecutionTimestamp?: string;
}

const emptyState: AlertGroupingTaskState = {
  runs: 0,
};

const NO_DEFAULT_CONNECTOR = 'NO_DEFAULT_CONNECTOR';

export interface AlertGroupingTaskSetupParams {
  taskManager: TaskManagerSetupContract;
  logger: Logger;
}

export interface AlertGroupingTaskStartParams {
  taskManager: TaskManagerStartContract;
  getStartServices: () => Promise<[CoreStart, unknown, unknown]>;
  assistantService: AIAssistantService;
  cases?: CasesServerStart;
}

/**
 * Alert Grouping Task Manager integration.
 *
 * This class handles:
 * 1. Registering the task type with Task Manager during plugin setup
 * 2. Scheduling task instances for enabled workflows
 * 3. Executing the workflow when the task runs
 */
export class AlertGroupingTask {
  private readonly logger: Logger;
  private taskManager?: TaskManagerStartContract;
  private getStartServices?: () => Promise<[CoreStart, unknown, unknown]>;
  private assistantService?: AIAssistantService;
  private cases?: CasesServerStart;

  constructor(logger: Logger) {
    this.logger = logger.get('alertGroupingTask');
  }

  /**
   * Register the task type during plugin setup
   */
  public setup({ taskManager, logger }: AlertGroupingTaskSetupParams): void {
    this.logger.info(`Registering task type: ${ALERT_GROUPING_TASK_TYPE}`);

    taskManager.registerTaskDefinitions({
      [ALERT_GROUPING_TASK_TYPE]: {
        title: 'Alert Grouping Workflow',
        timeout: TASK_TIMEOUT,
        createTaskRunner: ({ taskInstance }: { taskInstance: ConcreteTaskInstance }) => {
          return {
            run: async () => {
              return this.runTask(taskInstance);
            },
            cancel: async () => {
              this.logger.info(`Task ${taskInstance.id} cancelled`);
            },
          };
        },
      },
    });
  }

  /**
   * Initialize dependencies during plugin start
   */
  public start({
    taskManager,
    getStartServices,
    assistantService,
    cases,
  }: AlertGroupingTaskStartParams): void {
    this.taskManager = taskManager;
    this.getStartServices = getStartServices;
    this.assistantService = assistantService;
    this.cases = cases;
    this.logger.info('Alert grouping task started');
  }

  /**
   * Schedule a workflow to run on its configured interval
   */
  public async scheduleWorkflow(
    workflowId: string,
    interval: string,
    spaceId: string
  ): Promise<void> {
    if (!this.taskManager) {
      throw new Error('Task manager not initialized');
    }

    const taskId = this.getTaskId(workflowId, spaceId);
    this.logger.info(`Scheduling workflow ${workflowId} with interval ${interval}`);

    try {
      await this.taskManager.ensureScheduled({
        id: taskId,
        taskType: ALERT_GROUPING_TASK_TYPE,
        scope: ['securitySolution'],
        schedule: {
          interval,
        },
        state: emptyState,
        params: {
          workflowId,
          spaceId,
        },
      });
      this.logger.info(`Workflow ${workflowId} scheduled successfully`);
    } catch (error) {
      this.logger.error(`Failed to schedule workflow ${workflowId}: ${error}`);
      throw error;
    }
  }

  /**
   * Remove a scheduled workflow task
   */
  public async unscheduleWorkflow(workflowId: string, spaceId: string): Promise<void> {
    if (!this.taskManager) {
      throw new Error('Task manager not initialized');
    }

    const taskId = this.getTaskId(workflowId, spaceId);
    this.logger.info(`Unscheduling workflow ${workflowId}`);

    try {
      await this.taskManager.removeIfExists(taskId);
      this.logger.info(`Workflow ${workflowId} unscheduled successfully`);
    } catch (error) {
      this.logger.error(`Failed to unschedule workflow ${workflowId}: ${error}`);
      throw error;
    }
  }

  /**
   * Update a workflow's schedule
   */
  public async updateWorkflowSchedule(
    workflowId: string,
    interval: string,
    spaceId: string,
    enabled: boolean
  ): Promise<void> {
    if (!enabled) {
      await this.unscheduleWorkflow(workflowId, spaceId);
    } else {
      // Remove and reschedule with new interval
      await this.unscheduleWorkflow(workflowId, spaceId);
      await this.scheduleWorkflow(workflowId, interval, spaceId);
    }
  }

  /**
   * Get the task ID for a workflow
   */
  private getTaskId(workflowId: string, spaceId: string): string {
    return `${ALERT_GROUPING_TASK_TYPE}:${spaceId}:${workflowId}`;
  }

  /**
   * Execute the task
   */
  private async runTask(
    taskInstance: ConcreteTaskInstance
  ): Promise<{ state: AlertGroupingTaskState }> {
    const state = taskInstance.state as AlertGroupingTaskState;
    const { workflowId, spaceId } = taskInstance.params as {
      workflowId: string;
      spaceId: string;
    };

    this.logger.info(`Running alert grouping workflow ${workflowId} in space ${spaceId}`);

    if (!this.getStartServices || !this.assistantService) {
      this.logger.error('Task dependencies not initialized');
      return {
        state: {
          ...state,
          runs: state.runs + 1,
        },
      };
    }

    try {
      const [coreStart] = await this.getStartServices();
      const esClient = coreStart.elasticsearch.client.asInternalUser;
      const soClient = coreStart.savedObjects.createInternalRepository();

      // Create a scoped saved objects client for the space
      const scopedSoClient = coreStart.savedObjects.getScopedClient(
        { headers: {} } as any, // Internal request
        { includedHiddenTypes: ['alert-grouping-workflow', 'alert-grouping-execution'] }
      );

      // Get workflow configuration
      const dataClient = new WorkflowDataClient({
        logger: this.logger,
        soClient: scopedSoClient,
        spaceId,
        currentUser: 'system',
      });

      const workflow = await dataClient.getWorkflow(workflowId);
      if (!workflow) {
        this.logger.warn(`Workflow ${workflowId} not found, skipping execution`);
        return { state: { ...state, runs: state.runs + 1 } };
      }

      if (!workflow.enabled) {
        this.logger.debug(`Workflow ${workflowId} is disabled, skipping execution`);
        return { state: { ...state, runs: state.runs + 1 } };
      }

      // Create execution record
      const execution = await dataClient.createExecution(workflowId, 'schedule', false);

      // Get default connector from UI settings if not configured
      let connectorId = workflow.apiConfig?.connectorId;
      const actionTypeId = workflow.apiConfig?.actionTypeId;

      if (!connectorId) {
        connectorId = await this.getDefaultConnectorId(coreStart, spaceId);
      }

      // Get cases client if available
      const casesClient = this.cases
        ? (this.cases.getCasesClientWithRequest({
            headers: {},
          } as any) as unknown as CasesClientLike)
        : undefined;

      // Execute workflow
      const executor = new AlertGroupingWorkflowExecutor(
        workflow,
        {
          logger: this.logger,
          esClient,
          getCasesByObservables: async () => {
            if (!casesClient) return [];
            return fetchOpenSecurityCases(casesClient, this.logger);
          },
          createCase: async (params) => {
            if (!casesClient) throw new Error('Cases client not available');
            return createCase(casesClient, params);
          },
          attachAlertsToCase: async (caseId, alerts) => {
            if (!casesClient) throw new Error('Cases client not available');
            return attachAlertsToCase(casesClient, caseId, alerts);
          },
          generateAttackDiscoveryForCase: async (caseId, alertIds) => {
            // Simplified implementation for scheduled execution
            // Full implementation would mirror the API route version
            if (!workflow.attackDiscoveryConfig?.enabled || !connectorId) {
              return { attackDiscoveryId: null, relevantAlertIds: alertIds };
            }

            try {
              const anonymizationFields = getDefaultAnonymizationFields(spaceId);
              const alertFilter = { bool: { must: [{ terms: { _id: alertIds } }] } };

              const result = await generateAttackDiscoveries({
                actionsClient: {
                  execute: async () => ({ status: 'ok', data: { message: '' } }),
                } as unknown as ActionsClient,
                config: {
                  alertsIndexPattern:
                    workflow.alertFilter?.alertsIndexPattern ?? '.alerts-security.alerts-*',
                  anonymizationFields,
                  apiConfig: {
                    connectorId,
                    actionTypeId: actionTypeId ?? '.bedrock',
                  },
                  filter: alertFilter,
                  size: alertIds.length,
                },
                esClient,
                logger: this.logger,
                savedObjectsClient: scopedSoClient,
              });

              const relevantAlertIds = new Set<string>();
              for (const discovery of result.attackDiscoveries) {
                for (const alertId of discovery.alertIds) {
                  relevantAlertIds.add(alertId);
                }
              }

              return {
                attackDiscoveryId: result.attackDiscoveries[0]?.id ?? null,
                relevantAlertIds: Array.from(relevantAlertIds),
              };
            } catch (error) {
              this.logger.error(`Attack Discovery failed for case ${caseId}: ${error}`);
              return { attackDiscoveryId: null, relevantAlertIds: alertIds };
            }
          },
        },
        false // Not a dry run
      );

      const result = await executor.execute();

      // Update execution record
      await dataClient.updateExecution(execution.id, {
        status: result.errors.length > 0 ? 'failed' : 'completed',
        completedAt: new Date().toISOString(),
        error: result.errors.length > 0 ? result.errors.join('; ') : undefined,
        metrics: result.metrics,
      });

      this.logger.info(
        `Workflow ${workflowId} completed: ${result.metrics.alertsProcessed} alerts processed, ` +
          `${result.metrics.casesCreated} cases created, ${result.errors.length} errors`
      );

      return {
        state: {
          runs: state.runs + 1,
          lastExecutionTimestamp: new Date().toISOString(),
        },
      };
    } catch (error) {
      this.logger.error(`Failed to execute workflow ${workflowId}: ${error}`);
      return {
        state: {
          ...state,
          runs: state.runs + 1,
        },
      };
    }
  }

  /**
   * Get default connector ID from UI settings
   */
  private async getDefaultConnectorId(
    coreStart: CoreStart,
    spaceId: string
  ): Promise<string | undefined> {
    try {
      const soClient = coreStart.savedObjects.createInternalRepository();
      const uiSettingsClient = coreStart.uiSettings.asScopedToClient(
        coreStart.savedObjects.getScopedClient({ headers: {} } as any)
      );

      const defaultConnectorSetting = await uiSettingsClient.get<string | undefined>(
        GEN_AI_SETTINGS_DEFAULT_AI_CONNECTOR
      );

      if (defaultConnectorSetting && defaultConnectorSetting !== NO_DEFAULT_CONNECTOR) {
        return defaultConnectorSetting;
      }

      return undefined;
    } catch (error) {
      this.logger.error(`Failed to get default connector: ${error}`);
      return undefined;
    }
  }
}

/**
 * Singleton instance for the alert grouping task
 */
let alertGroupingTaskInstance: AlertGroupingTask | undefined;

export const getAlertGroupingTask = (logger: Logger): AlertGroupingTask => {
  if (!alertGroupingTaskInstance) {
    alertGroupingTaskInstance = new AlertGroupingTask(logger);
  }
  return alertGroupingTaskInstance;
};
