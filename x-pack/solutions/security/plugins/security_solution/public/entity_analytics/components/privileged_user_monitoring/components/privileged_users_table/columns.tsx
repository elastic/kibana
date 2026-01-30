/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FormattedMessage } from '@kbn/i18n-react';
import { isArray } from 'lodash/fp';
import React, { useEffect } from 'react';
import { i18n } from '@kbn/i18n';
import type { EuiBasicTableColumn, EuiThemeComputed } from '@elastic/eui';
import {
  EuiLink,
  EuiFlexItem,
  useEuiTheme,
  EuiBadge,
  EuiText,
  EuiLoadingSpinner,
  EuiButtonIcon,
  EuiFlexGroup,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { SecurityPageName, useNavigation } from '@kbn/security-solution-navigation';
import { encode } from '@kbn/rison';
import { DistributionBar } from '@kbn/security-solution-distribution-bar';
import { ALERTS_QUERY_NAMES } from '../../../../../detections/containers/detection_engine/alerts/constants';
import type { AlertsByStatusAgg } from '../../../../../overview/components/detection_response/alerts_by_status/types';
import { getRowItemsWithActions } from '../../../../../common/components/tables/helpers';
import { UserName } from '../../../user_name';
import { getEmptyTagValue } from '../../../../../common/components/empty_value';
import type { TableItemType } from './types';
import { formatRiskScoreWholeNumber } from '../../../../common/utils';
import { AssetCriticalityBadge } from '../../../asset_criticality';
import { useSignalIndex } from '../../../../../detections/containers/detection_engine/alerts/use_signal_index';
import {
  getAlertsByStatusQuery,
  parseAlertsData,
} from '../../../../../overview/components/detection_response/alerts_by_status/use_alerts_by_status';
import { useGlobalTime } from '../../../../../common/containers/use_global_time';
import { useQueryAlerts } from '../../../../../detections/containers/detection_engine/alerts/use_query';
import { formatPageFilterSearchParam } from '../../../../../../common/utils/format_page_filter_search_param';
import { URL_PARAM_KEY } from '../../../../../common/hooks/constants';
import {
  OPEN_IN_ALERTS_TITLE_STATUS,
  OPEN_IN_ALERTS_TITLE_USERNAME,
} from '../../../../../overview/components/detection_response/translations';
import { FILTER_ACKNOWLEDGED, FILTER_OPEN } from '../../../../../../common/types';
import type { CriticalityLevelWithUnassigned } from '../../../../../../common/entity_analytics/asset_criticality/types';
import { getFormattedAlertStats } from '../../../../../flyout/document_details/shared/components/alert_count_insight';
import { SCOPE_ID } from '../../constants';

const COLUMN_WIDTHS = { actions: '5%', '@timestamp': '20%', privileged_user: '15%' };

const getPrivilegedUserColumn = () => ({
  field: 'user.name',
  name: (
    <FormattedMessage
      id="xpack.securitySolution.entityAnalytics.privilegedUserMonitoring.privilegedUsersTable.columns.privilegedUser"
      defaultMessage="Privileged user"
    />
  ),
  width: COLUMN_WIDTHS.privileged_user,
  render: (user: string[] | string) =>
    user != null
      ? getRowItemsWithActions({
          values: isArray(user) ? user : [user],
          fieldName: 'user.name',
          idPrefix: 'privileged-user-monitoring-privileged-user',
          render: (item) => <UserName userName={item} scopeId={SCOPE_ID} />,
          displayCount: 1,
        })
      : getEmptyTagValue(),
});

const getActionsColumn = (openUserFlyout: (userName: string) => void) => ({
  name: (
    <FormattedMessage
      id="xpack.securitySolution.entityAnalytics.privilegedUserMonitoring.privilegedUsersTable.columns.actions"
      defaultMessage="Actions"
    />
  ),
  render: (record: { 'user.name': string }) => {
    return (
      <EuiButtonIcon
        iconType="expand"
        onClick={() => {
          openUserFlyout(record['user.name']);
        }}
        aria-label={i18n.translate(
          'xpack.securitySolution.entityAnalytics.privilegedUserMonitoring.privilegedUsersTable.columns.expand.ariaLabel',
          {
            defaultMessage: 'Open user flyout',
          }
        )}
      />
    );
  },
  width: COLUMN_WIDTHS.actions,
});

const getRiskScoreColumn = (euiTheme: EuiThemeComputed) => ({
  name: (
    <FormattedMessage
      id="xpack.securitySolution.entityAnalytics.privilegedUserMonitoring.privilegedUsersTable.columns.riskScore"
      defaultMessage="Risk score"
    />
  ),
  render: (record: TableItemType) => {
    const colors: { background: string; text: string } = (() => {
      switch (record.risk_level) {
        case 'Unknown':
          return {
            background: euiTheme.colors.backgroundBaseSubdued,
            text: euiTheme.colors.textSubdued,
          };
        case 'Low':
          return {
            background: euiTheme.colors.backgroundBaseNeutral,
            text: euiTheme.colors.textNeutral,
          };
        case 'Moderate':
          return {
            background: euiTheme.colors.backgroundLightWarning,
            text: euiTheme.colors.textWarning,
          };
        case 'High':
          return {
            background: euiTheme.colors.backgroundLightRisk,
            text: euiTheme.colors.textRisk,
          };
        case 'Critical':
          return {
            background: euiTheme.colors.backgroundLightDanger,
            text: euiTheme.colors.textDanger,
          };
        default:
          return {
            background: euiTheme.colors.backgroundBaseSubdued,
            text: euiTheme.colors.textSubdued,
          };
      }
    })();
    return (
      <EuiBadge color={colors.background}>
        <EuiText
          css={css`
            font-weight: ${euiTheme.font.weight.semiBold};
          `}
          size={'s'}
          color={colors.text}
        >
          {record.risk_score
            ? formatRiskScoreWholeNumber(record.risk_score)
            : i18n.translate(
                'xpack.securitySolution.entityAnalytics.privilegedUserMonitoring.privilegedUsersTable.columns.riskScore.na',
                { defaultMessage: 'N/A' }
              )}
        </EuiText>
      </EuiBadge>
    );
  },
});

const AssetCriticalityCell: React.FC<{
  criticalityLevel?: CriticalityLevelWithUnassigned;
}> = ({ criticalityLevel }) => {
  return criticalityLevel ? (
    <AssetCriticalityBadge
      criticalityLevel={criticalityLevel}
      dataTestSubj="privileged-user-monitoring-asset-criticality-badge"
    />
  ) : (
    getEmptyTagValue()
  );
};

const getAssetCriticalityColumn = () => ({
  name: (
    <FormattedMessage
      id="xpack.securitySolution.entityAnalytics.privilegedUserMonitoring.privilegedUsersTable.columns.assetCriticality"
      defaultMessage="Asset Criticality"
    />
  ),
  render: (record: TableItemType) => (
    <AssetCriticalityCell criticalityLevel={record.criticality_level} />
  ),
});

const getLabelColumn = () => ({
  name: (
    <FormattedMessage
      id="xpack.securitySolution.entityAnalytics.privilegedUserMonitoring.privilegedUsersTable.columns.label"
      defaultMessage="Label"
    />
  ),
  render: (record: TableItemType) => {
    const labels = record.eaLabels;

    return labels ? (
      <EuiText size="s" data-test-subj="privileged-user-monitoring-label">
        {(isArray(labels) ? labels : [labels]).join(', ')}
      </EuiText>
    ) : (
      getEmptyTagValue()
    );
  },
});

function dataSourcesIsArray(dataSources: string | string[]): dataSources is string[] {
  return Array.isArray(dataSources);
}

const prettyDataSource = (dataSource: string) => {
  return (() => {
    switch (dataSource) {
      case 'csv':
        return i18n.translate(
          'xpack.securitySolution.entityAnalytics.privilegedUserMonitoring.privilegedUsersTable.columns.dataSource.csv',
          { defaultMessage: 'CSV File' }
        );
      case 'index':
        return i18n.translate(
          'xpack.securitySolution.entityAnalytics.privilegedUserMonitoring.privilegedUsersTable.columns.dataSource.index',
          { defaultMessage: 'Index' }
        );
      case 'api':
        return i18n.translate(
          'xpack.securitySolution.entityAnalytics.privilegedUserMonitoring.privilegedUsersTable.columns.dataSource.api',
          { defaultMessage: 'API request' }
        );
      default:
        return dataSource;
    }
  })();
};

const getDataSourceColumn = () => ({
  name: (
    <FormattedMessage
      id="xpack.securitySolution.entityAnalytics.privilegedUserMonitoring.privilegedUsersTable.columns.dataSource"
      defaultMessage="Data source"
    />
  ),
  render: (record: TableItemType) => {
    const dataSources = record['labels.sources'];
    if (!dataSources) return getEmptyTagValue();

    if (dataSourcesIsArray(dataSources))
      return dataSources.map((source) => prettyDataSource(source)).join(', ');
    return prettyDataSource(dataSources);
  },
});

const PrivilegedUserAlertDistribution: React.FC<{ userName: string }> = ({ userName }) => {
  const { signalIndexName } = useSignalIndex();
  const { from, to } = useGlobalTime();
  const { euiTheme } = useEuiTheme();

  const { data, setQuery: setAlertsQuery } = useQueryAlerts<{}, AlertsByStatusAgg>({
    query: getAlertsByStatusQuery({
      from,
      to,
      entityFilter: { field: 'user.name', value: userName },
    }),
    indexName: signalIndexName,
    queryName: ALERTS_QUERY_NAMES.BY_STATUS,
  });
  useEffect(() => {
    setAlertsQuery(
      getAlertsByStatusQuery({
        from,
        to,
        entityFilter: { field: 'user.name', value: userName },
      })
    );
  }, [setAlertsQuery, from, to, userName]);
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

  const filters = [
    {
      title: OPEN_IN_ALERTS_TITLE_USERNAME,
      selected_options: [userName],
      field_name: 'user.name',
    },
    {
      title: OPEN_IN_ALERTS_TITLE_STATUS,
      selected_options: [FILTER_OPEN, FILTER_ACKNOWLEDGED],
      field_name: 'kibana.alert.workflow_status',
    },
  ];

  const urlFilterParams = encode(formatPageFilterSearchParam(filters));

  const timerangePath = timerange ? `&timerange=${timerange}` : '';

  const openAlertsPage = () => {
    navigateTo({
      deepLinkId: SecurityPageName.alerts,
      path: `?${URL_PARAM_KEY.pageFilter}=${urlFilterParams}${timerangePath}`,
      openInNewTab: true,
    });
  };

  return (
    <EuiFlexGroup direction="row">
      <EuiFlexItem>
        <DistributionBar
          stats={alertStats}
          hideLastTooltip
          data-test-subj={`privileged-users-alerts-distribution-bar`}
        />
      </EuiFlexItem>
      <EuiBadge color="hollow">{<EuiLink onClick={openAlertsPage}>{alertCount}</EuiLink>}</EuiBadge>
    </EuiFlexGroup>
  );
};

const getAlertDistributionColumn = () => ({
  name: (
    <FormattedMessage
      id="xpack.securitySolution.entityAnalytics.privilegedUserMonitoring.privilegedUsersTable.columns.alerts"
      defaultMessage="Alerts"
    />
  ),
  render: (record: TableItemType) => {
    return <PrivilegedUserAlertDistribution userName={record['user.name']} />;
  },
});

export const buildPrivilegedUsersTableColumns = (
  openUserFlyout: (userName: string) => void,
  euiTheme: EuiThemeComputed
): Array<EuiBasicTableColumn<TableItemType>> => [
  getActionsColumn(openUserFlyout),
  getPrivilegedUserColumn(),
  getRiskScoreColumn(euiTheme),
  getAssetCriticalityColumn(),
  getLabelColumn(),
  getDataSourceColumn(),
  getAlertDistributionColumn(),
];
