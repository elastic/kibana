/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CancellableTask, RunContext, RunResult } from '@kbn/task-manager-plugin/server/task';
import { getDeleteTaskRunResult } from '@kbn/task-manager-plugin/server/task';
import type { Logger, ElasticsearchClient } from '@kbn/core/server';
import type { BulkRequest } from '@elastic/elasticsearch/lib/api/types';
import { ResponseActionsConnectorNotConfiguredError } from '../../services/actions/clients/errors';
import { catchAndWrapError } from '../../utils';
import { stringify } from '../../utils/stringify';
import { RESPONSE_ACTION_AGENT_TYPE } from '../../../../common/endpoint/service/response_actions/constants';
import type { BatchHandlerCallbackOptions } from '../../utils/queue_processor';
import { QueueProcessor } from '../../utils/queue_processor';
import type { LogsEndpointActionResponse } from '../../../../common/endpoint/types';
import type { EndpointAppContextService } from '../../endpoint_app_context_services';
import { ENDPOINT_ACTION_RESPONSES_INDEX } from '../../../../common/endpoint/constants';
import {
  COMPLETE_EXTERNAL_RESPONSE_ACTIONS_TASK_TYPE,
  COMPLETE_EXTERNAL_RESPONSE_ACTIONS_TASK_VERSION,
} from './complete_external_actions_task';

/**
 * A task manager runner responsible for checking the status of and completing pending actions
 * that were sent to 3rd party EDR systems.
 */
export class CompleteExternalActionsTaskRunner
  implements CancellableTask<RunContext['taskInstance']>
{
  private readonly log: Logger;
  private updatesQueue: QueueProcessor<LogsEndpointActionResponse>;
  private abortController = new AbortController();
  private errors: string[] = [];

  constructor(
    private readonly endpointContextServices: EndpointAppContextService,
    private readonly esClient: ElasticsearchClient,
    private readonly nextRunInterval: string = '60s',
    private readonly taskInstanceId?: string,
    private readonly taskType?: string
  ) {
    this.log = this.endpointContextServices.createLogger(
      // Adding a unique identifier to the end of the class name to help identify log entries related to this run
      `${this.constructor.name}.${Math.random().toString(32).substring(2, 8)}`
    );

    this.updatesQueue = new QueueProcessor<LogsEndpointActionResponse>({
      batchHandler: this.queueBatchProcessor.bind(this),
      batchSize: 50,
      logger: this.log,
    });
  }

  private get taskId(): string {
    return `${COMPLETE_EXTERNAL_RESPONSE_ACTIONS_TASK_TYPE}-${COMPLETE_EXTERNAL_RESPONSE_ACTIONS_TASK_VERSION}`;
  }

  private async queueBatchProcessor({
    batch,
    data,
  }: BatchHandlerCallbackOptions<LogsEndpointActionResponse>): Promise<void> {
    const operations: BulkRequest<LogsEndpointActionResponse>['operations'] = [];

    for (const actionResponseDoc of data) {
      operations.push({ create: { _index: ENDPOINT_ACTION_RESPONSES_INDEX } }, actionResponseDoc);
    }

    const bulkResponse = await this.esClient
      .bulk({
        index: ENDPOINT_ACTION_RESPONSES_INDEX,
        operations,
      })
      .catch(catchAndWrapError);

    if (bulkResponse.errors) {
      this.errors.push(
        `Batch [${batch}] processing of [${
          data.length
        }] items generated the following errors:\n${stringify(bulkResponse)}`
      );
    }
  }

  private getNextRunDate(): Date | undefined {
    const nextRun = new Date();
    const nextRunInterval = this.nextRunInterval;

    if (nextRunInterval.endsWith('s')) {
      const seconds = parseInt(nextRunInterval.slice(0, -1), 10);
      nextRun.setSeconds(nextRun.getSeconds() + seconds);
    } else if (nextRunInterval.endsWith('m')) {
      const minutes = parseInt(nextRunInterval.slice(0, -1), 10);
      nextRun.setMinutes(nextRun.getMinutes() + minutes);
    } else {
      this.log.error(`Invalid task interval: ${nextRunInterval}`);
      return;
    }

    return nextRun;
  }

  public async run(): Promise<RunResult | void> {
    if (this.taskInstanceId !== this.taskId) {
      this.log.info(
        `Outdated task version. Got [${this.taskInstanceId}] from task instance. Current version is [${this.taskId}]`
      );
      return getDeleteTaskRunResult();
    }

    this.log.debug(`Started: Checking status of external response actions`);
    this.abortController = new AbortController();

    // If license is not `enterprise`, then exit. Support for external response actions is a
    // Enterprise level feature.
    if (!this.endpointContextServices.getLicenseService().isEnterprise()) {
      this.abortController.abort(`License not Enterprise!`);
      this.log.debug(`Exiting: Run aborted due to license not being Enterprise`);
      return;
    }

    // Collect update needed to complete response actions
    await Promise.all(
      RESPONSE_ACTION_AGENT_TYPE.filter((agentType) => agentType !== 'endpoint').map(
        (agentType) => {
          // If run was aborted, then stop looping through
          if (this.abortController.signal.aborted) {
            return null;
          }

          const agentTypeActionsClient =
            this.endpointContextServices.getInternalResponseActionsClient({
              agentType,
              taskType: this.taskType,
              taskId: this.taskInstanceId,
            });

          return agentTypeActionsClient
            .processPendingActions({
              abortSignal: this.abortController.signal,
              addToQueue: this.updatesQueue.addToQueue.bind(this.updatesQueue),
            })
            .catch((err) => {
              // ignore errors due to connector not being configured - no point in logging errors if a customer
              // is not using response actions for the given agent type
              if (err instanceof ResponseActionsConnectorNotConfiguredError) {
                this.log.debug(
                  `Skipping agentType [${agentType}]: No stack connector configured for this agent type`
                );
                return null;
              }

              this.errors.push(err.stack);
            });
        }
      )
    );

    await this.updatesQueue.complete();
    this.abortController.abort(`Run complete.`);

    if (this.errors.length) {
      this.log.error(
        `${this.errors.length} errors were encountered while running task:\n${this.errors.join(
          '\n----'
        )}`
      );
    }

    this.log.debug(`Completed: Checking status of external response actions`);

    return {
      state: {},
      runAt: this.getNextRunDate(),
    };
  }

  public async cancel(): Promise<void> {
    if (!this.abortController.signal.aborted) {
      this.abortController.abort('Task runner canceled!');

      // Sleep 2 seconds to give an opportunity for the abort signal to be processed
      await new Promise((r) => setTimeout(r, 2000));

      // Wait for remainder of updates to be written to ES
      await this.updatesQueue.complete();
    }
  }
}
