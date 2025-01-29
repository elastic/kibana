/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AuthenticatedUser } from '@kbn/core-security-common';
import { AIAssistantKnowledgeBaseDataClient } from '../../../ai_assistant_data_clients/knowledge_base';
import { transformESSearchToKnowledgeBaseEntry } from '../../../ai_assistant_data_clients/knowledge_base/transforms';
import { EsKnowledgeBaseEntrySchema } from '../../../ai_assistant_data_clients/knowledge_base/types';

export const getKBUserFilter = (user: AuthenticatedUser | null) => {
  // Only return the current users entries and all other global entries (where user[] is empty)
  const globalFilter = 'NOT users: {name:* OR id:* }';

  const nameFilter = user?.username ? `users: {name: "${user?.username}"}` : '';
  const idFilter = user?.profile_uid ? `users: {id: ${user?.profile_uid}}` : '';
  const userFilter =
    user?.username && user?.profile_uid
      ? ` OR (${nameFilter} OR ${idFilter})`
      : user?.username
      ? ` OR ${nameFilter}`
      : user?.profile_uid
      ? ` OR ${idFilter}`
      : '';

  return `(${globalFilter}${userFilter})`;
};

export const validateDocumentsModification = async (
  kbDataClient: AIAssistantKnowledgeBaseDataClient | null,
  authenticatedUser: AuthenticatedUser | null,
  documentIds: string[],
  operation: 'delete' | 'update'
) => {
  if (!documentIds.length) {
    return;
  }
  const manageGlobalKnowledgeBaseAIAssistant =
    kbDataClient?.options?.manageGlobalKnowledgeBaseAIAssistant;

  const userFilter = getKBUserFilter(authenticatedUser);
  const documentsFilter = documentIds.map((id) => `_id:${id}`).join(' OR ');
  const entries = await kbDataClient?.findDocuments<EsKnowledgeBaseEntrySchema>({
    page: 1,
    perPage: 100,
    filter: `${documentsFilter} AND ${userFilter}`,
  });
  const availableEntries = entries ? transformESSearchToKnowledgeBaseEntry(entries.data) : [];
  availableEntries.forEach((entry) => {
    // RBAC validation
    const isGlobal = entry.users != null && entry.users.length === 0;
    if (isGlobal && !manageGlobalKnowledgeBaseAIAssistant) {
      throw new Error(`User lacks privileges to ${operation} global knowledge base entries`);
    }
  });
  const availableIds = availableEntries.map((doc) => doc.id);
  const nonAvailableIds = documentIds.filter((id) => !availableIds.includes(id));
  if (nonAvailableIds.length > 0) {
    throw new Error(`Could not find documents to ${operation}: ${nonAvailableIds}.`);
  }
};
