/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServerMock } from '@kbn/core/server/mocks';
import { getConversationSearchEsMock } from './conversations_schema.mock';
import type { estypes } from '@elastic/elasticsearch';
import type { EsConversationSchema } from '../ai_assistant_data_clients/conversations/types';
import type { FindResponse } from '../ai_assistant_data_clients/find';
import type { ConversationResponse } from '@kbn/elastic-assistant-common';
import type { EsPromptsSchema } from '../ai_assistant_data_clients/prompts/types';
import { getPromptsSearchEsMock } from './prompts_schema.mock';
import type { EsAnonymizationFieldsSchema } from '../ai_assistant_data_clients/anonymization_fields/types';
import { getAnonymizationFieldsSearchEsMock } from './anonymization_fields_schema.mock';
import { getKnowledgeBaseEntrySearchEsMock } from './knowledge_base_entry_schema.mock';
import type { EsKnowledgeBaseEntrySchema } from '../ai_assistant_data_clients/knowledge_base/types';
import type { EsAlertSummarySchema } from '../ai_assistant_data_clients/alert_summary/types';
import { getAlertSummarySearchEsMock } from './alert_summary.mock';

export const responseMock = {
  create: httpServerMock.createResponseFactory,
};

export const getEmptyFindResult = (): FindResponse<EsConversationSchema> => ({
  page: 1,
  perPage: 1,
  total: 0,
  data: getBasicEmptySearchResponse(),
});

export const getFindKnowledgeBaseEntriesResultWithSingleHit =
  (): FindResponse<EsKnowledgeBaseEntrySchema> => ({
    page: 1,
    perPage: 1,
    total: 1,
    data: getKnowledgeBaseEntrySearchEsMock(),
  });

export const getFindConversationsResultWithSingleHit = (): FindResponse<EsConversationSchema> => ({
  page: 1,
  perPage: 1,
  total: 1,
  data: getConversationSearchEsMock(),
});

export const getFindPromptsResultWithSingleHit = (): FindResponse<EsPromptsSchema> => ({
  page: 1,
  perPage: 1,
  total: 1,
  data: getPromptsSearchEsMock(),
});

export const getFindAlertSummaryResultWithSingleHit = (): FindResponse<EsAlertSummarySchema> => ({
  page: 1,
  perPage: 1,
  total: 1,
  data: getAlertSummarySearchEsMock(),
});

export const getFindAnonymizationFieldsResultWithSingleHit =
  (): FindResponse<EsAnonymizationFieldsSchema> => ({
    page: 1,
    perPage: 1,
    total: 1,
    data: getAnonymizationFieldsSearchEsMock(),
  });

export const getBasicEmptySearchResponse = (): estypes.SearchResponse<EsConversationSchema> => ({
  took: 1,
  timed_out: false,
  _shards: { total: 1, successful: 1, skipped: 0, failed: 0 },
  hits: {
    hits: [],
    total: { relation: 'eq', value: 0 },
    max_score: 0,
  },
});

export const getConversationResponseMock = (
  timestamp: string = new Date().toISOString()
): ConversationResponse => ({
  id: 'test',
  title: 'test',
  apiConfig: {
    connectorId: '1',
    actionTypeId: '.gen-ai',
    defaultSystemPromptId: 'default-system-prompt',
    model: 'test-model',
    provider: 'OpenAI',
  },
  excludeFromLastConversationStorage: false,
  messages: [],
  replacements: {},
  createdAt: timestamp,
  namespace: 'default',
  updatedAt: timestamp,
  timestamp,
  category: 'assistant',
  users: [
    {
      id: 'u_mGBROF_q5bmFCATbLXAcCwKa0k8JvONAwSruelyKA5E_0',
      name: 'elastic',
    },
  ],
  createdBy: {
    id: 'u_mGBROF_q5bmFCATbLXAcCwKa0k8JvONAwSruelyKA5E_0',
    name: 'elastic',
  },
});

export const getSuggestUsersResponseMock = () => [
  {
    uid: 'u_BpVmcgKeRZ8a1-SoLadysLvounWfD_HHVMagTW1DUGQ_0',
    enabled: true,
    data: {},
    user: {
      username: 'test_madisen_homenick',
      email: 'test_madisen_homenick@elastic.co',
      full_name: 'Madisen Homenick',
    },
  },
  {
    uid: 'u_H4dvS8y4Ea7CR8zUkMGlP8QAwC93U04HoeeshzhKC0U_0',
    enabled: true,
    data: {},
    user: {
      username: 'test_everette_konopelski',
      email: 'test_everette_konopelski@elastic.co',
      full_name: 'Everette Konopelski',
    },
  },
  {
    uid: 'u_GAOUoLZmYHAWYFOBpRfgucICfMPzd7oA6akO5FyQqFI_0',
    enabled: true,
    data: {},
    user: {
      username: 'test_terrill_bradtke',
      email: 'test_terrill_bradtke@elastic.co',
      full_name: 'Terrill Bradtke',
    },
  },
  {
    uid: 'u_s1gS_ARa2hBaUbBaq4eeHE7ZGCKl2HNgZpxeTqedx8U_0',
    enabled: true,
    data: {},
    user: {
      username: 'test_bernadette_dubuque',
      email: 'test_bernadette_dubuque@elastic.co',
      full_name: 'Bernadette DuBuque',
    },
  },
  {
    uid: 'u_23dig2_LiJBxztf2iImjtAOW6zxfPJTkrOrrgwgYk4M_0',
    enabled: true,
    data: {},
    user: {
      username: 'test_delpha_swaniawski',
      email: 'test_delpha_swaniawski@elastic.co',
      full_name: 'Delpha Swaniawski',
    },
  },
];
