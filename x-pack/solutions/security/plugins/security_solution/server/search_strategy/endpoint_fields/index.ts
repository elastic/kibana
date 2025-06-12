/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { from } from 'rxjs';
import type {
  DataViewsServerPluginStart,
  ISearchStrategy,
  SearchStrategyDependencies,
} from '@kbn/data-plugin/server';

import { requestIndexFieldSearch } from '@kbn/timelines-plugin/server/search_strategy/index_fields';

import { eventsIndexPattern, METADATA_UNITED_INDEX } from '../../../common/endpoint/constants';
import type {
  BeatFields,
  IndexFieldsStrategyRequest,
  IndexFieldsStrategyResponse,
} from '../../../common/search_strategy';
import type { EndpointAppContextService } from '../../endpoint/endpoint_app_context_services';
import { EndpointAuthorizationError } from '../../endpoint/errors';
import { parseRequest } from './parse_request';

/**
 * EndpointFieldProvider mimics indexField provider from timeline plugin: x-pack/platform/plugins/shared/timelines/server/search_strategy/index_fields/index.ts
 * but it uses ES internalUser instead to avoid adding extra index privileges for users with event filters permissions.
 * It is used to retrieve index patterns for event filters form.
 */
export const endpointFieldsProvider = (
  context: EndpointAppContextService,
  indexPatterns: DataViewsServerPluginStart
): ISearchStrategy<IndexFieldsStrategyRequest<'indices'>, IndexFieldsStrategyResponse> => {
  // require the fields once we actually need them, rather than ahead of time, and pass
  // them to createFieldItem to reduce the amount of work done as much as possible
  const beatFields: BeatFields =
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    require('@kbn/timelines-plugin/server/utils/beat_schema/fields.json').fieldsBeat;

  return {
    search: (request, _, deps) =>
      from(requestEndpointFieldsSearch(context, request, deps, beatFields, indexPatterns)),
  };
};

export const requestEndpointFieldsSearch = async (
  context: EndpointAppContextService,
  request: IndexFieldsStrategyRequest<'indices'>,
  deps: SearchStrategyDependencies,
  beatFields: BeatFields,
  indexPatterns: DataViewsServerPluginStart
): Promise<IndexFieldsStrategyResponse> => {
  const parsedRequest = parseRequest(request);

  if (
    parsedRequest.indices.length > 1 ||
    (parsedRequest.indices[0] !== eventsIndexPattern &&
      parsedRequest.indices[0] !== METADATA_UNITED_INDEX)
  ) {
    throw new Error(`Invalid indices request ${request.indices.join(', ')}`);
  }

  const { canWriteEventFilters, canReadEndpointList } = await context.getEndpointAuthz(
    deps.request
  );

  if (
    (!canWriteEventFilters && parsedRequest.indices[0] === eventsIndexPattern) ||
    (!canReadEndpointList && parsedRequest.indices[0] === METADATA_UNITED_INDEX)
  ) {
    throw new EndpointAuthorizationError();
  }

  return requestIndexFieldSearch(parsedRequest, deps, beatFields, indexPatterns, true);
};
