/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock } from '@kbn/core-logging-server-mocks';

import { registerRoutes } from './register_routes';
import { serverMock } from '../__mocks__/server';

import { findAlertSummaryRoute } from './alert_summary/find_route';
import { cancelAttackDiscoveryRoute } from './attack_discovery/post/cancel/cancel_attack_discovery';
import { getAttackDiscoveryRoute } from './attack_discovery/get/get_attack_discovery';
import { postAttackDiscoveryRoute } from './attack_discovery/post/post_attack_discovery';
import { createConversationRoute } from './user_conversations/create_route';
import { deleteConversationRoute } from './user_conversations/delete_route';
import { readConversationRoute } from './user_conversations/read_route';
import { updateConversationRoute } from './user_conversations/update_route';
import { findUserConversationsRoute } from './user_conversations/find_route';
import { bulkActionConversationsRoute } from './user_conversations/bulk_actions_route';
import { appendConversationMessageRoute } from './user_conversations/append_conversation_messages_route';
import { getKnowledgeBaseIndicesRoute } from './knowledge_base/get_knowledge_base_indices';
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
import { getKnowledgeBaseEntryRoute } from './knowledge_base/entries/get_route';
import { bulkAlertSummaryRoute } from './alert_summary/bulk_actions_route';
import { createAttackDiscoverySchedulesRoute } from './attack_discovery/schedules/create';
import { getAttackDiscoverySchedulesRoute } from './attack_discovery/schedules/get';
import { updateAttackDiscoverySchedulesRoute } from './attack_discovery/schedules/update';
import { deleteAttackDiscoverySchedulesRoute } from './attack_discovery/schedules/delete';
import { findAttackDiscoverySchedulesRoute } from './attack_discovery/schedules/find';
import { disableAttackDiscoverySchedulesRoute } from './attack_discovery/schedules/disable';
import { enableAttackDiscoverySchedulesRoute } from './attack_discovery/schedules/enable';
import { defaultInferenceEndpoints } from '@kbn/inference-common';

