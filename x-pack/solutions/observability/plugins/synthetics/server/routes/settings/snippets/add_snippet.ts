/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { IKibanaResponse } from '@kbn/core-http-server';
import type { TypeOf } from '@kbn/config-schema';
import { schema } from '@kbn/config-schema';
import type { SyntheticsServiceSnippet } from '../../../../common/runtime_types/synthetics_service_snippet';
import type { SyntheticsRestApiRouteFactory } from '../../types';
import {
  syntheticsSnippetType,
  SyntheticsSnippetsService,
} from '../../../saved_objects/synthetics_snippet';
import { SYNTHETICS_API_URLS } from '../../../../common/constants';

export interface ProjectSnippetsResponse {
  snippet: SyntheticsServiceSnippet;
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
  }): Promise<ProjectSnippetsResponse | IKibanaResponse> => {
    try {
      const { snippet } = request.body;
      const soClient = (await context.core).savedObjects.getClient({
        includedHiddenTypes: [syntheticsSnippetType.name],
      });
      const snippetsService = new SyntheticsSnippetsService(soClient);
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
