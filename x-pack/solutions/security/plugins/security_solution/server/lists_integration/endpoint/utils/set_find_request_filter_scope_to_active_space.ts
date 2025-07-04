/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  FindExceptionListItemOptions,
  FindExceptionListsItemOptions,
} from '@kbn/lists-plugin/server/services/exception_lists/exception_list_client_types';
import type { KibanaRequest } from '@kbn/core-http-server';
import { buildSpaceDataFilter } from './build_space_data_filter';
import { stringify } from '../../../endpoint/utils/stringify';
import type { EndpointAppContextService } from '../../../endpoint/endpoint_app_context_services';

/**
 * Mutates the Find options provided on input to include a filter that will scope the search
 * down to only data that should be visible in active space
 * @param endpointServices
 * @param httpRequest
 * @param findOptions
 */
export const setFindRequestFilterScopeToActiveSpace = async (
  endpointServices: EndpointAppContextService,
  httpRequest: KibanaRequest,
  findOptions: FindExceptionListItemOptions | FindExceptionListsItemOptions
): Promise<void> => {
  if (endpointServices.experimentalFeatures.endpointManagementSpaceAwarenessEnabled) {
    const logger = endpointServices.createLogger('setFindRequestFilterScopeToActiveSpace');

    logger.debug(() => `Find options prior to adjusting filter:\n${stringify(findOptions)}`);

    const spaceVisibleDataFilter = (await buildSpaceDataFilter(endpointServices, httpRequest))
      .filter;

    if (isSingleListFindOptions(findOptions)) {
      findOptions.filter = `${spaceVisibleDataFilter}${
        findOptions.filter ? ` AND (${findOptions.filter})` : ''
      }`;
    } else {
      if (!findOptions.filter) {
        findOptions.filter = [];
      }

      // Add the filter for every list that was defined in the options
      findOptions.listId.forEach((listId, index) => {
        const userFilter = findOptions.filter[index];
        findOptions.filter[index] = `${spaceVisibleDataFilter}${
          userFilter ? ` AND (${userFilter})` : ''
        }`;
      });
    }

    logger.debug(() => `Find options updated with active space filter:\n${stringify(findOptions)}`);
  }
};

const isSingleListFindOptions = (
  findOptions: FindExceptionListItemOptions | FindExceptionListsItemOptions
): findOptions is FindExceptionListItemOptions => {
  return !Array.isArray(findOptions.listId);
};
