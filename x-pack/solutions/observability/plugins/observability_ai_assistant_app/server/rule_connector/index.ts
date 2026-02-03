/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { filter } from 'rxjs';
import { get } from 'lodash';
import dedent from 'dedent';
import { i18n } from '@kbn/i18n';
import type { TypeOf } from '@kbn/config-schema';
import { schema } from '@kbn/config-schema';
import { z } from '@kbn/zod';
import type { KibanaRequest, Logger } from '@kbn/core/server';
import { AlertingConnectorFeatureId } from '@kbn/actions-plugin/common';
import type {
  ClassicActionType as ConnectorType,
  ActionTypeExecutorOptions as ConnectorTypeExecutorOptions,
  ActionTypeExecutorResult as ConnectorTypeExecutorResult,
} from '@kbn/actions-plugin/server/types';
import type { ConnectorAdapter } from '@kbn/alerting-plugin/server';
import { ParamsSchema as EmailParamsSchema } from '@kbn/connector-schemas/email';
import { ExecutorParamsSchema as JiraParamsSchema } from '@kbn/connector-schemas/jira';
import { ParamsSchema as PagerdutyParamsSchema } from '@kbn/connector-schemas/pagerduty';
import { SlackApiParamsSchema } from '@kbn/connector-schemas/slack_api';
import { ParamsSchema as WebhookParamsSchema } from '@kbn/connector-schemas/webhook';
import type { ObservabilityAIAssistantRouteHandlerResources } from '@kbn/observability-ai-assistant-plugin/server/routes/types';
import type { ChatCompletionChunkEvent } from '@kbn/observability-ai-assistant-plugin/common';
import {
  MessageRole,
  StreamingChatResponseEventType,
} from '@kbn/observability-ai-assistant-plugin/common';
import { AIChatExperience } from '@kbn/ai-assistant-common';
import { AI_CHAT_EXPERIENCE_TYPE } from '@kbn/management-settings-ids';
import { concatenateChatCompletionChunks } from '@kbn/observability-ai-assistant-plugin/common/utils/concatenate_chat_completion_chunks';
import type { CompatibleJSONSchema } from '@kbn/observability-ai-assistant-plugin/common/functions/types';
import type { AlertDetailsContextualInsightsService } from '@kbn/observability-plugin/server/services';
import type { ObservabilityAIAssistantClient } from '@kbn/observability-ai-assistant-plugin/server';
import { EXECUTE_CONNECTOR_FUNCTION_NAME } from '@kbn/observability-ai-assistant-plugin/server';
import type { ChatFunctionClient } from '@kbn/observability-ai-assistant-plugin/server/service/chat_function_client';
import type { ActionsClient } from '@kbn/actions-plugin/server';
import type { PublicMethodsOf } from '@kbn/utility-types';
import type { RegisterInstructionCallback } from '@kbn/observability-ai-assistant-plugin/server/service/types';
import { convertSchemaToOpenApi } from './convert_schema_to_open_api';
import { OBSERVABILITY_AI_ASSISTANT_CONNECTOR_ID } from '../../common/rule_connector';
import { ALERT_STATUSES } from '../../common/constants';

const CONNECTOR_PRIVILEGES = ['api:observabilityAIAssistant', 'app:observabilityAIAssistant'];

const connectorParamsSchemas: Record<string, CompatibleJSONSchema> = {
  '.slack': {
    type: 'object',
    properties: {
      id: { type: 'string' },
      params: {
        type: 'object',
        properties: {
          message: { type: 'string' },
        },
      },
    },
  },
  '.slack_api': convertSchemaToOpenApi(SlackApiParamsSchema),
  '.email': convertSchemaToOpenApi(EmailParamsSchema),
  '.webhook': convertSchemaToOpenApi(WebhookParamsSchema),
  '.jira': convertSchemaToOpenApi(JiraParamsSchema),
  '.pagerduty': convertSchemaToOpenApi(PagerdutyParamsSchema),
};

