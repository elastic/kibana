/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo } from 'react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiBadge,
  EuiLink,
  EuiLoadingSpinner,
  useEuiTheme,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { encode } from '@kbn/rison';
import dateMath from '@kbn/datemath';
import { useQuery } from '@kbn/react-query';
import { DistributionBar } from '@kbn/security-solution-distribution-bar';
import { SecurityPageName, useNavigation } from '@kbn/security-solution-navigation';
import { useEntityStoreEuidApi } from '@kbn/entity-store/public';
import type { EntityStoreRecord } from '../../../flyout/entity_details/shared/hooks/use_entity_from_store';
import type { EntityType } from '../../../../common/entity_analytics/types';
import { EntityTypeToIdentifierField } from '../../../../common/entity_analytics/types';
import { FILTER_OPEN, FILTER_ACKNOWLEDGED } from '../../../../common/types';
import { formatPageFilterSearchParam } from '../../../../common/utils/format_page_filter_search_param';
import { useSignalIndex } from '../../../detections/containers/detection_engine/alerts/use_signal_index';
import { ALERTS_QUERY_NAMES } from '../../../detections/containers/detection_engine/alerts/constants';
import { fetchQueryAlerts } from '../../../detections/containers/detection_engine/alerts/api';
import { useGlobalTime } from '../../../common/containers/use_global_time';
import { useQueryInspector } from '../../../common/components/page/manage_query';
import { useTrackHttpRequest } from '../../../common/lib/apm/use_track_http_request';
import { URL_PARAM_KEY } from '../../../common/hooks/constants';
import {
  OPEN_IN_ALERTS_TITLE_STATUS,
  OPEN_IN_ALERTS_TITLE_HOSTNAME,
  OPEN_IN_ALERTS_TITLE_USERNAME,
} from '../../../overview/components/detection_response/translations';
import type { AlertsByStatusAgg } from '../../../overview/components/detection_response/alerts_by_status/types';
import {
  getAlertsByStatusQuery,
  parseAlertsData,
} from '../../../overview/components/detection_response/alerts_by_status/use_alerts_by_status';
import { getFormattedAlertStats } from '../../../flyout/document_details/shared/components/alert_count_insight';

const QUERY_KEY_ENTITY_ALERTS_BY_STATUS = 'entity-analytics-alerts-by-status';

// The Entity Analytics home page hides the global date picker (see `hideDatePicker`
// in entity_analytics_home_page.tsx), so we can't rely on the global time range — it
// carries whatever the user last set on another page. Pin the alerts column to a
// fixed "last 30 days" window instead. ES resolves the date-math expressions at
// query time, so clicking the global refresh button always returns up-to-date counts.
const ALERTS_CELL_FROM_STR = 'now-30d';
const ALERTS_CELL_TO_STR = 'now';

const ENTITY_FILTER_TITLE = i18n.translate(
  'xpack.securitySolution.entityAnalytics.homePage.alertsColumn.entityFilterTitle',
  { defaultMessage: 'Entity' }
);

const getFilterTitle = (entityType: EntityType): string => {
  switch (entityType) {
    case 'user':
      return OPEN_IN_ALERTS_TITLE_USERNAME;
    case 'host':
      return OPEN_IN_ALERTS_TITLE_HOSTNAME;
    default:
      return ENTITY_FILTER_TITLE;
  }
};

