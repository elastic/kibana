/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import type { KibanaExecutionContext } from '@kbn/core-execution-context-common';
import type { ESQLSearchResponse } from '@kbn/es-types';
import { getESQLResults } from '@kbn/esql-utils';
import { PROJECT_ROUTING } from '@kbn/cps-utils';
import {
  buildExecutionContext,
  EA_EXECUTION_CONTEXT_NAMES,
} from '../../../../common/utils/execution_context';

export type EsqlContext = string | { id: string; meta?: KibanaExecutionContext['meta'] };

export const runEsqlQuery = async (
  searchService: DataPublicPluginStart['search'],
  query: string,
  context: EsqlContext,
  signal?: AbortSignal
): Promise<ESQLSearchResponse> => {
  const { id, meta } = typeof context === 'string' ? { id: context, meta: undefined } : context;
  const { response } = await getESQLResults({
    esqlQuery: query,
    search: searchService.search,
    signal,
    projectRouting: PROJECT_ROUTING.ORIGIN,
    executionContext: {
      ...buildExecutionContext(EA_EXECUTION_CONTEXT_NAMES.HOME_PAGE, id),
      id,
      ...(meta ? { meta } : {}),
    },
  });
  return response;
};