jest.mock('./alert_summary/find_route');
const findAlertSummaryRouteMock = findAlertSummaryRoute as jest.Mock;
jest.mock('./attack_discovery/post/cancel/cancel_attack_discovery');
const cancelAttackDiscoveryRouteMock = cancelAttackDiscoveryRoute as jest.Mock;
jest.mock('./attack_discovery/get/get_attack_discovery');
const getAttackDiscoveryRouteMock = getAttackDiscoveryRoute as jest.Mock;
jest.mock('./attack_discovery/post/post_attack_discovery');
const postAttackDiscoveryRouteMock = postAttackDiscoveryRoute as jest.Mock;
jest.mock('./user_conversations/create_route');
const createConversationRouteMock = createConversationRoute as jest.Mock;
jest.mock('./user_conversations/delete_route');
const deleteConversationRouteMock = deleteConversationRoute as jest.Mock;
jest.mock('./user_conversations/read_route');
const readConversationRouteMock = readConversationRoute as jest.Mock;
jest.mock('./user_conversations/update_route');
const updateConversationRouteMock = updateConversationRoute as jest.Mock;
jest.mock('./user_conversations/find_route');
const findUserConversationsRouteMock = findUserConversationsRoute as jest.Mock;
jest.mock('./user_conversations/bulk_actions_route');
const bulkActionConversationsRouteMock = bulkActionConversationsRoute as jest.Mock;
jest.mock('./user_conversations/append_conversation_messages_route');
const appendConversationMessageRouteMock = appendConversationMessageRoute as jest.Mock;
jest.mock('./knowledge_base/get_knowledge_base_indices');
const getKnowledgeBaseIndicesRouteMock = getKnowledgeBaseIndicesRoute as jest.Mock;
jest.mock('./knowledge_base/get_knowledge_base_status');
const getKnowledgeBaseStatusRouteMock = getKnowledgeBaseStatusRoute as jest.Mock;
jest.mock('./knowledge_base/post_knowledge_base');
const postKnowledgeBaseRouteMock = postKnowledgeBaseRoute as jest.Mock;
jest.mock('./evaluate/get_evaluate');
const getEvaluateRouteMock = getEvaluateRoute as jest.Mock;
jest.mock('./evaluate/post_evaluate');
const postEvaluateRouteMock = postEvaluateRoute as jest.Mock;
jest.mock('./capabilities/get_capabilities_route');
const getCapabilitiesRouteMock = getCapabilitiesRoute as jest.Mock;
jest.mock('./prompts/bulk_actions_route');
const bulkPromptsRouteMock = bulkPromptsRoute as jest.Mock;
jest.mock('./prompts/find_route');
const findPromptsRouteMock = findPromptsRoute as jest.Mock;
jest.mock('./anonymization_fields/bulk_actions_route');
const bulkActionAnonymizationFieldsRouteMock = bulkActionAnonymizationFieldsRoute as jest.Mock;
jest.mock('./anonymization_fields/find_route');
const findAnonymizationFieldsRouteMock = findAnonymizationFieldsRoute as jest.Mock;
jest.mock('./chat/chat_complete_route');
const chatCompleteRouteMock = chatCompleteRoute as jest.Mock;
jest.mock('./post_actions_connector_execute');
const postActionsConnectorExecuteRouteMock = postActionsConnectorExecuteRoute as jest.Mock;
jest.mock('./knowledge_base/entries/bulk_actions_route');
const bulkActionKnowledgeBaseEntriesRouteMock = bulkActionKnowledgeBaseEntriesRoute as jest.Mock;
jest.mock('./knowledge_base/entries/create_route');
const createKnowledgeBaseEntryRouteMock = createKnowledgeBaseEntryRoute as jest.Mock;
jest.mock('./knowledge_base/entries/find_route');
const findKnowledgeBaseEntriesRouteMock = findKnowledgeBaseEntriesRoute as jest.Mock;
jest.mock('./defend_insights');
const getDefendInsightRouteMock = getDefendInsightRoute as jest.Mock;
const getDefendInsightsRouteMock = getDefendInsightsRoute as jest.Mock;
const postDefendInsightsRouteMock = postDefendInsightsRoute as jest.Mock;
jest.mock('./knowledge_base/entries/delete_route');
const deleteKnowledgeBaseEntryRouteMock = deleteKnowledgeBaseEntryRoute as jest.Mock;
jest.mock('./knowledge_base/entries/update_route');
const updateKnowledgeBaseEntryRouteMock = updateKnowledgeBaseEntryRoute as jest.Mock;
jest.mock('./knowledge_base/entries/get_route');
const getKnowledgeBaseEntryRouteMock = getKnowledgeBaseEntryRoute as jest.Mock;
jest.mock('./alert_summary/bulk_actions_route');
const bulkAlertSummaryRouteMock = bulkAlertSummaryRoute as jest.Mock;
jest.mock('./attack_discovery/schedules/create');
const createAttackDiscoverySchedulesRouteMock = createAttackDiscoverySchedulesRoute as jest.Mock;
jest.mock('./attack_discovery/schedules/get');
const getAttackDiscoverySchedulesRouteMock = getAttackDiscoverySchedulesRoute as jest.Mock;
jest.mock('./attack_discovery/schedules/update');
const updateAttackDiscoverySchedulesRouteMock = updateAttackDiscoverySchedulesRoute as jest.Mock;
jest.mock('./attack_discovery/schedules/delete');
const deleteAttackDiscoverySchedulesRouteMock = deleteAttackDiscoverySchedulesRoute as jest.Mock;
jest.mock('./attack_discovery/schedules/find');
const findAttackDiscoverySchedulesRouteMock = findAttackDiscoverySchedulesRoute as jest.Mock;
jest.mock('./attack_discovery/schedules/disable');
const disableAttackDiscoverySchedulesRouteMock = disableAttackDiscoverySchedulesRoute as jest.Mock;
jest.mock('./attack_discovery/schedules/enable');
const enableAttackDiscoverySchedulesRouteMock = enableAttackDiscoverySchedulesRoute as jest.Mock;

