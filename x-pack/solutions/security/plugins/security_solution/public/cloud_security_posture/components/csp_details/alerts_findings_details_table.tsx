/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useCallback, useEffect, useState } from 'react';
import { encode } from '@kbn/rison';
import { capitalize } from 'lodash';
import type { Criteria, EuiBasicTableColumn, EuiTableSortingType } from '@elastic/eui';
import {
  EuiSpacer,
  EuiPanel,
  EuiText,
  EuiBasicTable,
  EuiIcon,
  EuiLink,
  useEuiTheme,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { DistributionBar } from '@kbn/security-solution-distribution-bar';
import {
  ENTITY_FLYOUT_EXPAND_MISCONFIGURATION_VIEW_VISITS,
  uiMetricService,
} from '@kbn/cloud-security-posture-common/utils/ui_metrics';
import { METRIC_TYPE } from '@kbn/analytics';
import { buildEntityAlertsQuery } from '@kbn/cloud-security-posture-common/utils/helpers';
import { useExpandableFlyoutApi } from '@kbn/expandable-flyout';
import { TableId } from '@kbn/securitysolution-data-table';
import type { AlertsByStatus } from '../../../overview/components/detection_response/alerts_by_status/types';
import { DETECTION_RESPONSE_ALERTS_BY_STATUS_ID } from '../../../overview/components/detection_response/alerts_by_status/types';
import {
  OPEN_IN_ALERTS_TITLE_HOSTNAME,
  OPEN_IN_ALERTS_TITLE_STATUS,
  OPEN_IN_ALERTS_TITLE_USERNAME,
} from '../../../overview/components/detection_response/translations';
import { URL_PARAM_KEY } from '../../../common/hooks/use_url_state';
import { useNavigateToAlertsPageWithFilters } from '../../../common/hooks/use_navigate_to_alerts_page_with_filters';
import { DocumentDetailsPreviewPanelKey } from '../../../flyout/document_details/shared/constants/panel_keys';
import { useGlobalTime } from '../../../common/containers/use_global_time';
import { useQueryAlerts } from '../../../detections/containers/detection_engine/alerts/use_query';
import { ALERTS_QUERY_NAMES } from '../../../detections/containers/detection_engine/alerts/constants';
import { useSignalIndex } from '../../../detections/containers/detection_engine/alerts/use_signal_index';
import { getSeverityColor } from '../../../detections/components/alerts_kpis/severity_level_panel/helpers';
import { SeverityBadge } from '../../../common/components/severity_badge';
import { ALERT_PREVIEW_BANNER } from '../../../flyout/document_details/preview/constants';
import { FILTER_OPEN, FILTER_ACKNOWLEDGED } from '../../../../common/types';
import { useNonClosedAlerts } from '../../hooks/use_non_closed_alerts';
import type { CloudPostureEntityIdentifier } from '../entity_insight';

enum KIBANA_ALERTS {
  SEVERITY = 'kibana.alert.severity',
  RULE_NAME = 'kibana.alert.rule.name',
  WORKFLOW_STATUS = 'kibana.alert.workflow_status',
}

type AlertSeverity = 'low' | 'medium' | 'high' | 'critical';

type AlertsSortFieldType =
  | 'id'
  | 'index'
  | KIBANA_ALERTS.SEVERITY
  | KIBANA_ALERTS.WORKFLOW_STATUS
  | KIBANA_ALERTS.RULE_NAME;

interface ResultAlertsField {
  _id: string[];
  _index: string[];
  [KIBANA_ALERTS.SEVERITY]: AlertSeverity[];
  [KIBANA_ALERTS.RULE_NAME]: string[];
  [KIBANA_ALERTS.WORKFLOW_STATUS]: string[];
}

interface ContextualFlyoutAlertsField {
  id: string;
  index: string;
  [KIBANA_ALERTS.SEVERITY]: AlertSeverity;
  [KIBANA_ALERTS.RULE_NAME]: string;
  [KIBANA_ALERTS.WORKFLOW_STATUS]: string;
}

interface AlertsDetailsFields {
  fields: ResultAlertsField;
}

export const AlertsDetailsTable = memo(
  ({ field, value }: { field: CloudPostureEntityIdentifier; value: string }) => {
    const { euiTheme } = useEuiTheme();

    useEffect(() => {
      uiMetricService.trackUiMetric(
        METRIC_TYPE.COUNT,
        ENTITY_FLYOUT_EXPAND_MISCONFIGURATION_VIEW_VISITS
      );
    }, []);

    const [currentFilter, setCurrentFilter] = useState<string>('');

    const [pageIndex, setPageIndex] = useState(0);
    const [pageSize, setPageSize] = useState(10);

    const [sortField, setSortField] = useState<AlertsSortFieldType>(KIBANA_ALERTS.SEVERITY);
    const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

    const sorting: EuiTableSortingType<ContextualFlyoutAlertsField> = {
      sort: {
        field: sortField,
        direction: sortDirection,
      },
    };

    const alertsPagination = (alerts: ContextualFlyoutAlertsField[]) => {
      let pageOfItems;

      if (!pageIndex && !pageSize) {
        pageOfItems = alerts;
      } else {
        const startIndex = pageIndex * pageSize;
        pageOfItems = alerts?.slice(startIndex, Math.min(startIndex + pageSize, alerts?.length));
      }

      return {
        pageOfItems,
        totalItemCount: alerts?.length,
      };
    };

    const { to, from } = useGlobalTime();
    const timerange = encode({
      global: {
        [URL_PARAM_KEY.timerange]: {
          kind: 'absolute',
          from,
          to,
        },
      },
    });

    const { signalIndexName } = useSignalIndex();
    const { data, setQuery } = useQueryAlerts({
      query: buildEntityAlertsQuery({
        field,
        to,
        from,
        queryValue: value,
        size: 500,
        severity: '',
        sortField,
        sortDirection,
      }),
      queryName: ALERTS_QUERY_NAMES.BY_RULE_BY_STATUS,
      indexName: signalIndexName,
    });

    const { filteredAlertsData: alertsData } = useNonClosedAlerts({
      field,
      value,
      to,
      from,
      queryId: `${DETECTION_RESPONSE_ALERTS_BY_STATUS_ID}`,
    });

    const severityMap = new Map<string, number>();
    (Object.keys(alertsData || {}) as AlertsByStatus[]).forEach((status) => {
      if (alertsData?.[status]?.severities) {
        alertsData?.[status]?.severities.forEach((severity) => {
          const currentSeverity = severityMap.get(severity.key) || 0;
          severityMap.set(severity.key, currentSeverity + severity.value);
        });
      }
    });

    const alertStats = Array.from(severityMap, ([key, count]) => ({
      key: capitalize(key),
      count,
      color: getSeverityColor(key, euiTheme),
      filter: () => {
        setCurrentFilter(key);
        setQuery(
          buildEntityAlertsQuery({
            field,
            to,
            from,
            queryValue: value,
            size: 500,
            severity: key,
            sortField,
            sortDirection,
          })
        );
      },
      isCurrentFilter: currentFilter === key,
      reset: (event: React.MouseEvent<SVGElement, MouseEvent>) => {
        setCurrentFilter('');
        setQuery(
          buildEntityAlertsQuery({
            field,
            to,
            from,
            queryValue: value,
            size: 500,
            severity: '',
          })
        );
        event?.stopPropagation();
      },
    }));

    const alertDataResults = (data?.hits?.hits as AlertsDetailsFields[])?.map(
      (item: AlertsDetailsFields) => {
        return {
          id: item.fields?._id?.[0],
          index: item.fields?._index?.[0],
          [KIBANA_ALERTS.RULE_NAME]: item.fields?.[KIBANA_ALERTS.RULE_NAME]?.[0],
          [KIBANA_ALERTS.SEVERITY]: item.fields?.[KIBANA_ALERTS.SEVERITY]?.[0],
          [KIBANA_ALERTS.WORKFLOW_STATUS]: item.fields?.[KIBANA_ALERTS.WORKFLOW_STATUS]?.[0],
        };
      }
    );

    const { pageOfItems, totalItemCount } = alertsPagination(alertDataResults || []);

    const pagination = {
      pageIndex,
      pageSize,
      totalItemCount,
      pageSizeOptions: [10, 25, 100],
    };

    const onTableChange = useCallback(
      ({ page, sort }: Criteria<ContextualFlyoutAlertsField>) => {
        if (page) {
          const { index, size } = page;
          setPageIndex(index);
          setPageSize(size);
        }

        if (sort) {
          const { field: fieldSort, direction } = sort;
          setSortField(fieldSort);
          setSortDirection(direction);
          setQuery(
            buildEntityAlertsQuery({
              field,
              to,
              from,
              queryValue: value,
              size: 500,
              severity: currentFilter,
              sortField: fieldSort,
              sortDirection: direction,
            })
          );
        }
      },
      [currentFilter, field, from, setQuery, to, value]
    );

    const { openPreviewPanel } = useExpandableFlyoutApi();

    const handleOnEventAlertDetailPanelOpened = useCallback(
      (eventId: string, indexName: string, tableId: string) => {
        openPreviewPanel({
          id: DocumentDetailsPreviewPanelKey,
          params: {
            id: eventId,
            indexName,
            scopeId: tableId,
            isPreviewMode: true,
            banner: ALERT_PREVIEW_BANNER,
          },
        });
      },
      [openPreviewPanel]
    );

    const tableId = TableId.alertsOnRuleDetailsPage;

    const columns: Array<EuiBasicTableColumn<ContextualFlyoutAlertsField>> = [
      {
        field: 'id',
        name: '',
        width: '5%',
        render: (id: string, alert: ContextualFlyoutAlertsField) => (
          <EuiLink onClick={() => handleOnEventAlertDetailPanelOpened(id, alert.index, tableId)}>
            <EuiIcon type={'expand'} />
          </EuiLink>
        ),
      },
      {
        field: KIBANA_ALERTS.RULE_NAME,
        render: (ruleName: string) => <EuiText size="s">{ruleName}</EuiText>,
        name: i18n.translate(
          'xpack.securitySolution.flyout.left.insights.alerts.table.ruleNameColumnName',
          {
            defaultMessage: 'Rule',
          }
        ),
        width: '55%',
        sortable: true,
      },
      {
        field: KIBANA_ALERTS.SEVERITY,
        render: (severity: AlertSeverity) => (
          <EuiText size="s">
            <SeverityBadge value={severity} data-test-subj="severityPropertyValue" />
          </EuiText>
        ),
        name: i18n.translate(
          'xpack.securitySolution.flyout.left.insights.alerts.table.severityColumnName',
          {
            defaultMessage: 'Severity',
          }
        ),
        width: '20%',
        sortable: true,
      },
      {
        field: KIBANA_ALERTS.WORKFLOW_STATUS,
        render: (status: string) => <EuiText size="s">{capitalize(status)}</EuiText>,
        name: i18n.translate(
          'xpack.securitySolution.flyout.left.insights.alerts.table.statusColumnName',
          {
            defaultMessage: 'Status',
          }
        ),
        width: '20%',
        sortable: true,
      },
    ];

    const openAlertsPageWithFilters = useNavigateToAlertsPageWithFilters();

    const openAlertsInAlertsPage = useCallback(
      () =>
        openAlertsPageWithFilters(
          [
            {
              title:
                field === 'host.name'
                  ? OPEN_IN_ALERTS_TITLE_HOSTNAME
                  : OPEN_IN_ALERTS_TITLE_USERNAME,
              selectedOptions: [value],
              fieldName: field,
            },
            {
              title: OPEN_IN_ALERTS_TITLE_STATUS,
              selectedOptions: [FILTER_OPEN, FILTER_ACKNOWLEDGED],
              fieldName: 'kibana.alert.workflow_status',
            },
          ],
          true,
          timerange
        ),
      [field, openAlertsPageWithFilters, timerange, value]
    );

    return (
      <>
        <EuiPanel hasShadow={false}>
          <EuiLink onClick={() => openAlertsInAlertsPage()}>
            <h1 data-test-subj={'securitySolutionFlyoutInsightsAlertsCount'}>
              {i18n.translate('xpack.securitySolution.flyout.left.insights.alerts.tableTitle', {
                defaultMessage: 'Alerts ',
              })}
              <EuiIcon type={'popout'} />
            </h1>
          </EuiLink>

          <EuiSpacer size="xl" />
          <DistributionBar stats={alertStats.reverse()} />
          <EuiSpacer size="l" />
          <EuiBasicTable
            items={pageOfItems || []}
            rowHeader="result"
            columns={columns}
            pagination={pagination}
            onChange={onTableChange}
            data-test-subj={'securitySolutionFlyoutMisconfigurationFindingsTable'}
            sorting={sorting}
          />
        </EuiPanel>
      </>
    );
  }
);

AlertsDetailsTable.displayName = 'AlertsDetailsTable';
