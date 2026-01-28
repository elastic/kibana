/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IUiSettingsClient } from '@kbn/core/server';
import type { Filter } from '@kbn/es-query';
import { isEmpty } from 'lodash';

import { INCLUDED_DATA_STREAM_NAMESPACES_FOR_RULE_EXECUTION } from '../../../../../common/constants';

/**
 * reads Kibana advanced settings for filtering data stream namespaces during rule executions
 * returns {@link Filter} array that includes only the specified namespaces
 * @throws {Error} If the advanced setting filter is incorrectly formatted
 */
export const getDataStreamNamespaceFilter = async ({
  uiSettingsClient,
}: {
  uiSettingsClient: IUiSettingsClient;
}): Promise<Filter[]> => {
  const filterConfig = await uiSettingsClient.get<string | Filter>(
    INCLUDED_DATA_STREAM_NAMESPACES_FOR_RULE_EXECUTION
  );

  if (!filterConfig) {
    return [];
  }

  try {
    const parsed = typeof filterConfig === 'string' ? JSON.parse(filterConfig) : filterConfig;

    // Check if the parsed config has the expected structure and non-empty terms array
    const termsArray = parsed?.query?.bool?.filter?.terms?.['data_stream.namespace'];
    if (isEmpty(termsArray)) {
      return [];
    } else if (!Array.isArray(termsArray)) {
      throw Error(`values need to be in array format, received ${termsArray}`);
    }

    // Return the parsed filter as a Filter array
    return [parsed as Filter];
  } catch (error) {
    // If JSON parsing fails, throw an error that will be caught by rule executors
    throw new Error(
      `The advanced setting "Include data stream namespaces in rule execution" is incorrectly formatted. ` +
        `Expected JSON format: { "query": { "bool": { "filter": { "terms": { "data_stream.namespace": ["namespace1", "namespace2"] } } } } }. ` +
        `Error: ${error instanceof Error ? error.message : String(error)}`
    );
  }
};
