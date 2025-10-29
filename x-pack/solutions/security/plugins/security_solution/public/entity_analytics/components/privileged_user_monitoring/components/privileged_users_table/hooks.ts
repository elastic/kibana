/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { take } from 'lodash/fp';
import { useQuery } from '@kbn/react-query';
import { getESQLResults, prettifyQuery } from '@kbn/esql-utils';
import { useMemo } from 'react';
import { buildEntityNameFilter, EntityType } from '../../../../../../common/search_strategy';
import { esqlResponseToRecords } from '../../../../../common/utils/esql';
import { useRiskScore } from '../../../../api/hooks/use_risk_score';
import type { TableItemType } from './types';
import { getPrivilegedUsersQuery } from './esql_source_query';
import { useGlobalFilterQuery } from '../../../../../common/hooks/use_global_filter_query';
import { useAssetCriticalityFetchList } from '../../../asset_criticality/use_asset_criticality';
import { getPrivilegedMonitorUsersIndex } from '../../../../../../common/entity_analytics/privilege_monitoring/utils';
import type { CriticalityLevelWithUnassigned } from '../../../../../../common/entity_analytics/asset_criticality/types';
import type { EntityRiskScore } from '../../../../../../common/search_strategy';
import { useKibana } from '../../../../../common/lib/kibana';
import { DEFAULT_PAGE_SIZE } from '.';

interface RiskScoresByUserName {
  [key: string]: EntityRiskScore<EntityType.user>;
}

interface AssetCriticalityByUserName {
  [key: string]: CriticalityLevelWithUnassigned;
}

export const usePrivilegedUsersTableData = (
  spaceId: string,
  currentPage: number,
  toggleStatus: boolean
) => {
  const { data } = useKibana().services;
  const privilegedUsersTableQuery = getPrivilegedUsersQuery(
    spaceId,
    currentPage * DEFAULT_PAGE_SIZE + 1 // we add 1 so that we know if there are more results to show
  );

  const { filterQuery: filterQueryWithoutTimerange } = useGlobalFilterQuery();

  const {
    data: result,
    isLoading: loadingPrivilegedUsers,
    isError: privilegedUsersError,
    refetch,
  } = useQuery({
    queryKey: ['privileged-users-table', privilegedUsersTableQuery, filterQueryWithoutTimerange],
    enabled: toggleStatus,
    queryFn: async () => {
      return getESQLResults({
        esqlQuery: privilegedUsersTableQuery,
        search: data.search.search,
        filter: filterQueryWithoutTimerange,
      });
    },
  });

  const records = useMemo(() => esqlResponseToRecords<TableItemType>(result?.response), [result]);

  const nameFilterQuery = useMemo(() => {
    const userNames = records.map((user) => user['user.name']);
    return buildEntityNameFilter(EntityType.user, userNames);
  }, [records]);

  const {
    data: riskScoreData,
    error: riskScoreError,
    loading: loadingRiskScore,
    hasEngineBeenInstalled: hasRiskEngineBeenInstalled,
  } = useRiskScore<EntityType.user>({
    riskEntity: EntityType.user,
    filterQuery: nameFilterQuery,
    onlyLatest: true,
    pagination: {
      cursorStart: 0,
      querySize: records.length,
    },
    skip: nameFilterQuery === undefined || records.length === 0,
  });

  const riskScores = riskScoreData && riskScoreData.length > 0 ? riskScoreData : [];

  const riskScoreByUserName: RiskScoresByUserName = Object.fromEntries(
    riskScores.map((riskScore) => [riskScore.user.name, riskScore])
  );
  const {
    data: assetCriticalityData,
    isError: assetCriticalityError,
    isLoading: loadingAssetCriticality,
  } = useAssetCriticalityFetchList({
    idField: 'user.name',
    idValues: records.map((user) => user['user.name']),
    skip: !toggleStatus || records.length === 0,
  });
  const assetCriticalityRecords =
    assetCriticalityData && assetCriticalityData.records.length > 0
      ? assetCriticalityData.records
      : [];

  const assetCriticalityByUserName: AssetCriticalityByUserName = Object.fromEntries(
    assetCriticalityRecords.map((assetCriticalityRecord) => [
      assetCriticalityRecord.id_value,
      assetCriticalityRecord.criticality_level,
    ])
  );

  const enrichedRecords: TableItemType[] = useMemo(
    () =>
      records.map((record, index) => {
        let enrichedFields = {};

        const riskScore: EntityRiskScore<EntityType.user> | undefined =
          riskScoreByUserName[record['user.name']];
        if (riskScore) {
          enrichedFields = {
            ...enrichedFields,
            risk_score: riskScore.user.risk.calculated_score_norm,
            risk_level: riskScore.user.risk.calculated_level,
          };
        }

        const assetCriticality: CriticalityLevelWithUnassigned | undefined =
          assetCriticalityByUserName[record['user.name']];

        if (assetCriticality) {
          enrichedFields = {
            ...enrichedFields,
            criticality_level: assetCriticality,
          };
        }

        return {
          ...record,
          ...enrichedFields,
        };
      }),
    [records, riskScoreByUserName, assetCriticalityByUserName]
  );

  const isLoading =
    loadingPrivilegedUsers || (records.length > 0 && (loadingRiskScore || loadingAssetCriticality));
  const visibleRecords = take(currentPage * DEFAULT_PAGE_SIZE, enrichedRecords);

  const inspect = useMemo(() => {
    return {
      dsl: [
        JSON.stringify(
          {
            index: [getPrivilegedMonitorUsersIndex(spaceId)],
            body: prettifyQuery(privilegedUsersTableQuery, false),
          },
          null,
          2
        ),
      ],
      response: result ? [JSON.stringify(result, null, 2)] : [],
    };
  }, [privilegedUsersTableQuery, result, spaceId]);

  return {
    visibleRecords,
    isLoading,
    refetch,
    inspect,
    hasError:
      privilegedUsersError ||
      (hasRiskEngineBeenInstalled && riskScoreError) ||
      assetCriticalityError,
    hasNextPage: records.length > currentPage * DEFAULT_PAGE_SIZE,
  };
};
