/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';

import { findSecurityAIPromptsRoute } from './security_ai_prompts/find_prompts';
import { findAlertSummaryRoute } from './alert_summary/find_route';
import { findAttackDiscoveriesInternalRoute } from './attack_discovery/internal/get/find_attack_discoveries_internal';
import { findAttackDiscoveriesRoute } from './attack_discovery/public/get/find_attack_discoveries';
import { postAttackDiscoveryGenerateRoute } from './attack_discovery/public/post/post_attack_discovery_generate';
import { postAttackDiscoveryInternalRoute } from './attack_discovery/internal/post/post_attack_discovery_internal';
import { postAttackDiscoveryBulkRoute } from './attack_discovery/public/post/post_attack_discovery_bulk';
import { postAttackDiscoveryBulkInternalRoute } from './attack_discovery/internal/post/post_attack_discovery_bulk_internal';
import type { ElasticAssistantPluginRouter } from '../types';
import { createConversationRoute } from './user_conversations/create_route';
import { deleteConversationRoute } from './user_conversations/delete_route';
import { readConversationRoute } from './user_conversations/read_route';
import { updateConversationRoute } from './user_conversations/update_route';
import { findUserConversationsRoute } from './user_conversations/find_route';
import { bulkActionConversationsRoute } from './user_conversations/bulk_actions_route';
import { appendConversationMessageRoute } from './user_conversations/append_conversation_messages_route';
import { getKnowledgeBaseStatusRoute } from './knowledge_base/get_knowledge_base_status';
import { postKnowledgeBaseRoute } from './knowledge_base/post_knowledge_base';
import { getEvaluateRoute } from './evaluate/get_evaluate';
import { postEvaluateRoute } from './evaluate/post_evaluate';
import { getCapabilitiesRoute } from './capabilities/get_capabilities_route';
import { bulkPromptsRoute } from './prompts/bulk_actions_route';
import { findPromptsRoute } from './prompts/find_route';
import { bulkActionAnonymizationFieldsRoute } from './anonymization_fields/bulk_actions_route';
import { findAnonymizationFieldsRoute } from './anonymization_fields/find_route';
import { chatCompleteRoute } from './chat/chat_complete_route';
import { postActionsConnectorExecuteRoute } from './post_actions_connector_execute';
import { bulkActionKnowledgeBaseEntriesRoute } from './knowledge_base/entries/bulk_actions_route';
import { createKnowledgeBaseEntryRoute } from './knowledge_base/entries/create_route';
import { findKnowledgeBaseEntriesRoute } from './knowledge_base/entries/find_route';
import {
  getDefendInsightRoute,
  getDefendInsightsRoute,
  postDefendInsightsRoute,
} from './defend_insights';
import { deleteKnowledgeBaseEntryRoute } from './knowledge_base/entries/delete_route';
import { updateKnowledgeBaseEntryRoute } from './knowledge_base/entries/update_route';
import { getAttackDiscoveryGenerationsRoute } from './attack_discovery/public/get/get_attack_discovery_generations';
import { getAttackDiscoveryGenerationRoute } from './attack_discovery/public/get/get_attack_discovery_generation';
import { getAttackDiscoveryGenerationsInternalRoute } from './attack_discovery/internal/get/get_attack_discovery_generations_internal';
import { postAttackDiscoveryGenerationsDismissInternalRoute } from './attack_discovery/internal/post/post_attack_discovery_generations_dismiss_internal';
import { postAttackDiscoveryGenerationsDismissRoute } from './attack_discovery/public/post/post_attack_discovery_generations_dismiss';
import { getKnowledgeBaseEntryRoute } from './knowledge_base/entries/get_route';
import { bulkAlertSummaryRoute } from './alert_summary/bulk_actions_route';
import { createAttackDiscoverySchedulesRoute } from './attack_discovery/schedules/public/post/create';
import { createAttackDiscoverySchedulesInternalRoute } from './attack_discovery/schedules/internal/post/create';
import { getAttackDiscoverySchedulesRoute } from './attack_discovery/schedules/public/get/get';
import { getAttackDiscoverySchedulesInternalRoute } from './attack_discovery/schedules/internal/get/get';
import { updateAttackDiscoverySchedulesRoute } from './attack_discovery/schedules/public/put/update';
import { updateAttackDiscoverySchedulesInternalRoute } from './attack_discovery/schedules/internal/put/update';
import { deleteAttackDiscoverySchedulesRoute } from './attack_discovery/schedules/public/delete/delete';
import { deleteAttackDiscoverySchedulesInternalRoute } from './attack_discovery/schedules/internal/delete/delete';
import { findAttackDiscoverySchedulesInternalRoute } from './attack_discovery/schedules/internal/get/find';
import { findAttackDiscoverySchedulesRoute } from './attack_discovery/schedules/public/get/find';
import { disableAttackDiscoverySchedulesRoute } from './attack_discovery/schedules/public/post/disable';
import { disableAttackDiscoverySchedulesInternalRoute } from './attack_discovery/schedules/internal/post/disable';
import { enableAttackDiscoverySchedulesRoute } from './attack_discovery/schedules/public/post/enable';
import { enableAttackDiscoverySchedulesInternalRoute } from './attack_discovery/schedules/internal/post/enable';
import type { ConfigSchema } from '../config_schema';
import { deleteAllConversationsRoute } from './user_conversations/delete_all_route';
import { suggestUsersRoute } from './users/suggest';

