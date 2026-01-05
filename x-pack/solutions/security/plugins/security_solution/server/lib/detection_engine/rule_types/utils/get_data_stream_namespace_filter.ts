/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IUiSettingsClient } from '@kbn/core/server';
import type { Filter } from '@kbn/es-query';

import { INCLUDED_DATA_STREAM_NAMESPACES_FOR_RULE_EXECUTION } from '../../../../../common/constants';

/**
 * reads Kibana advanced settings for filtering data stream namespaces during rule executions
 * returns {@link Filter} array that includes only the specified namespaces
 */
export const getDataStreamNamespaceFilter = async ({
  uiSettingsClient,
}: {
  uiSettingsClient: IUiSettingsClient;
}): Promise<Filter[]> => {
  const includedNamespaces = await uiSettingsClient.get<Array<string>>(
    INCLUDED_DATA_STREAM_NAMESPACES_FOR_RULE_EXECUTION
  );

  if (!includedNamespaces?.length) {
    return [];
  }

  return [
    {
      meta: { negate: false },
      query: {
        bool: {
          filter: {
            terms: {
              'data_stream.namespace': includedNamespaces,
            },
          },
        },
      },
    },
  ];
};
