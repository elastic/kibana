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
 * Reads Kibana advanced settings for filtering data stream namespaces during rule executions.
 * The setting is an array of namespace strings; returns a Filter that includes only those namespaces.
 */
export const getDataStreamNamespaceFilter = async ({
  uiSettingsClient,
}: {
  uiSettingsClient: IUiSettingsClient;
}): Promise<Filter[]> => {
  const namespaces = await uiSettingsClient.get<string[]>(
    INCLUDED_DATA_STREAM_NAMESPACES_FOR_RULE_EXECUTION
  );

  if (!namespaces || !Array.isArray(namespaces) || isEmpty(namespaces)) {
    return [];
  }

  const filter: Filter = {
    meta: { negate: false },
    query: {
      bool: {
        filter: {
          terms: {
            'data_stream.namespace': namespaces,
          },
        },
      },
    },
  };

  return [filter];
};
