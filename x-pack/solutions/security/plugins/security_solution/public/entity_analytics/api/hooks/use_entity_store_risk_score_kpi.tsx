/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useEffect, useMemo } from 'react';

import { i18n } from '@kbn/i18n';
import { useQuery } from '@kbn/react-query';
import type { IHttpFetchError } from '@kbn/core/public';

import { EMPTY_SEVERITY_COUNT, RiskSeverity } from '../../../../common/search_strategy';
import { isIndexNotFoundError } from '../../../common/utils/exceptions';
import type { InspectResponse } from '../../../types';
import type { inputsModel } from '../../../common/store';
import type { SeverityCount } from '../../components/severity/types';
import { useAppToasts } from '../../../common/hooks/use_app_toasts';
import { useMlCapabilities } from '../../../common/components/ml/hooks/use_ml_capabilities';
import { useHasSecurityCapability } from '../../../helper_hooks';
import { useEntityAnalyticsRoutes } from '../api';
import {
  buildHostRiskEntityStoreFilterQuery,
  ENTITY_STORE_HOST_RISK_KPI_QUERY_KEY,
  isHostEntityRecord,
  isHostRiskEntityTarget,
  severityFromHostRecord,
} from './entity_store_host_risk_common';
import {
  buildUserRiskEntityStoreFilterQuery,
  ENTITY_STORE_USER_RISK_KPI_QUERY_KEY,
  isUserEntityRecord,
  isUserRiskEntityTarget,
  severityFromUserRecord,
} from './entity_store_user_risk_common';
import type { UseRiskScoreKpiProps } from './use_risk_score_kpi';
import { useRiskEngineStatus } from './use_risk_engine_status';

const KPI_PAGE_SIZE = 10_000;
const MAX_KPI_PAGES = 500;

interface EntityStoreRiskKpiQueryResult {
  inspect: InspectResponse;
  severityCount: SeverityCount;
}

