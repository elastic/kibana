/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { TaskManagerStartContract } from '../../../../../../plugins/task_manager/server';

const taskManagerQuery = (...filters: any[]) => ({
  bool: {
    filter: {
      bool: {
        must: filters,
      },
    },
  },
});

const tasksForAlerting = {
  term: {
    'task.scope': 'alerting',
  },
};
const taskByIdQuery = (id: string) => ({
  ids: {
    values: [`task:${id}`],
  },
});

// eslint-disable-next-line import/no-default-export
export default function(kibana: any) {
  return new kibana.Plugin({
    name: 'taskManagerHelpers',
    require: ['elasticsearch', 'task_manager'],

    config(Joi: any) {
      return Joi.object({
        enabled: Joi.boolean().default(true),
      }).default();
    },

    init(server: any) {
      const taskManager = server.newPlatform.start.plugins.taskManager as TaskManagerStartContract;

      server.route({
        path: '/api/alerting_tasks/{taskId}',
        method: 'GET',
        async handler(request: any) {
          try {
            return taskManager.fetch({
              query: taskManagerQuery(tasksForAlerting, taskByIdQuery(request.params.taskId)),
            });
          } catch (err) {
            return err;
          }
        },
      });
    },
  });
}