const ParamsSchema = schema.object({
  connector: schema.string(),
  prompts: schema.maybe(
    schema.arrayOf(
      schema.object({
        statuses: schema.arrayOf(schema.string()),
        message: schema.string({ minLength: 1 }),
      })
    )
  ),
  status: schema.maybe(schema.string()),
  message: schema.maybe(schema.string({ minLength: 1 })), // this is a legacy field
});

const RuleSchema = z
  .object({
    id: z.string(),
    name: z.string(),
    tags: z.array(z.string()).default([]),
    ruleUrl: z.string().nullable().default(null),
  })
  .strict();

const AlertSchema = z.record(z.string(), z.any());

const AlertSummarySchema = z
  .object({
    new: z.array(AlertSchema),
    recovered: z.array(AlertSchema),
  })
  .strict();

const ConnectorParamsSchema = z
  .object({
    connector: z.string(),
    prompts: z.array(
      z.object({
        statuses: z.array(z.string()),
        message: z.string().min(1),
      })
    ),
    rule: RuleSchema,
    alerts: AlertSummarySchema,
  })
  .strict();

type AlertSummary = z.infer<typeof AlertSummarySchema>;
export type ActionParamsType = TypeOf<typeof ParamsSchema>;
export type ConnectorParamsType = z.infer<typeof ConnectorParamsSchema>;
type RuleType = z.infer<typeof RuleSchema>;

export type ObsAIAssistantConnectorType = ConnectorType<{}, {}, ConnectorParamsType, unknown>;

export type ObsAIAssistantConnectorTypeExecutorOptions = ConnectorTypeExecutorOptions<
  {},
  {},
  ConnectorParamsType
>;

export function getObsAIAssistantConnectorType(
  initResources: (request: KibanaRequest) => Promise<ObservabilityAIAssistantRouteHandlerResources>,
  alertDetailsContextService: AlertDetailsContextualInsightsService
): ObsAIAssistantConnectorType {
  return {
    id: OBSERVABILITY_AI_ASSISTANT_CONNECTOR_ID,
    isSystemActionType: true,
    getKibanaPrivileges: () => CONNECTOR_PRIVILEGES,
    minimumLicenseRequired: 'enterprise',
    name: i18n.translate('xpack.observabilityAiAssistant.alertConnector.title', {
      defaultMessage: 'Observability AI Assistant',
    }),
    supportedFeatureIds: [AlertingConnectorFeatureId],
    validate: {
      config: {
        schema: z.object({}).strict(),
        customValidator: () => {},
      },
      params: {
        schema: ConnectorParamsSchema,
      },
      secrets: {
        schema: z.object({}).strict(),
      },
    },
    renderParameterTemplates,
    executor(options) {
      return executor(options, initResources, alertDetailsContextService);
    },
  };
}

function renderParameterTemplates(
  logger: Logger,
  params: ConnectorParamsType,
  variables: Record<string, unknown>
): ConnectorParamsType {
  return {
    connector: params.connector,
    prompts: params.prompts,
    rule: params.rule,
    alerts: params.alerts,
  };
}

