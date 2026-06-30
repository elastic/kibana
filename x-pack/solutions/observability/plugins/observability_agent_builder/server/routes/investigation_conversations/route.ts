/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import * as t from 'io-ts';
import type { KibanaRequest, Logger } from '@kbn/core/server';
import type { ServerRouteRepository } from '@kbn/server-route-repository-utils';
import {
  agentBuilderDefaultAgentId,
  ConversationRoundStatus,
  type Conversation,
} from '@kbn/agent-builder-common';
import { apiPrivileges } from '@kbn/agent-builder-plugin/common/features';
import type { ConversationClient } from '@kbn/agent-builder-server';
import type {
  ObservabilityAgentBuilderCoreSetup,
  ObservabilityAgentBuilderPluginSetupDependencies,
} from '../../types';
import {
  OBSERVABILITY_INCIDENT_TEMPLATE_ID,
  OBSERVABILITY_INVESTIGATION_TEMPLATE_ID,
} from '../../../common/constants';
import {
  buildIncidentFieldsFromInvestigationRefresh,
  buildIncidentCustomFields,
  buildInvestigationCustomFields,
  buildInvestigationFieldsWithIncidentLink,
  buildInvestigationSeedMessage,
  buildManualRefreshFields,
} from '../../investigation_conversations/conversation_metadata';
import { runConversationWorkflowHooksForTrigger } from '../../investigation_conversations/investigation_update_task';
import { createObservabilityAgentBuilderServerRoute } from '../create_observability_agent_builder_server_route';

const metadataRt = t.record(t.string, t.unknown);

const createInvestigationBodyRt = t.partial({
  title: t.string,
  serviceName: t.string,
  workflowExecutionId: t.string,
  workflowId: t.string,
  connectorId: t.string,
  initialContext: t.string,
  report: t.string,
  currentState: t.string,
  severity: t.string,
  status: t.string,
  timeline: t.unknown,
  workflowHooks: t.unknown,
  metadata: metadataRt,
});

const refreshInvestigationBodyRt = t.partial({
  currentState: t.string,
  outcome: t.string,
  status: t.string,
  timeline: t.unknown,
  workflowHooks: t.unknown,
  metadata: metadataRt,
});

const getConversationClient = async ({
  core,
  request,
}: {
  core: ObservabilityAgentBuilderCoreSetup;
  request: KibanaRequest;
}): Promise<ConversationClient> => {
  const [, startDeps] = await core.getStartServices();
  return startDeps.agentBuilder.conversations.getScopedClient({ request });
};

const getTemplateId = (conversation: Conversation): string | undefined => {
  return conversation.template_snapshot?.template_id ?? conversation.template_id;
};

const assertInvestigationConversation = (conversation: Conversation) => {
  if (getTemplateId(conversation) !== OBSERVABILITY_INVESTIGATION_TEMPLATE_ID) {
    throw Boom.badRequest('Conversation is not an observability investigation');
  }
};

const getString = (value: unknown): string | undefined => {
  return typeof value === 'string' && value.length > 0 ? value : undefined;
};

const getInvestigationTitle = ({
  title,
  serviceName,
  workflowExecutionId,
}: {
  title?: string;
  serviceName?: string;
  workflowExecutionId?: string;
}) => {
  if (title) {
    return title;
  }
  if (serviceName) {
    return `Investigation: ${serviceName}`;
  }
  if (workflowExecutionId) {
    return `Investigation: ${workflowExecutionId}`;
  }
  return 'Observability investigation';
};

const buildIncidentTitle = (investigation: Conversation): string => {
  const serviceName = getString(investigation.custom_fields?.service_name);
  if (serviceName) {
    return `Incident: ${serviceName}`;
  }
  return `Incident: ${investigation.title}`;
};

