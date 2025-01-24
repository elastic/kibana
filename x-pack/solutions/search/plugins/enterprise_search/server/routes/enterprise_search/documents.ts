/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';

import { ErrorCode } from '../../../common/types/error_codes';
import { getDocument } from '../../lib/indices/document/get_document';
import type { RouteDependencies } from '../../types';
import { elasticsearchErrorHandler } from '../../utils/elasticsearch_error_handler';
import { isNotFoundException } from '../../utils/identify_exceptions';

export function registerDocumentRoute({ router, log }: RouteDependencies) {
  router.get(
    {
      path: '/internal/enterprise_search/indices/{index_name}/document/{document_id}',
      validate: {
        params: schema.object({
          document_id: schema.string(),
          index_name: schema.string(),
        }),
      },
    },
    elasticsearchErrorHandler(log, async (context, request, response) => {
      const indexName = decodeURIComponent(request.params.index_name);
      const documentId = decodeURIComponent(request.params.document_id);
      const { client } = (await context.core).elasticsearch;

      try {
        const documentResponse = await getDocument(client, indexName, documentId);
        return response.ok({
          body: documentResponse,
          headers: { 'content-type': 'application/json' },
        });
      } catch (error) {
        if (isNotFoundException(error)) {
          return response.customError({
            body: {
              attributes: {
                error_code: ErrorCode.DOCUMENT_NOT_FOUND,
              },
              message: `Could not find document ${documentId}`,
            },
            statusCode: 404,
          });
        } else {
          // otherwise, default handler
          throw error;
        }
      }
    })
  );
}
