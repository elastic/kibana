/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@tanstack/react-query';
import type { IKibanaSearchRequest, IKibanaSearchResponse } from '@kbn/search-types';
import type { estypes } from '@elastic/elasticsearch';
import { lastValueFrom } from 'rxjs';
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import { ASSET_INVENTORY_INDEX_PATTERN } from '../../../../asset_inventory/constants';
import type { GenericEntityRecord } from '../../../../asset_inventory/types/generic_entity_record';
import { useKibana } from '../../../../common/lib/kibana';

type GenericEntityRequest = IKibanaSearchRequest<estypes.SearchRequest>;
type GenericEntityResponse = IKibanaSearchResponse<estypes.SearchResponse<GenericEntityRecord>>;

const fetchGenericEntity = async (dataService: DataPublicPluginStart, docId: string) => {
  const response = await lastValueFrom(
    dataService.search.search<GenericEntityRequest, GenericEntityResponse>({
      params: {
        index: ASSET_INVENTORY_INDEX_PATTERN,
        query: {
          term: { _id: docId },
        },
      },
    })
  );

  return response; // Ensure proper handling of response
};

export const useGetGenericEntity = (docId: string) => {
  const { data } = useKibana().services;

  return useQuery({
    queryKey: ['use-get-generic-entity-key', docId],
    queryFn: () => fetchGenericEntity(data, docId),
  });
};
