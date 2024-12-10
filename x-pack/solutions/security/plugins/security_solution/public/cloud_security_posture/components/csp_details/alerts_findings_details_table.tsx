/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useCallback, useEffect, useState } from 'react';
import { capitalize } from 'lodash';
import type { Criteria, EuiBasicTableColumn } from '@elastic/eui';
import { EuiSpacer, EuiPanel, EuiText, EuiBasicTable, EuiIcon, EuiLink } from '@elastic/eui';
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

type AlertSeverity = 'low' | 'medium' | 'high' | 'critical';

interface ResultAlertsField {
  _id: string[];
  _index: string[];
  'kibana.alert.rule.uuid': string[];
  'kibana.alert.severity': AlertSeverity[];
  'kibana.alert.rule.name': string[];
  'kibana.alert.workflow_status': string[];
}

interface ContextualFlyoutAlertsField {
  id: string;
  index: string;
  ruleUuid: string;
  ruleName: string;
  severity: AlertSeverity;
  status: string;
}

interface AlertsDetailsFields {
  fields: ResultAlertsField;
}

export const AlertsDetailsTable = memo(
  ({ field, value }: { field: 'host.name' | 'user.name'; value: string }) => {
    useEffect(() => {
      uiMetricService.trackUiMetric(
        METRIC_TYPE.COUNT,
        ENTITY_FLYOUT_EXPAND_MISCONFIGURATION_VIEW_VISITS
      );
    }, []);

    const [currentFilter, setCurrentFilter] = useState<string>('');

    const [pageIndex, setPageIndex] = useState(0);
    const [pageSize, setPageSize] = useState(10);

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
    const { signalIndexName } = useSignalIndex();
    const { data, setQuery } = useQueryAlerts({
      query: buildEntityAlertsQuery(field, to, from, value, 500, ''),
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
      color: getSeverityColor(key),
      filter: () => {
        setCurrentFilter(key);
        setQuery(buildEntityAlertsQuery(field, to, from, value, 500, key));
      },
      isCurrentFilter: currentFilter === key,
      reset: (event: React.MouseEvent<SVGElement, MouseEvent>) => {
        setCurrentFilter('');
        setQuery(buildEntityAlertsQuery(field, to, from, value, 500, ''));
        event?.stopPropagation();
      },
    }));

    const alertDataResults = (data?.hits?.hits as AlertsDetailsFields[])?.map(
      (item: AlertsDetailsFields) => {
        return {
          id: item.fields?._id?.[0],
          index: item.fields?._index?.[0],
          ruleName: item.fields?.['kibana.alert.rule.name']?.[0],
          ruleUuid: item.fields?.['kibana.alert.rule.uuid']?.[0],
          severity: item.fields?.['kibana.alert.severity']?.[0],
          status: item.fields?.['kibana.alert.workflow_status']?.[0],
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

    const onTableChange = ({ page }: Criteria<ContextualFlyoutAlertsField>) => {
      if (page) {
        const { index, size } = page;
        setPageIndex(index);
        setPageSize(size);
      }
    };

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
        field: 'ruleName',
        render: (ruleName: string) => <EuiText size="s">{ruleName}</EuiText>,
        name: i18n.translate(
          'xpack.securitySolution.flyout.left.insights.alerts.table.ruleNameColumnName',
          {
            defaultMessage: 'Rule',
          }
        ),
        width: '55%',
      },
      {
        field: 'severity',
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
      },
      {
        field: 'status',
        render: (status: string) => <EuiText size="s">{capitalize(status)}</EuiText>,
        name: i18n.translate(
          'xpack.securitySolution.flyout.left.insights.alerts.table.statusColumnName',
          {
            defaultMessage: 'Status',
          }
        ),
        width: '20%',
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
          true
        ),
      [field, openAlertsPageWithFilters, value]
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
          />
        </EuiPanel>
      </>
    );
  }
);

AlertsDetailsTable.displayName = 'AlertsDetailsTable';
