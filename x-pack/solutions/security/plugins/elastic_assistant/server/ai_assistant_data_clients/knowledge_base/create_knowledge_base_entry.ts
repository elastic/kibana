/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidv4 } from 'uuid';
import {
  AnalyticsServiceSetup,
  type AuditLogger,
  AuthenticatedUser,
  ElasticsearchClient,
  Logger,
} from '@kbn/core/server';

import {
  KnowledgeBaseEntryCreateProps,
  KnowledgeBaseEntryResponse,
  KnowledgeBaseEntryUpdateProps,
} from '@kbn/elastic-assistant-common';
import { AUDIT_OUTCOME, KnowledgeBaseAuditAction, knowledgeBaseAuditEvent } from './audit_events';
import {
  CREATE_KNOWLEDGE_BASE_ENTRY_ERROR_EVENT,
  CREATE_KNOWLEDGE_BASE_ENTRY_SUCCESS_EVENT,
} from '../../lib/telemetry/event_based_telemetry';
import { getKnowledgeBaseEntry } from './get_knowledge_base_entry';
import { CreateKnowledgeBaseEntrySchema, UpdateKnowledgeBaseEntrySchema } from './types';

export interface CreateKnowledgeBaseEntryParams {
  auditLogger?: AuditLogger;
  esClient: ElasticsearchClient;
  knowledgeBaseIndex: string;
  logger: Logger;
  spaceId: string;
  user: AuthenticatedUser;
  knowledgeBaseEntry: KnowledgeBaseEntryCreateProps;
  global?: boolean;
  telemetry: AnalyticsServiceSetup;
}

export const createKnowledgeBaseEntry = async ({
  auditLogger,
  esClient,
  knowledgeBaseIndex,
  spaceId,
  user,
  knowledgeBaseEntry,
  logger,
  telemetry,
}: CreateKnowledgeBaseEntryParams): Promise<KnowledgeBaseEntryResponse | null> => {
  const createdAt = new Date().toISOString();
  const document = transformToCreateSchema({
    createdAt,
    spaceId,
    user,
    entry: knowledgeBaseEntry as unknown as KnowledgeBaseEntryCreateProps,
  });
  const telemetryPayload = {
    entryType: document.type,
    required: document.required ?? false,
    sharing: document.users.length ? 'private' : 'global',
    ...(document.type === 'document' ? { source: document.source } : {}),
  };
  try {
    const response = await esClient.create({
      document,
      id: uuidv4(),
      index: knowledgeBaseIndex,
      refresh: 'wait_for',
    });

    const newKnowledgeBaseEntry = await getKnowledgeBaseEntry({
      esClient,
      knowledgeBaseIndex,
      id: response._id,
      logger,
      user,
    });
    auditLogger?.log(
      knowledgeBaseAuditEvent({
        action: KnowledgeBaseAuditAction.CREATE,
        id: newKnowledgeBaseEntry?.id,
        name: newKnowledgeBaseEntry?.name,
        outcome: AUDIT_OUTCOME.SUCCESS,
      })
    );
    telemetry.reportEvent(CREATE_KNOWLEDGE_BASE_ENTRY_SUCCESS_EVENT.eventType, telemetryPayload);
    return newKnowledgeBaseEntry;
  } catch (err) {
    logger.error(
      `Error creating Knowledge Base Entry: ${err} with kbResource: ${knowledgeBaseEntry.name}`
    );
    auditLogger?.log(
      knowledgeBaseAuditEvent({
        action: KnowledgeBaseAuditAction.CREATE,
        outcome: AUDIT_OUTCOME.FAILURE,
        error: err,
      })
    );
    telemetry.reportEvent(CREATE_KNOWLEDGE_BASE_ENTRY_ERROR_EVENT.eventType, {
      ...telemetryPayload,
      errorMessage: err.message ?? 'Unknown error',
    });
    throw err;
  }
};

interface TransformToUpdateSchemaProps {
  user: AuthenticatedUser;
  updatedAt: string;
  entry: KnowledgeBaseEntryUpdateProps;
}

export const transformToUpdateSchema = ({
  user,
  updatedAt,
  entry,
}: TransformToUpdateSchemaProps): UpdateKnowledgeBaseEntrySchema => {
  const base = {
    id: entry.id,
    updated_at: updatedAt,
    updated_by: user.profile_uid ?? user.username ?? 'unknown',
    name: entry.name,
    type: entry.type,
    global: entry.global,
    users: entry.global
      ? []
      : [
          {
            id: user.profile_uid,
            name: user.username,
          },
        ],
  };

  if (entry.type === 'index') {
    const { inputSchema, outputFields, queryDescription, ...restEntry } = entry;
    return {
      ...base,
      ...restEntry,
      users: restEntry.users ?? base.users,
      query_description: queryDescription,
      input_schema:
        entry.inputSchema?.map((schema) => ({
          field_name: schema.fieldName,
          field_type: schema.fieldType,
          description: schema.description,
        })) ?? undefined,
      output_fields: outputFields ?? undefined,
    };
  }
  return {
    ...base,
    kb_resource: entry.kbResource,
    required: entry.required ?? false,
    source: entry.source,
    text: entry.text,
    vector: undefined,
  };
};

export const getUpdateScript = ({ entry }: { entry: UpdateKnowledgeBaseEntrySchema }) => {
  // Cannot use script for updating documents with semantic_text fields
  return {
    doc: {
      ...entry,
      semantic_text: entry.text,
    },
  };
};

interface TransformToCreateSchemaProps {
  createdAt: string;
  spaceId: string;
  user: AuthenticatedUser;
  entry: KnowledgeBaseEntryCreateProps;
}

export const transformToCreateSchema = ({
  createdAt,
  spaceId,
  user,
  entry,
}: TransformToCreateSchemaProps): CreateKnowledgeBaseEntrySchema => {
  const base = {
    '@timestamp': createdAt,
    created_at: createdAt,
    created_by: user.profile_uid ?? user.username ?? 'unknown',
    updated_at: createdAt,
    updated_by: user.profile_uid ?? user.username ?? 'unknown',
    name: entry.name,
    namespace: spaceId,
    type: entry.type,
    global: entry.global,
    users: entry.global
      ? []
      : [
          {
            id: user.profile_uid,
            name: user.username,
          },
        ],
  };

  if (entry.type === 'index') {
    const { inputSchema, outputFields, queryDescription, ...restEntry } = entry;
    return {
      ...base,
      ...restEntry,
      users: restEntry.users ?? base.users,
      query_description: queryDescription,
      input_schema:
        entry.inputSchema?.map((schema) => ({
          field_name: schema.fieldName,
          field_type: schema.fieldType,
          description: schema.description,
        })) ?? undefined,
      output_fields: outputFields ?? undefined,
    };
  }
  return {
    ...base,
    kb_resource: entry.kbResource,
    required: entry.required ?? false,
    source: entry.source,
    text: entry.text,
    semantic_text: entry.text,
  };
};
