/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiNotificationBadge, EuiToolTip } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { SLOWithSummaryResponse } from '@kbn/slo-schema';
import React from 'react';
import { paths } from '../../../../common/locators/paths';
import { useFetchActiveAlerts } from '../../../hooks/use_fetch_active_alerts';
import { useKibana } from '../../../hooks/use_kibana';
import {
  ALERTS_TAB_ID,
  HISTORY_TAB_ID,
  OVERVIEW_TAB_ID,
  SloTabId,
} from '../components/slo_details';

export const useSloDetailsTabs = ({
  slo,
  isAutoRefreshing,
  selectedTabId,
  setSelectedTabId,
}: {
  slo?: SLOWithSummaryResponse | null;
  isAutoRefreshing: boolean;
  selectedTabId: SloTabId;
  setSelectedTabId?: (val: SloTabId) => void;
}) => {
  const { data: activeAlerts } = useFetchActiveAlerts({
    sloIdsAndInstanceIds: slo ? [[slo.id, slo.instanceId]] : [],
    shouldRefetch: isAutoRefreshing,
  });

  const { basePath } = useKibana().services.http;

  const isRemote = !!slo?.remote;

  const tabs = [
    {
      id: OVERVIEW_TAB_ID,
      label: i18n.translate('xpack.slo.sloDetails.tab.overviewLabel', {
        defaultMessage: 'Overview',
      }),
      'data-test-subj': 'overviewTab',
      isSelected: selectedTabId === OVERVIEW_TAB_ID,
      ...(setSelectedTabId
        ? {
            onClick: () => setSelectedTabId(OVERVIEW_TAB_ID),
          }
        : {
            href: slo
              ? `${basePath.get()}${paths.sloDetails(
                  slo.id,
                  slo.instanceId,
                  slo.remote?.remoteName,
                  OVERVIEW_TAB_ID
                )}`
              : undefined,
          }),
    },
    ...(slo?.timeWindow.type === 'rolling'
      ? [
          {
            id: HISTORY_TAB_ID,
            label: i18n.translate('xpack.slo.sloDetails.tab.historyLabel', {
              defaultMessage: 'History',
            }),
            'data-test-subj': 'historyTab',
            isSelected: selectedTabId === HISTORY_TAB_ID,
            ...(setSelectedTabId
              ? {
                  onClick: () => setSelectedTabId(HISTORY_TAB_ID),
                }
              : {
                  href: slo
                    ? `${basePath.get()}${paths.sloDetails(
                        slo.id,
                        slo.instanceId,
                        slo.remote?.remoteName,
                        HISTORY_TAB_ID
                      )}`
                    : undefined,
                }),
          },
        ]
      : []),
    {
      id: ALERTS_TAB_ID,
      label: isRemote ? (
        <EuiToolTip
          content={i18n.translate('xpack.slo.sloDetails.tab.alertsDisabledTooltip', {
            defaultMessage: 'Alerts are not available for remote SLOs',
          })}
          position="right"
        >
          <>{ALERTS_LABEL}</>
        </EuiToolTip>
      ) : (
        ALERTS_LABEL
      ),
      'data-test-subj': 'alertsTab',
      disabled: Boolean(isRemote),
      isSelected: selectedTabId === ALERTS_TAB_ID,
      append:
        slo && !isRemote ? (
          <EuiNotificationBadge className="eui-alignCenter" size="m">
            {(activeAlerts && activeAlerts.get(slo)) ?? 0}
          </EuiNotificationBadge>
        ) : null,
      ...(setSelectedTabId
        ? {
            onClick: () => setSelectedTabId(ALERTS_TAB_ID),
          }
        : {
            href: slo
              ? `${basePath.get()}${paths.sloDetails(
                  slo.id,
                  slo.instanceId,
                  slo.remote?.remoteName,
                  ALERTS_TAB_ID
                )}`
              : undefined,
          }),
    },
  ];

  return { tabs };
};

const ALERTS_LABEL = i18n.translate('xpack.slo.sloDetails.tab.alertsLabel', {
  defaultMessage: 'Alerts',
});
