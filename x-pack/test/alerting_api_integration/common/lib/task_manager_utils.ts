/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { Client } from '@elastic/elasticsearch';
import { SerializedConcreteTaskInstance } from '../../../../plugins/task_manager/server/task';

export interface TaskManagerDoc {
  type: string;
  task: SerializedConcreteTaskInstance;
}
export class TaskManagerUtils {
  private readonly es: Client;
  private readonly retry: any;

  constructor(es: Client, retry: any) {
    this.es = es;
    this.retry = retry;
  }

  async waitForEmpty(taskRunAtFilter: Date) {
    return await this.retry.try(async () => {
      const searchResult = await this.es.search({
        index: '.kibana_task_manager',
        body: {
          query: {
            bool: {
              must: [
                {
                  terms: {
                    'task.scope': ['actions', 'alerting'],
                  },
                },
                {
                  range: {
                    'task.scheduledAt': {
                      gte: taskRunAtFilter.getTime().toString(),
                    },
                  },
                },
              ],
            },
          },
        },
      });
      // @ts-expect-error
      if (searchResult.hits.total.value) {
        // @ts-expect-error
        throw new Error(`Expected 0 tasks but received ${searchResult.hits.total.value}`);
      }
    });
  }

  async waitForAllTasksIdle(taskRunAtFilter: Date) {
    return await this.retry.try(async () => {
      const searchResult = await this.es.search({
        index: '.kibana_task_manager',
        body: {
          query: {
            bool: {
              must: [
                {
                  terms: {
                    'task.scope': ['actions', 'alerting'],
                  },
                },
                {
                  range: {
                    'task.scheduledAt': {
                      gte: taskRunAtFilter.getTime().toString(),
                    },
                  },
                },
              ],
              must_not: [
                {
                  term: {
                    'task.status': 'idle',
                  },
                },
              ],
            },
          },
        },
      });
      // @ts-expect-error
      if (searchResult.hits.total.value) {
        // @ts-expect-error
        throw new Error(`Expected 0 non-idle tasks but received ${searchResult.hits.total.value}`);
      }
    });
  }

  async waitForActionTaskParamsToBeCleanedUp(createdAtFilter: Date): Promise<void> {
    return await this.retry.try(async () => {
      const searchResult = await this.es.search({
        index: '.kibana',
        body: {
          query: {
            bool: {
              must: [
                {
                  term: {
                    type: 'action_task_params',
                  },
                },
                {
                  range: {
                    updated_at: {
                      gte: createdAtFilter.getTime().toString(),
                    },
                  },
                },
              ],
            },
          },
        },
      });
      // @ts-expect-error
      if (searchResult.hits.total.value) {
        throw new Error(
          // @ts-expect-error
          `Expected 0 action_task_params objects but received ${searchResult.hits.total.value}`
        );
      }
    });
  }
}
