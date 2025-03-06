/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo } from 'react';
import { EuiContextMenuItem } from '@elastic/eui';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import type { Status } from '../../../../../common/api/detection_engine';
import type { inputsModel } from '../../../../common/store';
import { inputsSelectors } from '../../../../common/store';
import { useStartTransaction } from '../../../../common/lib/apm/use_start_transaction';
import { useAppToasts } from '../../../../common/hooks/use_app_toasts';
import type { AlertWorkflowStatus } from '../../../../common/types';
import { APM_USER_INTERACTIONS } from '../../../../common/lib/apm/constants';
import { updateAlertStatus } from '../../../../common/components/toolbar/bulk_actions/update_alerts';
import {
  BULK_ACTION_ACKNOWLEDGED_SELECTED,
  BULK_ACTION_CLOSE_SELECTED,
  BULK_ACTION_OPEN_SELECTED,
} from '../../../../common/components/toolbar/bulk_actions/translations';
import {
  UPDATE_ALERT_STATUS_FAILED,
  UPDATE_ALERT_STATUS_FAILED_DETAILED,
} from '../../../../common/translations';
import { FILTER_ACKNOWLEDGED, FILTER_CLOSED, FILTER_OPEN } from '../../../../../common/types';
import { useDeepEqualSelector } from '../../../../common/hooks/use_selector';
import * as i18n from '../translations';
import { AlertsEventTypes, METRIC_TYPE, track } from '../../../../common/lib/telemetry';
import type { StartServices } from '../../../../types';

export interface TakeActionsProps {
  currentStatus?: Status[];
  showAlertStatusActions?: boolean;
}

const getTelemetryEvent = {
  groupedAlertsTakeAction: ({
    tableId,
    groupNumber,
    status,
  }: {
    tableId: string;
    groupNumber: number;
    status: AlertWorkflowStatus;
  }) => `alerts_table_${tableId}_group-${groupNumber}_mark-${status}`,
};

const STATUS_ACTIONS = {
  [FILTER_OPEN]: BULK_ACTION_OPEN_SELECTED,
  [FILTER_ACKNOWLEDGED]: BULK_ACTION_ACKNOWLEDGED_SELECTED,
  [FILTER_CLOSED]: BULK_ACTION_CLOSE_SELECTED,
} as const;

const StatusMenuItem = React.memo(
  ({ status, onClick, label }: { status: string; onClick: () => void; label: string }) => (
    <EuiContextMenuItem key={status} data-test-subj={`${status}-alert-status`} onClick={onClick}>
      {label}
    </EuiContextMenuItem>
  )
);

StatusMenuItem.displayName = 'StatusMenuItem';

