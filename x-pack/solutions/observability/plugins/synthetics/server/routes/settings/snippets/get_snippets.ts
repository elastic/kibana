/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { IKibanaResponse } from '@kbn/core-http-server';
import type { SyntheticsServiceSnippetWithIdType } from '../../../../common/runtime_types/synthetics_service_snippet';
import type { SyntheticsRestApiRouteFactory } from '../../types';
import { SYNTHETICS_API_URLS } from '../../../../common/constants';
import { buildSnippetsService } from './helpers';

export interface GetSnippetsResponse {
  snippets: SyntheticsServiceSnippetWithIdType[];
}

export const getSyntheticsSnippetsRoute: SyntheticsRestApiRouteFactory = () => ({
  method: 'GET',
  path: SYNTHETICS_API_URLS.SYNTHETICS_PROJECT_SNIPPETS,
  validate: {},
  handler: async ({ context, server }): Promise<GetSnippetsResponse | IKibanaResponse> => {
    const snippetsService = await buildSnippetsService({ context, server });
    const snippets = await snippetsService.getSnippets();

    return { snippets: snippets ?? [] };
  },
});
