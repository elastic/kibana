/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  Plugin,
  CoreSetup,
  CoreStart,
  RequestHandlerContext,
  KibanaRequest,
  KibanaResponseFactory,
  IKibanaResponse,
} from 'kibana/server';
import { firstValueFrom, Subject } from 'rxjs';
import { schema } from '@kbn/config-schema';
import { TaskManagerStartContract } from '../../../../../../../plugins/task_manager/server';

export interface SampleTaskManagerFixtureStartDeps {
  taskManager: TaskManagerStartContract;
}

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

export class SampleTaskManagerFixturePlugin
  implements Plugin<void, void, {}, SampleTaskManagerFixtureStartDeps>
{
  taskManagerStart$: Subject<TaskManagerStartContract> = new Subject<TaskManagerStartContract>();
  taskManagerStart: Promise<TaskManagerStartContract> = firstValueFrom(this.taskManagerStart$);

  public setup(core: CoreSetup) {
    const router = core.http.createRouter();
    router.get(
      {
        path: '/api/alerting_tasks/{taskId}',
        validate: {
          params: schema.object({
            taskId: schema.string(),
          }),
        },
      },
      async (
        context: RequestHandlerContext,
        req: KibanaRequest<any, any, any, any>,
        res: KibanaResponseFactory
      ): Promise<IKibanaResponse<any>> => {
        try {
          const taskManager = await this.taskManagerStart;
          return res.ok({
            body: await taskManager.fetch({
              query: taskManagerQuery(tasksForAlerting, taskByIdQuery(req.params.taskId)),
            }),
          });
        } catch (err) {
          return res.badRequest({ body: err });
        }
      }
    );

    router.get(
      {
        path: `/api/ensure_tasks_index_refreshed`,
        validate: {},
      },
      async function (
        context: RequestHandlerContext,
        req: KibanaRequest<any, any, any, any>,
        res: KibanaResponseFactory
      ): Promise<IKibanaResponse<any>> {
        const coreCtx = await context.core;
        await coreCtx.elasticsearch.client.asInternalUser.indices.refresh({
          index: '.kibana_task_manager',
        });
        return res.ok({ body: {} });
      }
    );
  }

  public start(core: CoreStart, { taskManager }: SampleTaskManagerFixtureStartDeps) {
    this.taskManagerStart$.next(taskManager);
    this.taskManagerStart$.complete();
  }
  public stop() {}
}