describe('registerRoutes', () => {
  const loggerMock = loggingSystemMock.createLogger();
  let server: ReturnType<typeof serverMock.create>;
  const config = { elserInferenceId: defaultInferenceEndpoints.ELSER, responseTimeout: 60000 };

  beforeEach(async () => {
    jest.clearAllMocks();

    server = serverMock.create();
    registerRoutes(server.router, loggerMock, config);
  });

  it('should call `cancelAttackDiscoveryRouteMock`', () => {
    expect(cancelAttackDiscoveryRouteMock).toHaveBeenCalledWith(server.router);
  });

  it('should call `getAttackDiscoveryRouteMock`', () => {
    expect(getAttackDiscoveryRouteMock).toHaveBeenCalledWith(server.router);
  });

  it('should call `postAttackDiscoveryRouteMock`', () => {
    expect(postAttackDiscoveryRouteMock).toHaveBeenCalledWith(server.router);
  });

  it('should call `createConversationRouteMock`', () => {
    expect(createConversationRouteMock).toHaveBeenCalledWith(server.router);
  });

  it('should call `deleteConversationRouteMock`', () => {
    expect(deleteConversationRouteMock).toHaveBeenCalledWith(server.router);
  });

  it('should call `readConversationRouteMock`', () => {
    expect(readConversationRouteMock).toHaveBeenCalledWith(server.router);
  });

  it('should call `updateConversationRouteMock`', () => {
    expect(updateConversationRouteMock).toHaveBeenCalledWith(server.router);
  });

  it('should call `findUserConversationsRouteMock`', () => {
    expect(findUserConversationsRouteMock).toHaveBeenCalledWith(server.router);
  });

  it('should call `bulkActionConversationsRouteMock`', () => {
    expect(bulkActionConversationsRouteMock).toHaveBeenCalledWith(server.router, loggerMock);
  });

  it('should call `appendConversationMessageRouteMock`', () => {
    expect(appendConversationMessageRouteMock).toHaveBeenCalledWith(server.router);
  });

  it('should call `getKnowledgeBaseIndicesRouteMock`', () => {
    expect(getKnowledgeBaseIndicesRouteMock).toHaveBeenCalledWith(server.router);
  });

  it('should call `getKnowledgeBaseStatusRouteMock`', () => {
    expect(getKnowledgeBaseStatusRouteMock).toHaveBeenCalledWith(server.router);
  });

  it('should call `postKnowledgeBaseRouteMock`', () => {
    expect(postKnowledgeBaseRouteMock).toHaveBeenCalledWith(server.router);
  });

  it('should call `getEvaluateRouteMock`', () => {
    expect(getEvaluateRouteMock).toHaveBeenCalledWith(server.router);
  });

  it('should call `postEvaluateRouteMock`', () => {
    expect(postEvaluateRouteMock).toHaveBeenCalledWith(server.router);
  });

  it('should call `getCapabilitiesRouteMock`', () => {
    expect(getCapabilitiesRouteMock).toHaveBeenCalledWith(server.router);
  });

  it('should call `bulkPromptsRouteMock`', () => {
    expect(bulkPromptsRouteMock).toHaveBeenCalledWith(server.router, loggerMock);
  });

  it('should call `findPromptsRouteMock`', () => {
    expect(findPromptsRouteMock).toHaveBeenCalledWith(server.router, loggerMock);
  });

  it('should call `bulkActionAnonymizationFieldsRouteMock`', () => {
    expect(bulkActionAnonymizationFieldsRouteMock).toHaveBeenCalledWith(server.router, loggerMock);
  });

  it('should call `findAnonymizationFieldsRouteMock`', () => {
    expect(findAnonymizationFieldsRouteMock).toHaveBeenCalledWith(server.router, loggerMock);
  });

  it('should call `chatCompleteRouteMock`', () => {
    expect(chatCompleteRouteMock).toHaveBeenCalledWith(server.router, config);
  });

  it('should call `postActionsConnectorExecuteRouteMock`', () => {
    expect(postActionsConnectorExecuteRouteMock).toHaveBeenCalledWith(server.router, config);
  });

  it('should call `bulkActionKnowledgeBaseEntriesRouteMock`', () => {
    expect(bulkActionKnowledgeBaseEntriesRouteMock).toHaveBeenCalledWith(server.router);
  });

  it('should call `createKnowledgeBaseEntryRouteMock`', () => {
    expect(createKnowledgeBaseEntryRouteMock).toHaveBeenCalledWith(server.router);
  });

  it('should call `findKnowledgeBaseEntriesRouteMock`', () => {
    expect(findKnowledgeBaseEntriesRouteMock).toHaveBeenCalledWith(server.router);
  });

  it('should call `getDefendInsightRouteMock`', () => {
    expect(getDefendInsightRouteMock).toHaveBeenCalledWith(server.router);
  });

  it('should call `getDefendInsightsRouteMock`', () => {
    expect(getDefendInsightsRouteMock).toHaveBeenCalledWith(server.router);
  });

  it('should call `postDefendInsightsRouteMock`', () => {
    expect(postDefendInsightsRouteMock).toHaveBeenCalledWith(server.router);
  });

  it('should call `deleteKnowledgeBaseEntryRouteMock`', () => {
    expect(deleteKnowledgeBaseEntryRouteMock).toHaveBeenCalledWith(server.router);
  });

  it('should call `updateKnowledgeBaseEntryRouteMock`', () => {
    expect(updateKnowledgeBaseEntryRouteMock).toHaveBeenCalledWith(server.router);
  });

  it('should call `getKnowledgeBaseEntryRouteMock`', () => {
    expect(getKnowledgeBaseEntryRouteMock).toHaveBeenCalledWith(server.router);
  });

  it('should call `bulkAlertSummaryRouteMock`', () => {
    expect(bulkAlertSummaryRouteMock).toHaveBeenCalledWith(server.router, loggerMock);
  });

  it('should call `findAlertSummaryRouteMock`', () => {
    expect(findAlertSummaryRouteMock).toHaveBeenCalledWith(server.router, loggerMock);
  });

  it('should call `createAttackDiscoverySchedulesRouteMock`', () => {
    expect(createAttackDiscoverySchedulesRouteMock).toHaveBeenCalledWith(server.router);
  });

  it('should call `getAttackDiscoverySchedulesRouteMock`', () => {
    expect(getAttackDiscoverySchedulesRouteMock).toHaveBeenCalledWith(server.router);
  });

  it('should call `updateAttackDiscoverySchedulesRouteMock`', () => {
    expect(updateAttackDiscoverySchedulesRouteMock).toHaveBeenCalledWith(server.router);
  });

  it('should call `deleteAttackDiscoverySchedulesRouteMock`', () => {
    expect(deleteAttackDiscoverySchedulesRouteMock).toHaveBeenCalledWith(server.router);
  });

  it('should call `findAttackDiscoverySchedulesRouteMock`', () => {
    expect(findAttackDiscoverySchedulesRouteMock).toHaveBeenCalledWith(server.router);
  });

  it('should call `disableAttackDiscoverySchedulesRouteMock`', () => {
    expect(disableAttackDiscoverySchedulesRouteMock).toHaveBeenCalledWith(server.router);
  });

  it('should call `enableAttackDiscoverySchedulesRouteMock`', () => {
    expect(enableAttackDiscoverySchedulesRouteMock).toHaveBeenCalledWith(server.router);
  });
});
