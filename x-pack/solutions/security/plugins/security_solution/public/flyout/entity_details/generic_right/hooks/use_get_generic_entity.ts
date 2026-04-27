/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@kbn/react-query';
import type { IKibanaSearchRequest, IKibanaSearchResponse } from '@kbn/search-types';
import type { estypes } from '@elastic/elasticsearch';
import { lastValueFrom } from 'rxjs';
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import { FF_ENABLE_ENTITY_STORE_V2 } from '@kbn/entity-store/public';
import { getLatestEntityIndexPattern } from '@kbn/entity-store/common';
import { useUiSetting } from '@kbn/kibana-react-plugin/public';
import { ASSET_INVENTORY_INDEX_PATTERN } from '../../../../asset_inventory/constants';
import type { GenericEntityRecord } from '../../../../asset_inventory/types/generic_entity_record';
import { useKibana } from '../../../../common/lib/kibana';
import { useSpaceId } from '../../../../common/hooks/use_space_id';

type GenericEntityRequest = IKibanaSearchRequest<estypes.SearchRequest>;
type GenericEntityResponse = IKibanaSearchResponse<estypes.SearchResponse<GenericEntityRecord>>;

// explicitly force to pass either parameter or both
export type UseGetGenericEntityParams =
  | { entityDocId: string; entityId?: never }
  | { entityDocId?: never; entityId: string }
  | { entityDocId: string; entityId: string };

export const fetchGenericEntity = async (
  dataService: DataPublicPluginStart,
  { entityDocId, entityId }: UseGetGenericEntityParams,
  index: string
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
        index,
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
  const entityStoreV2Enabled = useUiSetting<boolean>(FF_ENABLE_ENTITY_STORE_V2, false);
  const spaceId = useSpaceId();

  const { entityDocId, entityId } = params;

  // Entity Store V2 stores all entity types (including generic) in a unified per-space index.
  // Entity Store V1 uses the `entities-generic-latest` alias for generic entities.
  // When V2 is enabled, the query is disabled until the space ID resolves (async).
  const index = entityStoreV2Enabled
    ? spaceId
      ? getLatestEntityIndexPattern(spaceId)
      : undefined
    : ASSET_INVENTORY_INDEX_PATTERN;

  const getGenericEntity = useQuery({
    queryKey: ['use-get-generic-entity-key', entityDocId, entityId, index],
    queryFn: () => {
      if (!index) throw new Error('Cannot determine entity index: space ID is not yet available');
      return fetchGenericEntity(dataService, params, index);
    },
    enabled: !!index,
    select: (response) => response.rawResponse.hits.hits[0], // extracting result out of ES
  });

  return {
    getGenericEntity,
  };
};