export const useGroupTakeActionsItems = ({
  currentStatus,
  showAlertStatusActions = true,
}: TakeActionsProps) => {
  const { addSuccess, addError, addWarning } = useAppToasts();
  const { startTransaction } = useStartTransaction();
  const getGlobalQuerySelector = useMemo(() => inputsSelectors.globalQuery(), []);
  const globalQueries = useDeepEqualSelector(getGlobalQuerySelector);
  const refetchQuery = useCallback(() => {
    globalQueries.forEach((q) => q.refetch && (q.refetch as inputsModel.Refetch)());
  }, [globalQueries]);
  const {
    services: { telemetry },
  } = useKibana<StartServices>();

  const reportAlertsGroupingTakeActionClick = useCallback(
    (params: {
      tableId: string;
      groupNumber: number;
      status: 'open' | 'closed' | 'acknowledged';
      groupByField: string;
    }) => {
      telemetry.reportEvent(AlertsEventTypes.AlertsGroupingTakeAction, params);
    },
    [telemetry]
  );

  const onUpdateSuccess = useCallback(
    (updated: number, conflicts: number, newStatus: AlertWorkflowStatus) => {
      refetchQuery();
    },
    [refetchQuery]
  );

  const onUpdateFailure = useCallback(
    (newStatus: AlertWorkflowStatus, error: Error) => {
      refetchQuery();
    },
    [refetchQuery]
  );

  const onAlertStatusUpdateSuccess = useCallback(
    (updated: number, conflicts: number, newStatus: AlertWorkflowStatus) => {
      if (conflicts > 0) {
        // Partial failure
        addWarning({
          title: UPDATE_ALERT_STATUS_FAILED(conflicts),
          text: UPDATE_ALERT_STATUS_FAILED_DETAILED(updated, conflicts),
        });
      } else {
        let title: string;
        switch (newStatus) {
          case 'closed':
            title = i18n.CLOSED_ALERT_SUCCESS_TOAST(updated);
            break;
          case 'open':
            title = i18n.OPENED_ALERT_SUCCESS_TOAST(updated);
            break;
          case 'acknowledged':
            title = i18n.ACKNOWLEDGED_ALERT_SUCCESS_TOAST(updated);
        }
        addSuccess({ title });
      }
      if (onUpdateSuccess) {
        onUpdateSuccess(updated, conflicts, newStatus);
      }
    },
    [addSuccess, addWarning, onUpdateSuccess]
  );

  const onAlertStatusUpdateFailure = useCallback(
    (newStatus: AlertWorkflowStatus, error: Error) => {
      let title: string;
      switch (newStatus) {
        case 'closed':
          title = i18n.CLOSED_ALERT_FAILED_TOAST;
          break;
        case 'open':
          title = i18n.OPENED_ALERT_FAILED_TOAST;
          break;
        case 'acknowledged':
          title = i18n.ACKNOWLEDGED_ALERT_FAILED_TOAST;
      }
      addError(error.message, { title });
      if (onUpdateFailure) {
        onUpdateFailure(newStatus, error);
      }
    },
    [addError, onUpdateFailure]
  );

  const onClickUpdate = useCallback(
    async ({
      groupNumber,
      query,
      status,
      tableId,
      selectedGroup,
    }: {
      groupNumber: number;
      query?: string;
      status: AlertWorkflowStatus;
      tableId: string;
      selectedGroup: string;
    }) => {
      if (query) {
        startTransaction({ name: APM_USER_INTERACTIONS.BULK_QUERY_STATUS_UPDATE });
      } else {
        startTransaction({ name: APM_USER_INTERACTIONS.STATUS_UPDATE });
      }

      track(
        METRIC_TYPE.CLICK,
        getTelemetryEvent.groupedAlertsTakeAction({ tableId, groupNumber, status })
      );
      reportAlertsGroupingTakeActionClick({
        tableId,
        groupNumber,
        status,
        groupByField: selectedGroup,
      });

      try {
        const response = await updateAlertStatus({
          status,
          query: query ? JSON.parse(query) : {},
        });

        onAlertStatusUpdateSuccess(response.updated ?? 0, response.version_conflicts ?? 0, status);
      } catch (error) {
        onAlertStatusUpdateFailure(status, error);
      }
    },
    [
      startTransaction,
      reportAlertsGroupingTakeActionClick,
      onAlertStatusUpdateSuccess,
      onAlertStatusUpdateFailure,
    ]
  );

  const getActionItems: ({
    query,
    tableId,
    groupNumber,
    selectedGroup,
  }: {
    query?: string | undefined;
    tableId: string;
    groupNumber: number;
    selectedGroup: string;
  }) => React.JSX.Element[] = useCallback(
    ({
      query,
      tableId,
      groupNumber,
      selectedGroup,
    }: {
      query?: string;
      tableId: string;
      groupNumber: number;
      selectedGroup: string;
    }) => {
      if (!showAlertStatusActions) return [];

      if (currentStatus?.length === 1) {
        const singleStatus = currentStatus[0];
        const statusConfig = [
          { status: FILTER_OPEN, show: singleStatus !== FILTER_OPEN },
          { status: FILTER_ACKNOWLEDGED, show: singleStatus !== FILTER_ACKNOWLEDGED },
          { status: FILTER_CLOSED, show: singleStatus !== FILTER_CLOSED },
        ];

        return statusConfig
          .map(({ status, show }) => {
            if (show) {
              return (
                <StatusMenuItem
                  status={status}
                  onClick={() =>
                    onClickUpdate({
                      groupNumber,
                      query,
                      selectedGroup,
                      status: status as AlertWorkflowStatus,
                      tableId,
                    })
                  }
                  label={STATUS_ACTIONS[status]}
                />
              );
            } else {
              return null;
            }
          })
          .filter(Boolean) as React.JSX.Element[];
      }

      return Object.entries(STATUS_ACTIONS).map(([status, label]) => (
        <StatusMenuItem
          status={status}
          onClick={() =>
            onClickUpdate({
              groupNumber,
              query,
              selectedGroup,
              status: status as AlertWorkflowStatus,
              tableId,
            })
          }
          label={label}
        />
      ));
    },
    [currentStatus, onClickUpdate, showAlertStatusActions]
  );

  return useMemo(() => getActionItems, [getActionItems]);
};
