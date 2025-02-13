/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';
import {
  AnalyticsServiceSetup,
  AuditLogger,
  IKibanaResponse,
  KibanaResponseFactory,
} from '@kbn/core/server';

import { transformError } from '@kbn/securitysolution-es-utils';
import {
  ELASTIC_AI_ASSISTANT_KNOWLEDGE_BASE_ENTRIES_URL_BULK_ACTION,
  PerformKnowledgeBaseEntryBulkActionRequestBody,
  API_VERSIONS,
  KnowledgeBaseEntryBulkCrudActionResults,
  KnowledgeBaseEntryBulkCrudActionResponse,
  KnowledgeBaseEntryBulkCrudActionSummary,
  PerformKnowledgeBaseEntryBulkActionResponse,
} from '@kbn/elastic-assistant-common';
import { buildRouteValidationWithZod } from '@kbn/elastic-assistant-common/impl/schemas/common';

import {
  AUDIT_OUTCOME,
  KnowledgeBaseAuditAction,
  knowledgeBaseAuditEvent,
} from '../../../ai_assistant_data_clients/knowledge_base/audit_events';
import { CREATE_KNOWLEDGE_BASE_ENTRY_SUCCESS_EVENT } from '../../../lib/telemetry/event_based_telemetry';
import { performChecks } from '../../helpers';
import { KNOWLEDGE_BASE_ENTRIES_TABLE_MAX_PAGE_SIZE } from '../../../../common/constants';
import {
  EsKnowledgeBaseEntrySchema,
  UpdateKnowledgeBaseEntrySchema,
} from '../../../ai_assistant_data_clients/knowledge_base/types';
import { ElasticAssistantPluginRouter } from '../../../types';
import { buildResponse } from '../../utils';
import {
  transformESSearchToKnowledgeBaseEntry,
  transformESToKnowledgeBase,
} from '../../../ai_assistant_data_clients/knowledge_base/transforms';
import {
  getUpdateScript,
  transformToCreateSchema,
  transformToUpdateSchema,
} from '../../../ai_assistant_data_clients/knowledge_base/create_knowledge_base_entry';
import { validateDocumentsModification } from './utils';

export interface BulkOperationError {
  message: string;
  status?: number;
  document: {
    id: string;
    name?: string;
  };
}

export type BulkResponse = KnowledgeBaseEntryBulkCrudActionResults & {
  errors?: BulkOperationError[];
};

const buildBulkResponse = (
  response: KibanaResponseFactory,
  {
    errors = [],
    updated = [],
    created = [],
    deleted = [],
    skipped = [],
  }: KnowledgeBaseEntryBulkCrudActionResults & { errors: BulkOperationError[] },
  telemetry: AnalyticsServiceSetup,
  auditLogger?: AuditLogger
): IKibanaResponse<KnowledgeBaseEntryBulkCrudActionResponse> => {
  const numSucceeded = updated.length + created.length + deleted.length;
  const numSkipped = skipped.length;
  const numFailed = errors.length;

  const summary: KnowledgeBaseEntryBulkCrudActionSummary = {
    failed: numFailed,
    succeeded: numSucceeded,
    skipped: numSkipped,
    total: numSucceeded + numFailed + numSkipped,
  };

  const results: KnowledgeBaseEntryBulkCrudActionResults = {
    updated,
    created,
    deleted,
    skipped,
  };

  if (created.length) {
    created.forEach((entry) => {
      telemetry.reportEvent(CREATE_KNOWLEDGE_BASE_ENTRY_SUCCESS_EVENT.eventType, {
        entryType: entry.type,
        required: 'required' in entry ? entry.required ?? false : false,
        sharing: entry.users.length ? 'private' : 'global',
        ...(entry.type === 'document' ? { source: entry.source } : {}),
      });
      auditLogger?.log(
        knowledgeBaseAuditEvent({
          action: KnowledgeBaseAuditAction.CREATE,
          id: entry.id,
          name: entry.name,
          outcome: AUDIT_OUTCOME.SUCCESS,
        })
      );
    });
  }

  if (updated.length) {
    updated.forEach((entry) => {
      auditLogger?.log(
        knowledgeBaseAuditEvent({
          action: KnowledgeBaseAuditAction.UPDATE,
          id: entry.id,
          name: entry.name,
          outcome: AUDIT_OUTCOME.SUCCESS,
        })
      );
    });
  }

  if (deleted.length) {
    deleted.forEach((deletedId) => {
      auditLogger?.log(
        knowledgeBaseAuditEvent({
          action: KnowledgeBaseAuditAction.DELETE,
          id: deletedId,
          outcome: AUDIT_OUTCOME.SUCCESS,
        })
      );
    });
  }
  if (numFailed > 0) {
    return response.custom<KnowledgeBaseEntryBulkCrudActionResponse>({
      headers: { 'content-type': 'application/json' },
      body: {
        message: summary.succeeded > 0 ? 'Bulk edit partially failed' : 'Bulk edit failed',
        attributes: {
          errors: errors.map((e: BulkOperationError) => ({
            statusCode: e.status ?? 500,
            knowledgeBaseEntries: [{ id: e.document.id, name: '' }],
            message: e.message,
          })),
          results,
          summary,
        },
      },
      statusCode: 500,
    });
  }

  const responseBody: KnowledgeBaseEntryBulkCrudActionResponse = {
    success: true,
    knowledgeBaseEntriesCount: summary.total,
    attributes: { results, summary },
  };

  return response.ok({ body: responseBody });
};

