/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export class TaskManagerUtils {
  private readonly es: any;
  private readonly retry: any;

  constructor(es: any, retry: any) {
    this.es = es;
    this.retry = retry;
  }

  async waitForIdle(taskRunAtFilter: Date) {
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
                      gte: taskRunAtFilter,
                    },
                  },
                },
              ],
            },
          },
        },
      });
      if (searchResult.hits.total.value) {
        throw new Error(`Expected 0 tasks but received ${searchResult.hits.total.value}`);
      }
    });
  }
}
