/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup, ElasticsearchClient, KibanaRequest, Logger } from '@kbn/core/server';
import { TaskCost, TaskPriority } from '@kbn/task-manager-plugin/server';
import type {
  ConcreteTaskInstance,
  TaskManagerSetupContract,
  TaskManagerStartContract,
} from '@kbn/task-manager-plugin/server';
import { ExecutionStatus } from '@kbn/workflows';
import type { WorkflowsServerPluginSetup } from '@kbn/workflows-management-plugin/server';
import type {
  ConversationChatMode,
  Conversation,
  ConversationWorkflowHookDefinition,
  ConversationWorkflowHookExecutionState,
  TemplateSnapshot,
} from '@kbn/agent-builder-common';
import { chatSystemIndex } from '@kbn/agent-builder-server';
import { executeWorkflow } from '@kbn/agent-builder-tools-base/workflows';
import { isIndexNotFoundError } from '@kbn/agent-builder-plugin/server/utils/is_index_not_found_error';
import {
  OBSERVABILITY_CONVERSATION_WORKFLOW_HOOK_TASK_ID,
  OBSERVABILITY_CONVERSATION_WORKFLOW_HOOK_TASK_TYPE,
  OBSERVABILITY_INCIDENT_TEMPLATE_ID,
} from '../../common/constants';
import { appendTimelineEntries, normalizeTimelineInput } from './conversation_metadata';
import type {
  ObservabilityAgentBuilderPluginStart,
  ObservabilityAgentBuilderPluginStartDependencies,
} from '../types';

interface ConversationSearchSource {
  agent_id?: string;
  title?: string;
  space?: string;
  conversation_mode?: string;
  chat_mode?: ConversationChatMode;
  template_id?: string;
  template_snapshot?: TemplateSnapshot;
  custom_fields?: Record<string, unknown>;
}

interface DueWorkflowHook {
  hook: ConversationWorkflowHookDefinition;
  state?: ConversationWorkflowHookExecutionState;
}

export interface ConversationWorkflowHookRunResult {
  customFields: Record<string, unknown>;
}

const DEFAULT_HOOK_SCAN_INTERVAL = '1m';
const DEFAULT_HOOK_WORKFLOW_TIMEOUT_SEC = 45;
const MAX_CONVERSATIONS_PER_RUN = 25;

export const runConversationWorkflowHooksForTrigger = async ({
  conversation,
  trigger,
  workflowApi,
  request,
  logger,
}: {
  conversation: Conversation;
  trigger: string;
  workflowApi: WorkflowsServerPluginSetup['management'];
  request: KibanaRequest;
  logger: Logger;
}): Promise<ConversationWorkflowHookRunResult> => {
  const now = new Date().toISOString();
  const source = conversationToSearchSource(conversation);
  const hooks = getWorkflowHooks(source).flatMap((hook) => {
    if (hook.enabled === false || hook.trigger !== trigger) {
      return [];
    }

    return [{ hook, state: getHookState(source.custom_fields, hook.id) }];
  });

  if (!hooks.length) {
    return {
      customFields: conversation.custom_fields ?? {},
    };
  }

  return runDueHooksForConversation({
    conversationId: conversation.id,
    conversation: source,
    hooks,
    now,
    workflowApi,
    request,
    signal: new AbortController().signal,
    logger,
  });
};