export const bulkActionKnowledgeBaseEntriesRoute = (router: ElasticAssistantPluginRouter) => {
  router.versioned
    .post({
      access: 'public',
      path: ELASTIC_AI_ASSISTANT_KNOWLEDGE_BASE_ENTRIES_URL_BULK_ACTION,
      security: {
        authz: {
          requiredPrivileges: ['elasticAssistant'],
        },
      },
      options: {
        timeout: {
          idleSocket: moment.duration(15, 'minutes').asMilliseconds(),
        },
      },
    })
    .addVersion(
      {
        version: API_VERSIONS.public.v1,
        validate: {
          request: {
            body: buildRouteValidationWithZod(PerformKnowledgeBaseEntryBulkActionRequestBody),
          },
        },
      },
      async (
        context,
        request,
        response
      ): Promise<IKibanaResponse<PerformKnowledgeBaseEntryBulkActionResponse>> => {
        const assistantResponse = buildResponse(response);
        try {
          const ctx = await context.resolve(['core', 'elasticAssistant', 'licensing']);
          const logger = ctx.elasticAssistant.logger;

          // Perform license, authenticated user and FF checks
          const checkResponse = performChecks({
            context: ctx,
            request,
            response,
          });
          if (!checkResponse.isSuccess) {
            return checkResponse.response;
          }

          logger.debug(
            () =>
              `Performing bulk action on Knowledge Base Entries:\n${JSON.stringify(request.body)}`
          );

          const { body } = request;

          const operationsCount =
            (body?.update ? body.update?.length : 0) +
            (body?.create ? body.create?.length : 0) +
            (body?.delete ? body.delete?.ids?.length ?? 0 : 0);
          if (operationsCount > KNOWLEDGE_BASE_ENTRIES_TABLE_MAX_PAGE_SIZE) {
            return assistantResponse.error({
              body: `More than ${KNOWLEDGE_BASE_ENTRIES_TABLE_MAX_PAGE_SIZE} ids sent for bulk edit action.`,
              statusCode: 400,
            });
          }

          const abortController = new AbortController();

          // subscribing to completed$, because it handles both cases when request was completed and aborted.
          // when route is finished by timeout, aborted$ is not getting fired
          request.events.completed$.subscribe(() => abortController.abort());
          const kbDataClient = await ctx.elasticAssistant.getAIAssistantKnowledgeBaseDataClient();
          const spaceId = ctx.elasticAssistant.getSpaceId();
          const authenticatedUser = checkResponse.currentUser;
          const manageGlobalKnowledgeBaseAIAssistant =
            kbDataClient?.options.manageGlobalKnowledgeBaseAIAssistant;

          if (body.create && body.create.length > 0) {
            // RBAC validation
            body.create.forEach((entry) => {
              const isGlobal = entry.users != null && entry.users.length === 0;
              if (isGlobal && !manageGlobalKnowledgeBaseAIAssistant) {
                throw new Error(`User lacks privileges to create global knowledge base entries`);
              }
            });

            const result = await kbDataClient?.findDocuments<EsKnowledgeBaseEntrySchema>({
              perPage: 100,
              page: 1,
              filter: `users:{ id: "${authenticatedUser?.profile_uid}" }`,
              fields: [],
            });
            if (result?.data != null && result.total > 0) {
              return assistantResponse.error({
                statusCode: 409,
                body: `Knowledge Base Entry id's: "${transformESSearchToKnowledgeBaseEntry(
                  result.data
                )
                  .map((c) => c.id)
                  .join(',')}" already exists`,
              });
            }
          }

          await validateDocumentsModification(
            kbDataClient,
            authenticatedUser,
            body.delete?.ids ?? [],
            'delete'
          );
          await validateDocumentsModification(
            kbDataClient,
            authenticatedUser,
            body.update?.map((entry) => entry.id) ?? [],
            'update'
          );

          const writer = await kbDataClient?.getWriter();
          const changedAt = new Date().toISOString();
          const {
            errors,
            docs_created: docsCreated,
            docs_updated: docsUpdated,
            docs_deleted: docsDeleted,
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
          } = await writer!.bulk({
            documentsToCreate: body.create?.map((entry) =>
              transformToCreateSchema({
                createdAt: changedAt,
                spaceId,
                user: authenticatedUser,
                entry,
                global: entry.users != null && entry.users.length === 0,
              })
            ),
            documentsToDelete: body.delete?.ids,
            documentsToUpdate: body.update?.map((entry) =>
              transformToUpdateSchema({
                user: authenticatedUser,
                updatedAt: changedAt,
                entry,
                global: entry.users != null && entry.users.length === 0,
              })
            ),
            getUpdateScript: (entry: UpdateKnowledgeBaseEntrySchema) => getUpdateScript({ entry }),
            authenticatedUser,
          });
          const created =
            docsCreated.length > 0
              ? await kbDataClient?.findDocuments<EsKnowledgeBaseEntrySchema>({
                  page: 1,
                  perPage: 100,
                  filter: docsCreated.map((c) => `_id:${c}`).join(' OR '),
                })
              : undefined;

          return buildBulkResponse(
            response,
            {
              // @ts-ignore-next-line TS2322
              updated: transformESToKnowledgeBase(docsUpdated),
              created: created?.data ? transformESSearchToKnowledgeBaseEntry(created?.data) : [],
              deleted: docsDeleted ?? [],
              skipped: [],
              errors,
            },
            ctx.elasticAssistant.telemetry,
            ctx.elasticAssistant.auditLogger
          );
        } catch (err) {
          const error = transformError(err);
          return assistantResponse.error({
            body: error.message,
            statusCode: error.statusCode,
          });
        }
      }
    );
};
