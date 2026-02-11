/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpStart } from '@kbn/core/public';
import { ENDPOINT_ARTIFACT_LISTS } from '@kbn/securitysolution-list-constants';
import type { EndpointSuggestionsBody } from '../../../../../common/api/endpoint';
import { ExceptionsListApiClient } from '../../../services/exceptions_list/exceptions_list_api_client';
import { resolvePathVariables } from '../../../../common/utils/resolve_path_variables';
import { ENDPOINT_EXCEPTIONS_LIST_DEFINITION } from '../constants';
import { SUGGESTIONS_INTERNAL_ROUTE } from '../../../../../common/endpoint/constants';

export class EndpointExceptionsApiClient extends ExceptionsListApiClient {
  constructor(http: HttpStart) {
    super(http, ENDPOINT_ARTIFACT_LISTS.endpointExceptions.id, ENDPOINT_EXCEPTIONS_LIST_DEFINITION);
  }

  public static getInstance(http: HttpStart): ExceptionsListApiClient {
    return super.getInstance(
      http,
      ENDPOINT_ARTIFACT_LISTS.endpointExceptions.id,
      ENDPOINT_EXCEPTIONS_LIST_DEFINITION
    );
  }

  public async getSuggestions(body: EndpointSuggestionsBody): Promise<string[]> {
    const result: string[] = await this.getHttp().post(
      resolvePathVariables(SUGGESTIONS_INTERNAL_ROUTE, { suggestion_type: 'endpointExceptions' }),
      {
        version: '1',
        body: JSON.stringify(body),
      }
    );

    return result;
  }
}