export const EntityAlertsCell: React.FC<{
  entityName: string;
  entityType: EntityType;
  entityRecord?: EntityStoreRecord | null;
}> = ({ entityName, entityType, entityRecord }) => {
  const { signalIndexName } = useSignalIndex();
  const { setQuery, deleteQuery } = useGlobalTime();
  const { euiTheme } = useEuiTheme();
  const { startTracking } = useTrackHttpRequest();
  const euidApi = useEntityStoreEuidApi();

  const filterField = EntityTypeToIdentifierField[entityType] || 'entity.id';

  const entityFilters = useMemo(() => {
    if (euidApi?.euid && entityRecord) {
      const filter = euidApi.euid?.dsl.getEuidFilterBasedOnDocument(entityType, entityRecord);
      if (filter != null) {
        return [filter];
      }
    }
    return [{ term: { [filterField]: entityName } }];
  }, [euidApi?.euid, filterField, entityName, entityType, entityRecord]);

  const euidKqlEntityFilter = useMemo(() => {
    if (euidApi?.euid && entityRecord) {
      return euidApi.euid.kql.getEuidFilterBasedOnDocument(entityType, entityRecord);
    }
    return undefined;
  }, [euidApi?.euid, entityType, entityRecord]);

  const {
    data,
    isFetching,
    refetch: refetchQuery,
  } = useQuery({
    queryKey: [
      QUERY_KEY_ENTITY_ALERTS_BY_STATUS,
      {
        entityType,
        entityName,
        filterField,
        fromStr: ALERTS_CELL_FROM_STR,
        toStr: ALERTS_CELL_TO_STR,
        signalIndexName,
        entityFilters,
      },
    ],
    queryFn: async ({ signal }) => {
      const { endTracking } = startTracking({ name: ALERTS_QUERY_NAMES.BY_STATUS });
      try {
        const response = await fetchQueryAlerts<{}, AlertsByStatusAgg>({
          query: getAlertsByStatusQuery({
            from: ALERTS_CELL_FROM_STR,
            to: ALERTS_CELL_TO_STR,
            entityFilters,
          }),
          // react-query v4 types `signal` as `AbortSignal | undefined`, but
          // `fetchQueryAlerts` requires a non-optional `AbortSignal`. Fall back
          // to a fresh controller so the call type-checks when react-query
          // hasn't supplied one.
          signal: signal ?? new AbortController().signal,
        });
        endTracking('success');
        return response;
      } catch (err) {
        endTracking(signal?.aborted ? 'aborted' : 'error');
        throw err;
      }
    },
    enabled: Boolean(signalIndexName && entityName && entityType),
    staleTime: Infinity,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    keepPreviousData: true,
  });

  const refetch = useCallback(() => {
    void refetchQuery();
  }, [refetchQuery]);

  useQueryInspector({
    queryId: `entity-analytics-alerts-${entityType}-${entityName}`,
    setQuery,
    deleteQuery,
    refetch,
    loading: isFetching,
    inspect: null,
  });

  const { navigateTo } = useNavigation();

  if (!data) return <EuiLoadingSpinner size="m" />;

  const alertsData = parseAlertsData(data);
  const alertStats = getFormattedAlertStats(alertsData, euiTheme);
  const alertCount = (alertsData?.open?.total ?? 0) + (alertsData?.acknowledged?.total ?? 0);

  const statusPageFilter = {
    title: OPEN_IN_ALERTS_TITLE_STATUS,
    selected_options: [FILTER_OPEN, FILTER_ACKNOWLEDGED],
    field_name: 'kibana.alert.workflow_status',
  };

  const pageFilters = euidKqlEntityFilter
    ? [statusPageFilter]
    : [
        {
          title: getFilterTitle(entityType),
          selected_options: [entityName],
          field_name: filterField,
        },
        statusPageFilter,
      ];

  const urlFilterParams = encode(formatPageFilterSearchParam(pageFilters));
  const appQueryPath = euidKqlEntityFilter
    ? `&${URL_PARAM_KEY.appQuery}=${encode({ language: 'kuery', query: euidKqlEntityFilter })}`
    : '';

  const openAlertsPage = () => {
    // Resolve the date-math strings at click time so the alerts page opens with a
    // snapshot of the last 30 days aligned with what the user just saw in the cell.
    const from = dateMath.parse(ALERTS_CELL_FROM_STR)?.toISOString() ?? '';
    const to = dateMath.parse(ALERTS_CELL_TO_STR, { roundUp: true })?.toISOString() ?? '';
    const timerange = encode({
      global: {
        [URL_PARAM_KEY.timerange]: {
          kind: 'relative',
          fromStr: ALERTS_CELL_FROM_STR,
          toStr: ALERTS_CELL_TO_STR,
          from,
          to,
        },
      },
    });
    const timerangePath = timerange ? `&timerange=${timerange}` : '';

    navigateTo({
      deepLinkId: SecurityPageName.alerts,
      path: `?${URL_PARAM_KEY.pageFilter}=${urlFilterParams}${appQueryPath}${timerangePath}`,
      openInNewTab: true,
    });
  };

  return (
    <EuiFlexGroup direction="row" gutterSize="s" alignItems="center">
      <EuiFlexItem>
        <DistributionBar
          stats={alertStats}
          hideLastTooltip
          data-test-subj="entity-analytics-alerts-distribution-bar"
        />
      </EuiFlexItem>
      <EuiBadge color="hollow">
        <EuiLink onClick={openAlertsPage}>{alertCount}</EuiLink>
      </EuiBadge>
    </EuiFlexGroup>
  );
};
