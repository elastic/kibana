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

// explicitly force to pass either parameter or both
export type UseGetGenericEntityParams =
  | { entityDocId: string; entityId?: never }
  | { entityDocId?: never; entityId: string }
  | { entityDocId: string; entityId: string };

export const fetchGenericEntity = async (
  dataService: DataPublicPluginStart,
  { entityDocId, entityId }: UseGetGenericEntityParams
): Promise<GenericEntityResponse> => {
  const shouldClauses = [];

  if (entityDocId) {
    shouldClauses.push({ term: { _id: entityDocId } });
  }

  if (entityId) {
    shouldClauses.push({ term: { 'entity.id': entityId } });
  }

  return lastValueFrom(
    dataService.search.search<GenericEntityRequest, GenericEntityResponse>({
      params: {
        index: ASSET_INVENTORY_INDEX_PATTERN,
        query: {
          bool: {
            should: shouldClauses,
            minimum_should_match: 1,
          },
        },
        fields: ['*'],
      },
    })
  );
};

export const useGetGenericEntity = (params: UseGetGenericEntityParams) => {
  const { data: dataService } = useKibana().services;

  const { entityDocId, entityId } = params;

  const getGenericEntity = useQuery({
    queryKey: ['use-get-generic-entity-key', entityDocId, entityId],
    queryFn: () => fetchGenericEntity(dataService, params),
    select: (response) => response.rawResponse.hits.hits[0], // extracting result out of ES
  });

  return {
    getGenericEntity,
  };
};