async function executor(
  execOptions: ObsAIAssistantConnectorTypeExecutorOptions,
  initResources: (request: KibanaRequest) => Promise<ObservabilityAIAssistantRouteHandlerResources>,
  alertDetailsContextService: AlertDetailsContextualInsightsService
): Promise<ConnectorTypeExecutorResult<unknown>> {
  const { request, params } = execOptions;

  if ((params.alerts?.new || []).length === 0 && (params.alerts?.recovered || []).length === 0) {
    // connector could be executed with only ongoing actions. we use this path as
    // dedup mechanism to prevent triggering the same worfklow for an ongoing alert
    return { actionId: execOptions.actionId, status: 'ok' };
  }

  if (!request) {
    throw new Error('AI Assistant connector requires a kibana request');
  }

  const resources = await initResources(request);

  const coreContext = await resources.context.core;
  const chatExperience = await coreContext.uiSettings.client.get<AIChatExperience>(
    AI_CHAT_EXPERIENCE_TYPE
  );

  if (chatExperience === AIChatExperience.Agent) {
    execOptions.logger.debug(
      'Skipping Observability AI Assistant rule connector execution because chat experience is set to Agents.'
    );
    return { actionId: execOptions.actionId, status: 'ok' };
  }

  const client = await resources.service.getClient({ request, scopes: ['observability'] });
  const functionClient = await resources.service.getFunctionClient({
    signal: new AbortController().signal,
    resources,
    client,
    screenContexts: [],
    scopes: ['observability'],
  });
  const actionsClient = await (
    await resources.plugins.actions.start()
  ).getActionsClientWithRequest(request);

  await Promise.all(
    params.prompts.map((prompt) =>
      executeAlertsChatCompletion(
        resources,
        prompt,
        params,
        alertDetailsContextService,
        client,
        functionClient,
        actionsClient,
        execOptions.logger
      )
    )
  );

  return { actionId: execOptions.actionId, status: 'ok' };
}

async function executeAlertsChatCompletion(
  resources: ObservabilityAIAssistantRouteHandlerResources,
  prompt: { statuses: string[]; message: string },
  params: ConnectorParamsType,
  alertDetailsContextService: AlertDetailsContextualInsightsService,
  client: ObservabilityAIAssistantClient,
  functionClient: ChatFunctionClient,
  actionsClient: PublicMethodsOf<ActionsClient>,
  logger: Logger
): Promise<void> {
  const alerts = {
    new: [...(params.alerts?.new || [])],
    recovered: [...(params.alerts?.recovered || [])],
  };

  if (ALERT_STATUSES.some((status) => prompt.statuses.includes(status))) {
    alerts.new = alerts.new.filter((alert) =>
      prompt.statuses.includes(get(alert, 'kibana.alert.status'))
    );
    alerts.recovered = alerts.recovered.filter((alert) =>
      prompt.statuses.includes(get(alert, 'kibana.alert.status'))
    );
  }

  if (alerts.new.length === 0 && alerts.recovered.length === 0) {
    return;
  }

  const connectorsList = await actionsClient.getAll().then((connectors) => {
    return connectors.map((connector) => {
      if (connector.actionTypeId in connectorParamsSchemas) {
        return {
          ...connector,
          parameters: connectorParamsSchemas[connector.actionTypeId],
        };
      }

      return connector;
    });
  });

  const backgroundInstruction = dedent(
    `You are called as a background process because alerts have changed state.
As a background process you are not interacting with a user. Because of that DO NOT ask for user
input if tasked to execute actions. You can generate multiple responses in a row.
If available, include the link of the conversation at the end of your answer.`
  );

  functionClient.registerInstruction(backgroundInstruction);

  const hasSlackConnector = !!connectorsList.filter(
    (connector) => connector.actionTypeId === '.slack'
  ).length;

  if (hasSlackConnector) {
    const slackConnectorInstruction: RegisterInstructionCallback = ({ availableFunctionNames }) =>
      availableFunctionNames.includes(EXECUTE_CONNECTOR_FUNCTION_NAME)
        ? dedent(
            `The execute_connector function can be used to invoke Kibana connectors.
        To send to the Slack connector, you need the following arguments:
        - the "id" of the connector
        - the "params" parameter that you will fill with the message
        Please include both "id" and "params.message" in the function arguments when executing the Slack connector..`
          )
        : undefined;

    functionClient.registerInstruction(slackConnectorInstruction);
  }

  const alertsContext = await getAlertsContext(
    params.rule,
    alerts,
    async (alert: Record<string, any>) => {
      const alertDetailsContext = await alertDetailsContextService.getAlertDetailsContext(
        {
          core: resources.context.core,
          licensing: resources.context.licensing,
          request: resources.request,
        },
        {
          alert_started_at: get(alert, 'kibana.alert.start'),
          'service.name': get(alert, 'service.name'),
          'service.environment': get(alert, 'service.environment'),
          'host.name': get(alert, 'host.name'),
        }
      );
      return alertDetailsContext
        .map(({ description, data }) => `${description}:\n${JSON.stringify(data, null, 2)}`)
        .join('\n\n');
    }
  );

  const { response$ } = client.complete({
    functionClient,
    persist: true,
    isPublic: true,
    connectorId: params.connector,
    signal: new AbortController().signal,
    kibanaPublicUrl: (await resources.plugins.core.start()).http.basePath.publicBaseUrl,
    messages: [
      {
        '@timestamp': new Date().toISOString(),
        message: {
          role: MessageRole.User,
          content: prompt.message,
        },
      },
      {
        '@timestamp': new Date().toISOString(),
        message: {
          role: MessageRole.Assistant,
          content: '',
          function_call: {
            name: 'get_alerts_context',
            arguments: JSON.stringify({}),
            trigger: MessageRole.Assistant as const,
          },
        },
      },
      {
        '@timestamp': new Date().toISOString(),
        message: {
          role: MessageRole.User,
          name: 'get_alerts_context',
          content: JSON.stringify({ context: alertsContext }),
        },
      },
      {
        '@timestamp': new Date().toISOString(),
        message: {
          role: MessageRole.Assistant,
          content: '',
          function_call: {
            name: 'get_connectors',
            arguments: JSON.stringify({}),
            trigger: MessageRole.Assistant as const,
          },
        },
      },
      {
        '@timestamp': new Date().toISOString(),
        message: {
          role: MessageRole.User,
          name: 'get_connectors',
          content: JSON.stringify({
            connectors: connectorsList,
          }),
        },
      },
    ],
  });

  response$
    .pipe(
      filter(
        (event): event is ChatCompletionChunkEvent =>
          event.type === StreamingChatResponseEventType.ChatCompletionChunk
      )
    )
    .pipe(concatenateChatCompletionChunks())
    .subscribe({
      error: (err) => {
        logger.error(err);
      },
    });
}