export const useEntityStoreRiskScoreKpi = ({
  filterQuery,
  skip,
  riskEntity,
  timerange,
}: UseRiskScoreKpiProps) => {
  const { addError } = useAppToasts();
  const { fetchEntitiesListV2 } = useEntityAnalyticsRoutes();
  const {
    data: riskEngineStatus,
    isFetching: isStatusLoading,
    refetch: refetchEngineStatus,
  } = useRiskEngineStatus();
  const { isPlatinumOrTrialLicense } = useMlCapabilities();
  const hasEntityAnalyticsCapability = useHasSecurityCapability('entity-analytics');
  const isAuthorized = isPlatinumOrTrialLicense && hasEntityAnalyticsCapability;
  const hasEngineBeenInstalled = riskEngineStatus?.risk_engine_status !== 'NOT_INSTALLED';

  const hostTarget = isHostRiskEntityTarget(riskEntity);
  const userTarget = isUserRiskEntityTarget(riskEntity);
  const storeTarget = hostTarget || userTarget;

  const listFilterQuery = useMemo(() => {
    if (hostTarget) {
      return buildHostRiskEntityStoreFilterQuery({
        filterQuery,
        startDate: timerange?.from,
        endDate: timerange?.to,
      });
    }
    if (userTarget) {
      return buildUserRiskEntityStoreFilterQuery({
        filterQuery,
        startDate: timerange?.from,
        endDate: timerange?.to,
      });
    }
    return JSON.stringify({ bool: { filter: [] } });
  }, [hostTarget, userTarget, filterQuery, timerange?.from, timerange?.to]);

  const kpiQueryKey = hostTarget
    ? ENTITY_STORE_HOST_RISK_KPI_QUERY_KEY
    : ENTITY_STORE_USER_RISK_KPI_QUERY_KEY;

  const queryEnabled =
    !skip && storeTarget && isAuthorized && hasEngineBeenInstalled && !isStatusLoading;

  const failSearchTitle = useMemo(() => {
    if (hostTarget) {
      return i18n.translate(
        'xpack.securitySolution.entityStore.hostRiskScore.kpi.failSearchDescription',
        {
          defaultMessage: 'Failed to load host risk score KPIs from the entity store',
        }
      );
    }
    if (userTarget) {
      return i18n.translate(
        'xpack.securitySolution.entityStore.userRiskScore.kpi.failSearchDescription',
        {
          defaultMessage: 'Failed to load user risk score KPIs from the entity store',
        }
      );
    }
    return '';
  }, [hostTarget, userTarget]);

  const { data, isLoading, isFetching, error, refetch } = useQuery<
    EntityStoreRiskKpiQueryResult,
    IHttpFetchError
  >({
    queryKey: [kpiQueryKey, listFilterQuery, queryEnabled],
    queryFn: async ({ signal }) => {
      const severityCount: SeverityCount = { ...EMPTY_SEVERITY_COUNT };
      const inspect: InspectResponse = { dsl: [], response: [] };

      const entityTypes = hostTarget ? (['host'] as const) : (['user'] as const);
      const sortField = hostTarget ? 'host.name' : 'user.name';

      let page = 1;
      let fetched = 0;
      let total = 0;

      do {
        const res = await fetchEntitiesListV2({
          signal,
          params: {
            entityTypes: [...entityTypes],
            filterQuery: listFilterQuery,
            page,
            perPage: KPI_PAGE_SIZE,
            sortField,
            sortOrder: 'asc',
          },
        });

        total = res.total;
        if (res.inspect?.dsl != null) {
          inspect.dsl.push(...res.inspect.dsl);
        }
        if (res.inspect?.response != null) {
          inspect.response.push(...res.inspect.response);
        }

        for (const record of res.records) {
          if (hostTarget && isHostEntityRecord(record)) {
            const level = severityFromHostRecord(record);
            if (level != null && level in severityCount) {
              severityCount[level] += 1;
            }
          } else if (userTarget && isUserEntityRecord(record)) {
            const level = severityFromUserRecord(record);
            if (level != null && level in severityCount) {
              severityCount[level] += 1;
            }
          }
        }

        fetched += res.records.length;
        page += 1;

        if (res.records.length === 0 || fetched >= total || page > MAX_KPI_PAGES) {
          break;
        }
      } while (fetched < total);

      return { inspect, severityCount };
    },
    enabled: queryEnabled,
    cacheTime: 0,
    refetchOnWindowFocus: false,
  });

  useEffect(() => {
    if (error != null && !isIndexNotFoundError(error)) {
      addError(error, {
        title: failSearchTitle,
      });
    }
  }, [addError, error, failSearchTitle]);

  const refetchAll: inputsModel.Refetch = useCallback(() => {
    void refetchEngineStatus();
    void refetch();
  }, [refetch, refetchEngineStatus]);

  const isModuleDisabled = !!error && isIndexNotFoundError(error);

  const severityCount = useMemo(() => {
    if (!storeTarget || isLoading || isFetching || error != null) {
      return undefined;
    }
    if (data == null) {
      return undefined;
    }
    return {
      [RiskSeverity.Unknown]: data.severityCount[RiskSeverity.Unknown] ?? 0,
      [RiskSeverity.Low]: data.severityCount[RiskSeverity.Low] ?? 0,
      [RiskSeverity.Moderate]: data.severityCount[RiskSeverity.Moderate] ?? 0,
      [RiskSeverity.High]: data.severityCount[RiskSeverity.High] ?? 0,
      [RiskSeverity.Critical]: data.severityCount[RiskSeverity.Critical] ?? 0,
    };
  }, [data, error, storeTarget, isFetching, isLoading]);

  const inspect: InspectResponse = useMemo(
    () =>
      data?.inspect ?? {
        dsl: [],
        response: [],
      },
    [data?.inspect]
  );

  return {
    error,
    inspect,
    isModuleDisabled,
    loading: storeTarget ? isLoading || isFetching || isStatusLoading : false,
    refetch: refetchAll,
    severityCount,
  };
};