export const registerConversationWorkflowHookTask = ({
  core,
  taskManager,
  workflowsManagement,
  logger,
}: {
  core: CoreSetup<
    ObservabilityAgentBuilderPluginStartDependencies,
    ObservabilityAgentBuilderPluginStart
  >;
  taskManager: TaskManagerSetupContract;
  workflowsManagement?: WorkflowsServerPluginSetup;
  logger: Logger;
}) => {
  taskManager.registerTaskDefinitions({
    [OBSERVABILITY_CONVERSATION_WORKFLOW_HOOK_TASK_TYPE]: {
      title: 'Observability Agent Builder conversation workflow hook runner',
      description:
        'Periodically runs workflow hooks configured on observability group conversations.',
      timeout: '3m',
      maxAttempts: 1,
      cost: TaskCost.Normal,
      priority: TaskPriority.Low,
      createTaskRunner: ({
        taskInstance,
        abortController,
        fakeRequest,
      }: {
        taskInstance: ConcreteTaskInstance;
        abortController: AbortController;
        fakeRequest?: KibanaRequest;
      }) => {
        return {
          run: async () => {
            if (taskInstance.id !== OBSERVABILITY_CONVERSATION_WORKFLOW_HOOK_TASK_ID) {
              return { state: {} };
            }

            if (!workflowsManagement) {
              logger.debug(
                'workflowsManagement plugin is unavailable; skipping conversation workflow hooks'
              );
              return { state: {} };
            }

            const [coreStart] = await core.getStartServices();
            const updatedCount = await runConversationWorkflowHooks({
              esClient: coreStart.elasticsearch.client.asInternalUser,
              workflowApi: workflowsManagement.management,
              fakeRequest,
              signal: abortController.signal,
              logger,
            });
            logger.debug(`Ran workflow hooks for ${updatedCount} observability conversations`);

            return { state: {} };
          },
        };
      },
    },
  });
};

export const scheduleConversationWorkflowHookTask = async ({
  taskManager,
  logger,
}: {
  taskManager: TaskManagerStartContract;
  logger: Logger;
}) => {
  try {
    await taskManager.ensureScheduled({
      id: OBSERVABILITY_CONVERSATION_WORKFLOW_HOOK_TASK_ID,
      taskType: OBSERVABILITY_CONVERSATION_WORKFLOW_HOOK_TASK_TYPE,
      scope: ['observability'],
      schedule: {
        interval: DEFAULT_HOOK_SCAN_INTERVAL,
      },
      state: {},
      params: {},
    });
  } catch (error) {
    logger.warn(`Failed to schedule observability conversation workflow hook task: ${error}`);
  }
};

