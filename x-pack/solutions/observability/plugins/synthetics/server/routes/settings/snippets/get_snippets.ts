/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { IKibanaResponse } from '@kbn/core-http-server';
import type { SyntheticsServiceSnippet } from '../../../../common/runtime_types/synthetics_service_snippet';
import type { SyntheticsRestApiRouteFactory } from '../../types';
import {
  SyntheticsSnippetsService,
  syntheticsSnippetType,
} from '../../../saved_objects/synthetics_snippet';
import { SYNTHETICS_API_URLS } from '../../../../common/constants';

export interface ProjectSnippetsResponse {
  snippets: SyntheticsServiceSnippet[];
}

export const getSyntheticsSnippetsRoute: SyntheticsRestApiRouteFactory = () => ({
  method: 'GET',
  path: SYNTHETICS_API_URLS.SYNTHETICS_PROJECT_SNIPPETS,
  validate: {},
  handler: async ({ context }): Promise<ProjectSnippetsResponse | IKibanaResponse> => {
    const soClient = (await context.core).savedObjects.getClient({
      includedHiddenTypes: [syntheticsSnippetType.name],
    });
    const snippetsService = new SyntheticsSnippetsService(soClient);
    const snippets = await snippetsService.getSnippets();

    return { snippets: snippets ?? [] };
  },
});
