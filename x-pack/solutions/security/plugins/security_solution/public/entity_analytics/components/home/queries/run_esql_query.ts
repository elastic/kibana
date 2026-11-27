/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import type { KibanaExecutionContext } from '@kbn/core-execution-context-common';
import type { ESQLSearchResponse } from '@kbn/es-types';
import { PROJECT_ROUTING } from '@kbn/cps-utils';
import {
  buildExecutionContext,
  EA_EXECUTION_CONTEXT_NAMES,
} from '../../../../common/utils/execution_context';

export type EsqlContext = string | { id: string; meta?: KibanaExecutionContext['meta'] };

export const runEsqlQuery = async (
  searchService: Pick<DataPublicPluginStart['search'], 'esql'>,
  query: string,
  context: EsqlContext,
  signal?: AbortSignal
): Promise<ESQLSearchResponse> => {
  const { id, meta } = typeof context === 'string' ? { id: context, meta: undefined } : context;
  const { rawResponse } = await searchService.esql(
    { query, projectRouting: PROJECT_ROUTING.ORIGIN },
    {
      abortSignal: signal,
      executionContext: {
        ...buildExecutionContext(EA_EXECUTION_CONTEXT_NAMES.HOME_PAGE, id),
        id,
        ...(meta ? { meta } : {}),
      },
    }
  );
  return rawResponse;
};