const runConfiguredWorkflowHooks = async ({
  plugins,
  client,
  request,
  logger,
  conversation,
  trigger,
}: {
  plugins: ObservabilityAgentBuilderPluginSetupDependencies;
  client: ConversationClient;
  request: KibanaRequest;
  logger: Logger;
  conversation: Conversation;
  trigger: string;
}): Promise<Conversation> => {
  if (!plugins.workflowsManagement) {
    return conversation;
  }

  try {
    const hookResult = await runConversationWorkflowHooksForTrigger({
      conversation,
      trigger,
      workflowApi: plugins.workflowsManagement.management,
      request,
      logger,
    });

    const updatedConversation = await client.update({
      id: conversation.id,
      custom_fields: hookResult.customFields,
    });

    return updatedConversation;
  } catch (error) {
    logger.debug(`Failed to run conversation workflow hooks for ${trigger}: ${error}`);
    return conversation;
  }
};

export function getObservabilityAgentBuilderInvestigationConversationRouteRepository(): ServerRouteRepository {
  const createInvestigationFromWorkflowRoute = createObservabilityAgentBuilderServerRoute({
    endpoint:
      'POST /internal/observability_agent_builder/investigation_conversations/from_workflow',
    options: {
      access: 'internal',
    },
    security: {
      authz: {
        requiredPrivileges: [apiPrivileges.writeAgentBuilder],
      },
    },
    params: t.type({
      body: createInvestigationBodyRt,
    }),
    handler: async ({ core, plugins, request, params, response, logger }) => {
      const now = new Date().toISOString();
      const {
        title,
        serviceName,
        workflowExecutionId,
        workflowId,
        connectorId,
        initialContext,
        report,
        currentState,
        severity,
        status,
        timeline,
        workflowHooks,
        metadata,
      } = params.body;
      const client = await getConversationClient({ core, request });
      const customFields = buildInvestigationCustomFields({
        now,
        serviceName,
        workflowExecutionId,
        workflowId,
        connectorId,
        initialContext,
        report,
        currentState,
        severity,
        status,
        timeline,
        workflowHooks,
        metadata,
      });

      const conversation = await client.create({
        agent_id: agentBuilderDefaultAgentId,
        title: getInvestigationTitle({ title, serviceName, workflowExecutionId }),
        rounds: [],
        template_id: OBSERVABILITY_INVESTIGATION_TEMPLATE_ID,
        conversation_mode: 'group',
        status: ConversationRoundStatus.completed,
        custom_fields: customFields,
      });

      const seededConversation = await client.appendMessage({
        conversationId: conversation.id,
        message: buildInvestigationSeedMessage(customFields),
      });
      const hookedConversation = await runConfiguredWorkflowHooks({
        plugins,
        client,
        request,
        logger,
        conversation: seededConversation.conversation,
        trigger: 'conversation.created',
      });

      return response.ok({
        body: {
          conversation: hookedConversation,
        },
      });
    },
  });

  const createIncidentFromInvestigationRoute = createObservabilityAgentBuilderServerRoute({
    endpoint:
      'POST /internal/observability_agent_builder/investigation_conversations/{conversationId}/incident',
    options: {
      access: 'internal',
    },
    security: {
      authz: {
        requiredPrivileges: [apiPrivileges.writeAgentBuilder],
      },
    },
    params: t.type({
      path: t.type({
        conversationId: t.string,
      }),
    }),
    handler: async ({ core, plugins, request, params, response, logger }) => {
      const now = new Date().toISOString();
      const client = await getConversationClient({ core, request });
      const investigation = await client.get(params.path.conversationId);
      assertInvestigationConversation(investigation);

      const existingIncidentConversationId = getString(
        investigation.custom_fields?.incident_conversation_id
      );
      if (existingIncidentConversationId) {
        try {
          const incidentConversation = await client.get(existingIncidentConversationId);
          return response.ok({
            body: {
              incidentConversation,
              investigationConversation: investigation,
              created: false,
            },
          });
        } catch (error) {
          logger.debug(
            `Unable to load linked incident conversation ${existingIncidentConversationId}; creating a new one`
          );
        }
      }

      const incidentConversation = await client.create({
        agent_id: investigation.agent_id,
        title: buildIncidentTitle(investigation),
        rounds: [],
        template_id: OBSERVABILITY_INCIDENT_TEMPLATE_ID,
        conversation_mode: 'group',
        status: ConversationRoundStatus.completed,
        custom_fields: buildIncidentCustomFields({ investigation, now }),
      });

      const linkedInvestigation = await client.update({
        id: investigation.id,
        custom_fields: buildInvestigationFieldsWithIncidentLink({
          investigation,
          incidentConversationId: incidentConversation.id,
          now,
        }),
      });

      const incidentWithMessage = await client.appendMessage({
        conversationId: incidentConversation.id,
        message: `Incident created from investigation ${investigation.id}. Continue coordinating incident response here.`,
      });
      const investigationWithMessage = await client.appendMessage({
        conversationId: linkedInvestigation.id,
        message: `Incident conversation created: ${incidentConversation.id}`,
      });
      const hookedIncident = await runConfiguredWorkflowHooks({
        plugins,
        client,
        request,
        logger,
        conversation: incidentWithMessage.conversation,
        trigger: 'incident.created',
      });
      let responseInvestigation = investigationWithMessage.conversation;
      try {
        responseInvestigation = await client.get(investigationWithMessage.conversation.id);
      } catch (error) {
        logger.debug(
          `Unable to reload investigation conversation ${investigationWithMessage.conversation.id}: ${error}`
        );
      }

      return response.ok({
        body: {
          incidentConversation: hookedIncident,
          investigationConversation: responseInvestigation,
          created: true,
        },
      });
    },
  });

  const refreshInvestigationRoute = createObservabilityAgentBuilderServerRoute({
    endpoint:
      'POST /internal/observability_agent_builder/investigation_conversations/{conversationId}/refresh',
    options: {
      access: 'internal',
    },
    security: {
      authz: {
        requiredPrivileges: [apiPrivileges.writeAgentBuilder],
      },
    },
    params: t.type({
      path: t.type({
        conversationId: t.string,
      }),
      body: refreshInvestigationBodyRt,
    }),
    handler: async ({ core, plugins, request, params, response, logger }) => {
      const now = new Date().toISOString();
      const client = await getConversationClient({ core, request });
      const investigation = await client.get(params.path.conversationId);
      assertInvestigationConversation(investigation);

      const conversation = await client.update({
        id: investigation.id,
        status:
          params.body.status && !['pending', 'running'].includes(params.body.status)
            ? ConversationRoundStatus.completed
            : investigation.status,
        custom_fields: buildManualRefreshFields({
          customFields: investigation.custom_fields ?? {},
          now,
          currentState: params.body.currentState,
          outcome: params.body.outcome,
          status: params.body.status,
          timeline: params.body.timeline,
          workflowHooks: params.body.workflowHooks,
          metadata: params.body.metadata,
        }),
      });
      const hookedConversation = await runConfiguredWorkflowHooks({
        plugins,
        client,
        request,
        logger,
        conversation,
        trigger: 'manual_refresh',
      });
      const incidentConversationId = getString(
        hookedConversation.custom_fields?.incident_conversation_id ??
          investigation.custom_fields?.incident_conversation_id
      );

      if (incidentConversationId) {
        try {
          const incidentConversation = await client.get(incidentConversationId);
          await client.update({
            id: incidentConversation.id,
            custom_fields: buildIncidentFieldsFromInvestigationRefresh({
              customFields: incidentConversation.custom_fields ?? {},
              now,
              investigationConversationId: hookedConversation.id,
              currentState: params.body.currentState,
              outcome: params.body.outcome,
              timeline: params.body.timeline,
            }),
          });
        } catch (error) {
          logger.debug(
            `Unable to refresh linked incident conversation ${incidentConversationId}: ${error}`
          );
        }
      }

      return response.ok({
        body: {
          conversation: hookedConversation,
        },
      });
    },
  });

  return {
    ...createInvestigationFromWorkflowRoute,
    ...createIncidentFromInvestigationRoute,
    ...refreshInvestigationRoute,
  };
}
