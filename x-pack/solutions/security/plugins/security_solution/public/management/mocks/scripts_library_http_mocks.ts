/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpFetchOptionsWithPath } from '@kbn/core/public';
import { EndpointScriptsGenerator } from '../../../common/endpoint/data_generators/endpoint_scripts_generator';
import {
  SCRIPTS_LIBRARY_ROUTE,
  SCRIPTS_LIBRARY_ROUTE_ITEM,
} from '../../../common/endpoint/constants';
import type {
  EndpointScriptListApiResponse,
  EndpointScriptApiResponse,
} from '../../../common/endpoint/types';
import {
  httpHandlerMockFactory,
  type ResponseProvidersInterface,
} from '../../common/mock/endpoint/http_handler_mock_factory';

export type ScriptsLibraryHttpMocksInterface = ResponseProvidersInterface<{
  getScriptsList: () => EndpointScriptListApiResponse;
  getScriptById: (options: HttpFetchOptionsWithPath) => EndpointScriptApiResponse;
  deleteScriptById: (options: HttpFetchOptionsWithPath) => void;
}>;

export const scriptsLibraryHttpMocks = httpHandlerMockFactory<ScriptsLibraryHttpMocksInterface>([
  {
    id: 'getScriptsList',
    method: 'get',
    path: SCRIPTS_LIBRARY_ROUTE,
    handler: (): EndpointScriptListApiResponse => {
      // default to 13 items
      const items = Array.from({ length: 13 }).fill({}) as EndpointScriptListApiResponse['data'];
      const response = new EndpointScriptsGenerator('seed').generateListOfScripts(items);
      return {
        data: response,
        page: 1,
        pageSize: 10,
        sortField: 'name',
        sortDirection: 'asc',
        total: items.length,
      };
    },
  },
  {
    id: 'getScriptById',
    method: 'get',
    path: SCRIPTS_LIBRARY_ROUTE_ITEM,
    handler: ({ path }): EndpointScriptApiResponse => {
      const response = new EndpointScriptsGenerator('seed').generate();
      response.id = path.substring(path.lastIndexOf('/') + 1) || response.id;
      return { data: response };
    },
  },
  {
    id: 'deleteScriptById',
    method: 'delete',
    path: SCRIPTS_LIBRARY_ROUTE_ITEM,
    handler: () => {},
  },
]);
