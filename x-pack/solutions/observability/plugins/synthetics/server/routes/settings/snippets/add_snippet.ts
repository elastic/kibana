/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { IKibanaResponse } from '@kbn/core-http-server';
import type { TypeOf } from '@kbn/config-schema';
import { schema } from '@kbn/config-schema';
import type { SyntheticsRestApiRouteFactory } from '../../types';
import { SYNTHETICS_API_URLS } from '../../../../common/constants';
import { buildSnippetsService } from './helpers';
import type { SyntheticsServiceSnippetWithIdType } from '../../../../common/runtime_types/synthetics_service_snippet';

export interface PostSnippetResponse {
  snippet: SyntheticsServiceSnippetWithIdType;
}

export const PostSnipppetSchema = schema.object({
  snippet: schema.object({
    name: schema.string(),
    label: schema.string(),
    detail: schema.string(),
    insertText: schema.string(),
  }),
});

export const postSyntheticsSnippetsRoute: SyntheticsRestApiRouteFactory<
  any,
  any,
  any,
  TypeOf<typeof PostSnipppetSchema>
> = () => ({
  method: 'POST',
  path: SYNTHETICS_API_URLS.SYNTHETICS_PROJECT_SNIPPETS,
  validate: {
    body: PostSnipppetSchema,
  },
  handler: async ({
    request,
    response,
    context,
    server,
  }): Promise<PostSnippetResponse | IKibanaResponse> => {
    try {
      const { snippet } = request.body;
      const snippetsService = await buildSnippetsService({ context, server });
      const result = await snippetsService.addSnippet(snippet);

      return response.created({
        body: result,
      });
    } catch (error) {
      console.error('Error in POST /synthetics/snippets', error);
      return response.customError({
        body: { message: 'Failed to create synthetics snippet' },
        statusCode: 500,
      });
    }
  },
});
