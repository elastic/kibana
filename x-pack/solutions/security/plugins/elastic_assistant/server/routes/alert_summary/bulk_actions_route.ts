/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';
import type { IKibanaResponse, KibanaResponseFactory, Logger } from '@kbn/core/server';

import { transformError } from '@kbn/securitysolution-es-utils';
import {
  API_VERSIONS,
  ELASTIC_AI_ASSISTANT_ALERT_SUMMARY_URL_BULK_ACTION,
} from '@kbn/elastic-assistant-common';

import {
  AlertSummaryResponse,
  AlertSummaryBulkActionSkipResult,
  AlertSummaryBulkCrudActionResponse,
  AlertSummaryBulkCrudActionResults,
  BulkCrudActionSummary,
  PerformAlertSummaryBulkActionRequestBody,
  PerformAlertSummaryBulkActionResponse,
} from '@kbn/elastic-assistant-common/impl/schemas/alert_summary/bulk_crud_alert_summary_route.gen';
import { buildRouteValidationWithZod } from '@kbn/elastic-assistant-common/impl/schemas/common';
import { PROMPTS_TABLE_MAX_PAGE_SIZE } from '../../../common/constants';
import { ElasticAssistantPluginRouter } from '../../types';
import { buildResponse } from '../utils';
import {
  getUpdateScript,
  transformToCreateScheme,
  transformToUpdateScheme,
  transformESToAlertSummary,
  transformESSearchToAlertSummary,
} from '../../ai_assistant_data_clients/alert_summary/helpers';
import {
  EsAlertSummarySchema,
  UpdateAlertSummarySchema,
} from '../../ai_assistant_data_clients/alert_summary/types';
import { performChecks } from '../helpers';

export interface BulkOperationError {
  message: string;
  status?: number;
  document: {
    id: string;
  };
}

const buildBulkResponse = (
  response: KibanaResponseFactory,
  {
    errors = [],
    updated = [],
    created = [],
    deleted = [],
    skipped = [],
  }: {
    errors?: BulkOperationError[];
    updated?: AlertSummaryResponse[];
    created?: AlertSummaryResponse[];
    deleted?: string[];
    skipped?: AlertSummaryBulkActionSkipResult[];
  }
): IKibanaResponse<AlertSummaryBulkCrudActionResponse> => {
  const numSucceeded = updated.length + created.length + deleted.length;
  const numSkipped = skipped.length;
  const numFailed = errors.length;

  const summary: BulkCrudActionSummary = {
    failed: numFailed,
    succeeded: numSucceeded,
    skipped: numSkipped,
    total: numSucceeded + numFailed + numSkipped,
  };

  const results: AlertSummaryBulkCrudActionResults = {
    updated,
    created,
    deleted,
    skipped,
  };

  if (numFailed > 0) {
    return response.custom<AlertSummaryBulkCrudActionResponse>({
      headers: { 'content-type': 'application/json' },
      body: {
        message: summary.succeeded > 0 ? 'Bulk edit partially failed' : 'Bulk edit failed',
        attributes: {
          errors: errors.map((e: BulkOperationError) => ({
            status_code: e.status ?? 500,
            alert_summaries: [{ id: e.document.id }],
            message: e.message,
          })),
          results,
          summary,
        },
      },
      statusCode: 500,
    });
  }

  const responseBody: AlertSummaryBulkCrudActionResponse = {
    success: true,
    alert_summaries_count: summary.total,
    attributes: { results, summary },
  };

  return response.ok({ body: responseBody });
};

export const bulkAlertSummaryRoute = (router: ElasticAssistantPluginRouter, logger: Logger) => {
  router.versioned
    .post({
      access: 'internal',
      path: ELASTIC_AI_ASSISTANT_ALERT_SUMMARY_URL_BULK_ACTION,
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
        version: API_VERSIONS.internal.v1,
        validate: {
          request: {
            body: buildRouteValidationWithZod(PerformAlertSummaryBulkActionRequestBody),
          },
        },
      },
      async (
        context,
        request,
        response
      ): Promise<IKibanaResponse<PerformAlertSummaryBulkActionResponse>> => {
        const { body } = request;
        const assistantResponse = buildResponse(response);

        const operationsCount =
          (body?.update ? body.update?.length : 0) +
          (body?.create ? body.create?.length : 0) +
          (body?.delete ? body.delete?.ids?.length ?? 0 : 0);
        if (operationsCount > PROMPTS_TABLE_MAX_PAGE_SIZE) {
          return assistantResponse.error({
            body: `More than ${PROMPTS_TABLE_MAX_PAGE_SIZE} ids sent for bulk edit action.`,
            statusCode: 400,
          });
        }

        const abortController = new AbortController();

        // subscribing to completed$, because it handles both cases when request was completed and aborted.
        // when route is finished by timeout, aborted$ is not getting fired
        request.events.completed$.subscribe(() => abortController.abort());
        try {
          const ctx = await context.resolve(['core', 'elasticAssistant', 'licensing']);
          // Perform license and authenticated user checks
          const checkResponse = await performChecks({
            context: ctx,
            request,
            response,
          });
          if (!checkResponse.isSuccess) {
            return checkResponse.response;
          }
          const authenticatedUser = checkResponse.currentUser;

          const dataClient = await ctx.elasticAssistant.getAlertSummaryDataClient();

          if (body.create && body.create.length > 0) {
            const result = await dataClient?.findDocuments<EsAlertSummarySchema>({
              perPage: 100,
              page: 1,
              filter: `(${body.create.map((c) => `alertId:${c.alertId}`).join(' OR ')})`,
              fields: ['name'],
            });
            if (result?.data != null && result.total > 0) {
              return assistantResponse.error({
                statusCode: 409,
                body: `Alert summary for: "${result.data.hits.hits
                  .map((c) => c._source?.alert_id ?? c._id)
                  .join(',')}" already exists`,
              });
            }
          }

          const writer = await dataClient?.getWriter();
          const changedAt = new Date().toISOString();
          const {
            errors,
            docs_created: docsCreated,
            docs_updated: docsUpdated,
            docs_deleted: docsDeleted,
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
          } = await writer!.bulk({
            documentsToCreate: body.create?.map((f) =>
              transformToCreateScheme(authenticatedUser, changedAt, f)
            ),
            documentsToDelete: body.delete?.ids,
            documentsToUpdate: body.update?.map((f) =>
              transformToUpdateScheme(authenticatedUser, changedAt, f)
            ),
            getUpdateScript: (document: UpdateAlertSummarySchema) =>
              getUpdateScript({ alertSummary: document, isPatch: true }),
            // any user can update any alert summary
            authenticatedUser: undefined,
          });
          const created =
            docsCreated.length > 0
              ? await dataClient?.findDocuments<EsAlertSummarySchema>({
                  page: 1,
                  perPage: 100,
                  filter: docsCreated.map((c) => `_id:${c}`).join(' OR '),
                })
              : undefined;

          return buildBulkResponse(response, {
            updated: docsUpdated
              ? transformESToAlertSummary(docsUpdated as EsAlertSummarySchema[])
              : [],
            created: created ? transformESSearchToAlertSummary(created.data) : [],
            deleted: docsDeleted ?? [],
            errors,
          });
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