export const getObsAIAssistantConnectorAdapter = (): ConnectorAdapter<
  ActionParamsType,
  ConnectorParamsType
> => {
  return {
    connectorTypeId: OBSERVABILITY_AI_ASSISTANT_CONNECTOR_ID,
    ruleActionParamsSchema: ParamsSchema,
    getKibanaPrivileges: () => CONNECTOR_PRIVILEGES,
    buildActionParams: ({ params, rule, ruleUrl, alerts }) => {
      return {
        connector: params.connector,
        // Ensure backwards compatibility by using the message field as a prompt if prompts are missing
        prompts: params.prompts
          ? params.prompts
          : [
              {
                statuses: ALERT_STATUSES,
                message: params.message || '',
              },
            ],
        rule: { id: rule.id, name: rule.name, tags: rule.tags, ruleUrl: ruleUrl ?? null },
        alerts: {
          new: alerts.new.data,
          recovered: alerts.recovered.data,
        },
      };
    },
  };
};

async function getAlertsContext(
  rule: RuleType,
  alerts: AlertSummary,
  getAlertContext: (alert: Record<string, any>) => Promise<string>
): Promise<string> {
  const getAlertGroupDetails = async (alertGroup: Array<Record<string, any>>) => {
    const formattedDetails = await Promise.all(
      alertGroup.map(async (alert) => {
        return `- ${JSON.stringify(
          alert
        )}. The following contextual information is available:\n${await getAlertContext(alert)}`;
      })
    ).then((messages) => messages.join('\n'));

    return formattedDetails;
  };

  let details = `The following alerts have changed state for the rule ${JSON.stringify(
    rule,
    null,
    2
  )}:\n`;
  if (alerts.new.length > 0) {
    details += `- ${alerts.new.length} alerts have fired:\n${await getAlertGroupDetails(
      alerts.new
    )}\n`;
  }
  if (alerts.recovered.length > 0) {
    details += `- ${alerts.recovered.length} alerts have recovered\n: ${await getAlertGroupDetails(
      alerts.recovered
    )}\n`;
  }

  return details;
}