export const registerRoutes = (
  router: ElasticAssistantPluginRouter,
  logger: Logger,
  config: ConfigSchema
) => {
  /** PUBLIC */
  // Chat
  chatCompleteRoute(router, config);

  /** INTERNAL */
  // Capabilities
  getCapabilitiesRoute(router);

  // User Conversations CRUD
  createConversationRoute(router);
  readConversationRoute(router);
  updateConversationRoute(router);
  deleteConversationRoute(router);
  deleteAllConversationsRoute(router);
  appendConversationMessageRoute(router);

  // User Conversations bulk CRUD
  bulkActionConversationsRoute(router, logger);

  // User Conversations search
  findUserConversationsRoute(router);

  // Knowledge Base Setup
  getKnowledgeBaseStatusRoute(router);
  postKnowledgeBaseRoute(router);

  // Knowledge Base Entries
  getKnowledgeBaseEntryRoute(router);
  findKnowledgeBaseEntriesRoute(router);
  createKnowledgeBaseEntryRoute(router);
  updateKnowledgeBaseEntryRoute(router);
  deleteKnowledgeBaseEntryRoute(router);
  bulkActionKnowledgeBaseEntriesRoute(router);

  // Actions Connector Execute (LLM Wrapper)
  postActionsConnectorExecuteRoute(router, config);

  // Evaluate
  getEvaluateRoute(router);
  postEvaluateRoute(router);

  // Users
  suggestUsersRoute(router, logger);

  // Prompts
  bulkPromptsRoute(router, logger);
  findPromptsRoute(router, logger);

  // Security AI Prompts
  findSecurityAIPromptsRoute(router, logger);

  // Anonymization Fields
  bulkActionAnonymizationFieldsRoute(router, logger);
  findAnonymizationFieldsRoute(router, logger);

  // Attack Discovery
  findAttackDiscoveriesInternalRoute(router);
  findAttackDiscoveriesRoute(router);

  postAttackDiscoveryBulkRoute(router);
  postAttackDiscoveryBulkInternalRoute(router);

  getAttackDiscoveryGenerationsRoute(router);
  getAttackDiscoveryGenerationRoute(router);
  getAttackDiscoveryGenerationsInternalRoute(router);

  postAttackDiscoveryGenerationsDismissRoute(router);
  postAttackDiscoveryGenerationsDismissInternalRoute(router);

  postAttackDiscoveryGenerateRoute(router);
  postAttackDiscoveryInternalRoute(router);

  // Attack Discovery Schedules
  createAttackDiscoverySchedulesRoute(router);
  createAttackDiscoverySchedulesInternalRoute(router);

  getAttackDiscoverySchedulesRoute(router);
  getAttackDiscoverySchedulesInternalRoute(router);

  findAttackDiscoverySchedulesRoute(router);
  findAttackDiscoverySchedulesInternalRoute(router);

  updateAttackDiscoverySchedulesRoute(router);
  updateAttackDiscoverySchedulesInternalRoute(router);

  deleteAttackDiscoverySchedulesRoute(router);
  deleteAttackDiscoverySchedulesInternalRoute(router);

  disableAttackDiscoverySchedulesRoute(router);
  disableAttackDiscoverySchedulesInternalRoute(router);

  enableAttackDiscoverySchedulesRoute(router);
  enableAttackDiscoverySchedulesInternalRoute(router);

  // Alert Summary
  bulkAlertSummaryRoute(router, logger);
  findAlertSummaryRoute(router, logger);

  // Defend insights
  getDefendInsightRoute(router);
  getDefendInsightsRoute(router);
  postDefendInsightsRoute(router);
};
