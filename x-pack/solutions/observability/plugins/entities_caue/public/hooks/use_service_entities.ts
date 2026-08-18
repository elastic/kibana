/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getESQLResults } from '@kbn/esql-utils';
import { useQuery } from '@kbn/react-query';
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import { SERVICE_ENTITIES_QUERY } from '../../common/constants';

export const useServiceEntities = (data: DataPublicPluginStart, enabled: boolean) =>
  useQuery({
    queryKey: ['entitiesCaue', 'serviceEntities'],
    queryFn: async ({ signal }) => {
      const { response } = await getESQLResults({
        esqlQuery: SERVICE_ENTITIES_QUERY,
        search: data.search.search,
        signal,
      });
      return response;
    },
    enabled,
    refetchOnWindowFocus: false,
  });
