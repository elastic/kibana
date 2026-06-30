/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup, ElasticsearchClient, Logger } from '@kbn/core/server';
import { TaskCost, TaskPriority } from '@kbn/task-manager-plugin/server';
import type {
  ConcreteTaskInstance,
  TaskManagerSetupContract,
  TaskManagerStartContract,
} from '@kbn/task-manager-plugin/server';
import { chatSystemIndex } from '@kbn/agent-builder-server';
import { isIndexNotFoundError } from '@kbn/agent-builder-plugin/server/utils/is_index_not_found_error';
import {
  OBSERVABILITY_INVESTIGATION_TEMPLATE_ID,
  OBSERVABILITY_INVESTIGATION_UPDATE_TASK_ID,
  OBSERVABILITY_INVESTIGATION_UPDATE_TASK_TYPE,
} from '../../common/constants';
import { buildPeriodicRefreshFields } from './conversation_metadata';
import type {
  ObservabilityAgentBuilderPluginStart,
  ObservabilityAgentBuilderPluginStartDependencies,
} from '../types';

interface ConversationSearchSource {
  title?: string;
  template_id?: string;
  template_snapshot?: {
    template_id?: string;
  };
  custom_fields?: Record<string, unknown>;
}

export const registerInvestigationConversationUpdateTask = ({
  core,
  taskManager,
  logger,
}: {
  core: CoreSetup<
    ObservabilityAgentBuilderPluginStartDependencies,
    ObservabilityAgentBuilderPluginStart
  >;
  taskManager: TaskManagerSetupContract;
  logger: Logger;
}) => {
  taskManager.registerTaskDefinitions({
    [OBSERVABILITY_INVESTIGATION_UPDATE_TASK_TYPE]: {
      title: 'Observability Agent Builder investigation state updater',
      description:
        'Periodically appends current state snapshots to observability investigation conversations.',
      timeout: '1m',
      maxAttempts: 1,
      cost: TaskCost.Tiny,
      priority: TaskPriority.Low,
      createTaskRunner: ({
        taskInstance,
        abortController,
      }: {
        taskInstance: ConcreteTaskInstance;
        abortController: AbortController;
      }) => {
        return {
          run: async () => {
            if (taskInstance.id !== OBSERVABILITY_INVESTIGATION_UPDATE_TASK_ID) {
              return { state: {} };
            }

            const [coreStart] = await core.getStartServices();
            const updatedCount = await updateInvestigationConversations({
              esClient: coreStart.elasticsearch.client.asInternalUser,
              signal: abortController.signal,
              logger,
            });
            logger.debug(`Updated ${updatedCount} observability investigation conversations`);

            return { state: {} };
          },
        };
      },
    },
  });
};

export const scheduleInvestigationConversationUpdateTask = async ({
  taskManager,
  logger,
}: {
  taskManager: TaskManagerStartContract;
  logger: Logger;
}) => {
  try {
    await taskManager.ensureScheduled({
      id: OBSERVABILITY_INVESTIGATION_UPDATE_TASK_ID,
      taskType: OBSERVABILITY_INVESTIGATION_UPDATE_TASK_TYPE,
      scope: ['observability'],
      schedule: {
        interval: '5m',
      },
      state: {},
      params: {},
    });
  } catch (error) {
    logger.warn(`Failed to schedule observability investigation updater task: ${error}`);
  }
};

const updateInvestigationConversations = async ({
  esClient,
  signal,
  logger,
}: {
  esClient: ElasticsearchClient;
  signal: AbortSignal;
  logger: Logger;
}): Promise<number> => {
  const now = new Date().toISOString();
  const index = chatSystemIndex('conversations');

  try {
    const response = await esClient.search<ConversationSearchSource>(
      {
        index,
        track_total_hits: false,
        size: 100,
        _source: ['title', 'template_id', 'template_snapshot', 'custom_fields'],
        query: {
          bool: {
            should: [
              { term: { template_id: OBSERVABILITY_INVESTIGATION_TEMPLATE_ID } },
              {
                term: {
                  'template_snapshot.template_id': OBSERVABILITY_INVESTIGATION_TEMPLATE_ID,
                },
              },
            ],
            minimum_should_match: 1,
          },
        },
      },
      { signal }
    );

    let updatedCount = 0;
    for (const hit of response.hits.hits) {
      if (!hit._id || !hit._source) {
        continue;
      }

      const customFields = buildPeriodicRefreshFields({
        conversationId: hit._id,
        title: hit._source.title,
        customFields: hit._source.custom_fields ?? {},
        now,
      });

      await esClient.update(
        {
          index,
          id: hit._id,
          retry_on_conflict: 3,
          doc: {
            custom_fields: customFields,
            updated_at: now,
            read: false,
          },
        },
        { signal }
      );
      updatedCount++;
    }

    return updatedCount;
  } catch (error) {
    if (isIndexNotFoundError(error)) {
      logger.debug('Agent Builder conversation index does not exist yet; skipping update');
      return 0;
    }
    throw error;
  }
};
