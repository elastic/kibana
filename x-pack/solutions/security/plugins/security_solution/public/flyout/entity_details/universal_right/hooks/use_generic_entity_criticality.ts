/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  CriticalityLevelWithUnassigned,
  IdField,
} from '../../../../../common/entity_analytics/asset_criticality/types';
import {
  type AssetCriticality,
  type DeleteAssetCriticalityResponse,
  useEntityAnalyticsRoutes,
} from '../../../../entity_analytics/api/api';
import type { AssetCriticalityRecord } from '../../../../../common/api/entity_analytics';

const QUERY_KEY = 'generic-entity-asset-criticality';

interface AssignCriticalityMutationParams {
  idField: AssetCriticality['idField'];
  idValue: AssetCriticality['idValue'];
  criticalityLevel: CriticalityLevelWithUnassigned;
}

export const useGenericEntityCriticality = ({
  idField,
  idValue,
  enabled,
}: {
  idField: IdField;
  idValue: string;
  enabled?: boolean;
}) => {
  const queryClient = useQueryClient();
  const { fetchAssetCriticality, createAssetCriticality, deleteAssetCriticality } =
    useEntityAnalyticsRoutes();

  const genericEntityAssetCriticalityQueryKey = [QUERY_KEY, idField, idValue];
  console.log(enabled);
  const getAssetCriticality = useQuery<AssetCriticalityRecord>({
    queryKey: genericEntityAssetCriticalityQueryKey,
    queryFn: () =>
      fetchAssetCriticality({
        idField,
        idValue,
      }),
    // retry: (failureCount, error) => error.body.statusCode === 404 && failureCount > 0,
    enabled,
  });

  const assignAssetCriticality = useMutation<
    AssetCriticalityRecord | DeleteAssetCriticalityResponse,
    unknown,
    AssignCriticalityMutationParams,
    unknown
  >({
    mutationFn: (params) => {
      if (params.criticalityLevel === 'unassigned') {
        return deleteAssetCriticality({
          idField: params.idField,
          idValue: params.idValue,
          refresh: 'wait_for',
        });
      }

      return createAssetCriticality({
        idField: params.idField,
        idValue: params.idValue,
        criticalityLevel: params.criticalityLevel,
        refresh: 'wait_for',
      });
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries(genericEntityAssetCriticalityQueryKey);
      console.log(data);
      // const queryData = 'deleted' in data ? null : data;
      // QC.setQueryData(QUERY_KEY, queryData);
      // onChange?.();
    },
  });

  // const was404 = query.isError && query.error.body.statusCode === 404;
  // const returnedData = query.isSuccess && query.data != null;
  // const status = was404 || !returnedData ? 'create' : 'update';

  return {
    // status,
    getAssetCriticality,
    assignAssetCriticality,
    // privileges,
  };
};
