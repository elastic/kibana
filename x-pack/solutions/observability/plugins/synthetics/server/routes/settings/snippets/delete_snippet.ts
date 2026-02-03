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

export const DeleteSnipppetParamsSchema = schema.object({
  snippetId: schema.string({ minLength: 1, maxLength: 1024 }),
});

export const deleteSyntheticsSnippetsRoute: SyntheticsRestApiRouteFactory<
  any,
  TypeOf<typeof DeleteSnipppetParamsSchema>,
  any,
  any
> = () => ({
  method: 'DELETE',
  path: SYNTHETICS_API_URLS.DELETE_SYNTHETICS_PROJECT_SNIPPET,
  validate: {
    params: DeleteSnipppetParamsSchema,
  },
  handler: async ({ context, server, request }): Promise<{} | IKibanaResponse> => {
    const snippetsService = await buildSnippetsService({ context, server });
    const { snippetId } = request.params;
    await snippetsService.deleteSnippet(snippetId);

    return {};
  },
});
