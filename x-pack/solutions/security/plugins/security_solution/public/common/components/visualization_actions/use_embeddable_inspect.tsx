/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { LensEmbeddableInput } from '@kbn/lens-plugin/public';
import { useCallback } from 'react';
import type { EmbeddableData, OnEmbeddableLoaded, Request } from './types';

import { getRequestsAndResponses } from './utils';
import { getTotalCountFromTables } from './get_total_count_from_tables';

export const useEmbeddableInspect = (onEmbeddableLoad?: OnEmbeddableLoaded) => {
  const setInspectData = useCallback<NonNullable<LensEmbeddableInput['onLoad']>>(
    (isLoading, adapters) => {
      if (!onEmbeddableLoad) {
        return;
      }

      // adapters is undefined when the embeddable is not loaded yet
      // so both loading and !adapters are interdependent
      if (isLoading || !adapters) {
        onEmbeddableLoad?.({
          requests: [],
          responses: [],
          isLoading: true,
        });
        return;
      }

      const data = getRequestsAndResponses(adapters.requests?.getRequests() as Request[]);

      const embeddableData: EmbeddableData = {
        requests: data.requests,
        responses: data.responses,
        isLoading: false,
      };

      // during error response, tables.tables == {}
      // so we only add tables if they exist to normalize no data scenario
      //
      // additionally, we introduce a total count to the meta object
      // in the same structure as it's present in each individual table data
      if (adapters.tables && Object.keys(adapters.tables.tables).length > 0) {
        const { tables } = adapters.tables;
        embeddableData.tables = {
          tables,
          meta: {
            statistics: {
              totalCount: getTotalCountFromTables(tables),
            },
          },
        };
      }

      onEmbeddableLoad(embeddableData);
    },
    [onEmbeddableLoad]
  );

  return { setInspectData };
};
