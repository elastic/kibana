/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useMemo } from 'react';
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
import { useQueryAlerts } from '../../../detections/containers/detection_engine/alerts/use_query';
import { useGlobalTime } from '../../../common/containers/use_global_time';
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
  const { from, to } = useGlobalTime();
  const { euiTheme } = useEuiTheme();
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

  const { data, setQuery: setAlertsQuery } = useQueryAlerts<{}, AlertsByStatusAgg>({
    query: getAlertsByStatusQuery({
      from,
      to,
      entityFilters,
    }),
    indexName: signalIndexName,
    queryName: ALERTS_QUERY_NAMES.BY_STATUS,
  });

  useEffect(() => {
    setAlertsQuery(
      getAlertsByStatusQuery({
        from,
        to,
        entityFilters,
      })
    );
  }, [setAlertsQuery, from, to, entityName, entityFilters]);

  const { navigateTo } = useNavigation();

  if (!data) return <EuiLoadingSpinner size="m" />;

  const alertsData = parseAlertsData(data);
  const alertStats = getFormattedAlertStats(alertsData, euiTheme);
  const alertCount = (alertsData?.open?.total ?? 0) + (alertsData?.acknowledged?.total ?? 0);

  const timerange = encode({
    global: {
      [URL_PARAM_KEY.timerange]: {
        kind: 'absolute',
        from,
        to,
      },
    },
  });

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
  const timerangePath = timerange ? `&timerange=${timerange}` : '';

  const openAlertsPage = () => {
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