const runConversationWorkflowHooks = async ({
  esClient,
  workflowApi,
  fakeRequest,
  signal,
  logger,
}: {
  esClient: ElasticsearchClient;
  workflowApi: WorkflowsServerPluginSetup['management'];
  fakeRequest?: KibanaRequest;
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
        size: MAX_CONVERSATIONS_PER_RUN,
        _source: [
          'agent_id',
          'title',
          'space',
          'conversation_mode',
          'chat_mode',
          'template_id',
          'template_snapshot',
          'custom_fields',
        ],
        query: {
          bool: {
            should: [
              { term: { chat_mode: 'collaborative' } },
              { term: { conversation_mode: 'group' } },
            ],
            minimum_should_match: 1,
          },
        },
      },
      { signal }
    );

    let updatedCount = 0;
    for (const hit of response.hits.hits) {
      if (signal.aborted) {
        return updatedCount;
      }

      if (!hit._id || !hit._source) {
        continue;
      }

      const dueHooks = getDueWorkflowHooks({
        conversation: hit._source,
        now,
      });
      if (!dueHooks.length) {
        continue;
      }

      const hookResult = await runDueHooksForConversation({
        conversationId: hit._id,
        conversation: hit._source,
        hooks: dueHooks,
        now,
        workflowApi,
        request: getWorkflowRequest({
          fakeRequest,
          spaceId: hit._source.space ?? 'default',
        }),
        signal,
        logger,
      });

      await esClient.update(
        {
          index,
          id: hit._id,
          retry_on_conflict: 3,
          doc: {
            custom_fields: hookResult.customFields,
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
      logger.debug('Agent Builder conversation index does not exist yet; skipping hooks');
      return 0;
    }
    throw error;
  }
};

const runDueHooksForConversation = async ({
  conversationId,
  conversation,
  hooks,
  now,
  workflowApi,
  request,
  signal,
  logger,
}: {
  conversationId: string;
  conversation: ConversationSearchSource;
  hooks: DueWorkflowHook[];
  now: string;
  workflowApi: WorkflowsServerPluginSetup['management'];
  request: KibanaRequest;
  signal: AbortSignal;
  logger: Logger;
}): Promise<ConversationWorkflowHookRunResult> => {
  let customFields = conversation.custom_fields ?? {};

  for (const { hook, state } of hooks) {
    if (signal.aborted) {
      return { customFields };
    }

    if (!hook.workflow_id && !hook.inline_workflow_yaml) {
      customFields = buildHookFailureFields({
        customFields,
        hook,
        previousState: state,
        now,
        error: 'Workflow hook is missing workflow_id or inline_workflow_yaml',
      });
      continue;
    }

    const workflowId = hook.workflow_id;
    const result = hook.inline_workflow_yaml
      ? await executeWorkflow({
          yaml: hook.inline_workflow_yaml,
          workflowId,
          name: hook.workflow_name,
          workflowParams: buildWorkflowParams({
            conversationId,
            conversation,
            hook,
            now,
            customFields,
          }),
          request,
          spaceId: conversation.space ?? 'default',
          workflowApi,
          waitForCompletion: hook.wait_for_completion ?? true,
          completionTimeoutSec: hook.completion_timeout_sec ?? DEFAULT_HOOK_WORKFLOW_TIMEOUT_SEC,
          metadata: {
            conversation_id: conversationId,
            workflow_hook_id: hook.id,
            trigger: hook.trigger,
          },
        })
      : await executeSavedHookWorkflow({
          workflowId,
          conversationId,
          conversation,
          hook,
          now,
          customFields,
          request,
          workflowApi,
        });

    if (!result.success) {
      logger.debug(`Workflow hook ${hook.id} failed to start: ${result.error}`);
      customFields = buildHookFailureFields({
        customFields,
        hook,
        previousState: state,
        now,
        error: result.error,
      });
      continue;
    }

    const { execution } = result;
    if (execution.status === ExecutionStatus.FAILED) {
      const error = execution.error_message ?? `Workflow ${execution.workflow_id} failed`;
      logger.debug(`Workflow hook ${hook.id} failed: ${error}`);
      customFields = buildHookFailureFields({
        customFields,
        hook,
        previousState: state,
        now,
        error,
        executionId: execution.execution_id,
        status: execution.status,
      });
      continue;
    }

    const hookResult = buildHookSuccessFields({
      customFields,
      hook,
      previousState: state,
      now,
      executionId: execution.execution_id,
      status: execution.status,
      output: execution.output,
    });
    customFields = hookResult.customFields;
  }

  return { customFields };
};

const executeSavedHookWorkflow = async ({
  workflowId,
  conversationId,
  conversation,
  hook,
  now,
  customFields,
  request,
  workflowApi,
}: {
  workflowId?: string;
  conversationId: string;
  conversation: ConversationSearchSource;
  hook: ConversationWorkflowHookDefinition;
  now: string;
  customFields: Record<string, unknown>;
  request: KibanaRequest;
  workflowApi: WorkflowsServerPluginSetup['management'];
}) => {
  if (!workflowId) {
    return {
      success: false as const,
      error: 'Workflow hook is missing workflow_id',
    };
  }

  return executeWorkflow({
    workflowId,
    workflowParams: buildWorkflowParams({
      conversationId,
      conversation,
      hook,
      now,
      customFields,
    }),
    request,
    spaceId: conversation.space ?? 'default',
    workflowApi,
    waitForCompletion: hook.wait_for_completion ?? true,
    completionTimeoutSec: hook.completion_timeout_sec ?? DEFAULT_HOOK_WORKFLOW_TIMEOUT_SEC,
    metadata: {
      conversation_id: conversationId,
      workflow_hook_id: hook.id,
      trigger: hook.trigger,
    },
  });
};

const getWorkflowRequest = ({
  fakeRequest,
  spaceId,
}: {
  fakeRequest?: KibanaRequest;
  spaceId: string;
}): KibanaRequest => {
  if (fakeRequest) {
    return fakeRequest;
  }

  // POC: startup-scheduled recurring tasks do not carry a user API key, but the
  // workflow API requires a KibanaRequest for space/auth context. A later version
  // should schedule per-conversation tasks from the user request that created or
  // edited the hook.
  return {
    headers: {},
    isFakeRequest: true,
    spaceId,
  } as unknown as KibanaRequest;
};

const getDueWorkflowHooks = ({
  conversation,
  now,
}: {
  conversation: ConversationSearchSource;
  now: string;
}): DueWorkflowHook[] => {
  if (getTemplateId(conversation) !== OBSERVABILITY_INCIDENT_TEMPLATE_ID) {
    return [];
  }

  return getWorkflowHooks(conversation).flatMap((hook) => {
    if (hook.enabled === false || hook.trigger !== 'schedule') {
      return [];
    }

    const intervalMs = parseIntervalMs(hook.interval ?? '5m');
    if (intervalMs === undefined) {
      return [];
    }

    const state = getHookState(conversation.custom_fields, hook.id);
    const lastRunAt = state?.last_run_at ? Date.parse(state.last_run_at) : 0;
    const isDue = !lastRunAt || Date.parse(now) - lastRunAt >= intervalMs;

    return isDue ? [{ hook, state }] : [];
  });
};

const getWorkflowHooks = (
  conversation: ConversationSearchSource
): ConversationWorkflowHookDefinition[] => {
  const byId = new Map<string, ConversationWorkflowHookDefinition>();

  for (const hook of [
    ...normalizeWorkflowHooks(conversation.template_snapshot?.workflow_hooks),
    ...normalizeWorkflowHooks(conversation.custom_fields?.workflow_hooks),
  ]) {
    byId.set(hook.id, hook);
  }

  return [...byId.values()];
};

const normalizeWorkflowHooks = (value: unknown): ConversationWorkflowHookDefinition[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter(isWorkflowHookDefinition);
};

const isWorkflowHookDefinition = (value: unknown): value is ConversationWorkflowHookDefinition => {
  if (!isRecord(value)) {
    return false;
  }

  return typeof value.id === 'string' && typeof value.trigger === 'string';
};

const getHookState = (
  customFields: Record<string, unknown> | undefined,
  hookId: string
): ConversationWorkflowHookExecutionState | undefined => {
  const state = customFields?.workflow_hook_state;
  if (!isRecord(state)) {
    return undefined;
  }

  const hookState = state[hookId];
  if (!isRecord(hookState)) {
    return undefined;
  }

  return {
    ...(typeof hookState.last_run_at === 'string' ? { last_run_at: hookState.last_run_at } : {}),
    ...(typeof hookState.last_execution_id === 'string'
      ? { last_execution_id: hookState.last_execution_id }
      : {}),
    ...(typeof hookState.last_status === 'string' ? { last_status: hookState.last_status } : {}),
    ...(typeof hookState.last_error === 'string' ? { last_error: hookState.last_error } : {}),
    ...(typeof hookState.run_count === 'number' ? { run_count: hookState.run_count } : {}),
  };
};

const updateHookState = ({
  customFields,
  hook,
  previousState,
  now,
  executionId,
  status,
  error,
}: {
  customFields: Record<string, unknown>;
  hook: ConversationWorkflowHookDefinition;
  previousState?: ConversationWorkflowHookExecutionState;
  now: string;
  executionId?: string;
  status?: string;
  error?: string;
}): Record<string, unknown> => {
  const state = isRecord(customFields.workflow_hook_state) ? customFields.workflow_hook_state : {};

  return {
    ...customFields,
    workflow_hook_state: {
      ...state,
      [hook.id]: {
        run_count: (previousState?.run_count ?? 0) + 1,
        last_run_at: now,
        ...(executionId ? { last_execution_id: executionId } : {}),
        ...(status ? { last_status: status } : {}),
        ...(error ? { last_error: error } : {}),
      },
    },
  };
};

const buildWorkflowParams = ({
  conversationId,
  conversation,
  hook,
  now,
  customFields,
}: {
  conversationId: string;
  conversation: ConversationSearchSource;
  hook: ConversationWorkflowHookDefinition;
  now: string;
  customFields: Record<string, unknown>;
}): Record<string, unknown> => {
  return {
    trigger: hook.trigger,
    hook_id: hook.id,
    now,
    conversation_id: conversationId,
    title: conversation.title ?? '',
    template_id: getTemplateId(conversation),
    current_state: getString(customFields.current_state) ?? '',
    custom_fields: customFields,
    conversation: {
      id: conversationId,
      agent_id: conversation.agent_id,
      title: conversation.title,
      space: conversation.space,
      template_id: conversation.template_id,
      template_snapshot: conversation.template_snapshot,
      custom_fields: customFields,
    },
    ...(hook.params ?? {}),
  };
};

const buildHookSuccessFields = ({
  customFields,
  hook,
  previousState,
  now,
  executionId,
  status,
  output,
}: {
  customFields: Record<string, unknown>;
  hook: ConversationWorkflowHookDefinition;
  previousState?: ConversationWorkflowHookExecutionState;
  now: string;
  executionId: string;
  status: string;
  output: unknown;
}): ConversationWorkflowHookRunResult => {
  const normalizedOutput = normalizeWorkflowOutput(output);
  const outputFields = hook.merge_output === false ? {} : getOutputFields(normalizedOutput);
  const actor = getHookActor(hook);
  const outputTimeline = isRecord(normalizedOutput)
    ? normalizeTimelineInput({
        value: normalizedOutput.timeline,
        now,
        actor,
        source: 'state update',
      })
    : [];
  const customFieldsWithOutput = {
    ...customFields,
    ...outputFields,
    last_refreshed_at: now,
    last_state_update_source: 'workflow_hook',
  };
  const customFieldsWithTimeline = outputTimeline.length
    ? appendTimelineEntries({
        customFields: customFieldsWithOutput,
        entries: outputTimeline,
        now,
      })
    : customFieldsWithOutput;

  return {
    customFields: updateHookState({
      customFields: customFieldsWithTimeline,
      hook,
      previousState,
      now,
      executionId,
      status,
    }),
  };
};

const buildHookFailureFields = ({
  customFields,
  hook,
  previousState,
  now,
  error,
  executionId,
  status = 'failed',
}: {
  customFields: Record<string, unknown>;
  hook: ConversationWorkflowHookDefinition;
  previousState?: ConversationWorkflowHookExecutionState;
  now: string;
  error: string;
  executionId?: string;
  status?: string;
}): Record<string, unknown> => {
  return updateHookState({
    customFields: {
      ...customFields,
      last_refreshed_at: now,
      last_state_update_source: 'workflow_hook',
    },
    hook,
    previousState,
    now,
    executionId,
    status,
    error,
  });
};

const getOutputFields = (output: unknown): Record<string, unknown> => {
  if (!isRecord(output)) {
    return {};
  }

  const customFields = isRecord(output.custom_fields) ? output.custom_fields : {};
  const sanitizedCustomFields = { ...customFields };
  delete sanitizedCustomFields.timeline;

  return {
    ...sanitizedCustomFields,
    ...(typeof output.current_state === 'string' ? { current_state: output.current_state } : {}),
    ...(typeof output.status === 'string' ? { status: output.status } : {}),
    ...(typeof output.severity === 'string' ? { severity: output.severity } : {}),
  };
};

const normalizeWorkflowOutput = (output: unknown): unknown => {
  if (Array.isArray(output) && output.length === 1) {
    return output[0];
  }

  return output;
};

const parseIntervalMs = (interval: string): number | undefined => {
  const match = interval.trim().match(/^(\d+)(s|m|h|d)$/);
  if (!match) {
    return undefined;
  }

  const value = Number(match[1]);
  const unit = match[2];

  if (unit === 's') {
    return value * 1000;
  }
  if (unit === 'm') {
    return value * 60 * 1000;
  }
  if (unit === 'h') {
    return value * 60 * 60 * 1000;
  }
  return value * 24 * 60 * 60 * 1000;
};

const getHookActor = (hook: ConversationWorkflowHookDefinition): string => {
  return `workflow:${hook.workflow_name ?? hook.workflow_id ?? hook.id}`;
};

const getString = (value: unknown): string | undefined => {
  return typeof value === 'string' && value.length > 0 ? value : undefined;
};

const conversationToSearchSource = (conversation: Conversation): ConversationSearchSource => {
  return {
    agent_id: conversation.agent_id,
    title: conversation.title,
    conversation_mode: conversation.conversation_mode,
    chat_mode: conversation.chat_mode,
    template_id: conversation.template_id,
    template_snapshot: conversation.template_snapshot,
    custom_fields: conversation.custom_fields,
  };
};

const getTemplateId = (
  conversation: Pick<ConversationSearchSource, 'template_id' | 'template_snapshot'>
): string | undefined => {
  return conversation.template_snapshot?.template_id ?? conversation.template_id;
};

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
};
