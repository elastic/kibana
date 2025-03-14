/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { BulkActionsConfig } from '@kbn/response-ops-alerts-table/types';
import { useCallback, useMemo } from 'react';
import type { Filter } from '@kbn/es-query';
import { buildEsQuery } from '@kbn/es-query';
import type { TableId } from '@kbn/securitysolution-data-table';
import type { SourcererScopeName } from '../../../sourcerer/store/model';
import { APM_USER_INTERACTIONS } from '../../../common/lib/apm/constants';
import { updateAlertStatus } from '../../../common/components/toolbar/bulk_actions/update_alerts';
import { useAppToasts } from '../../../common/hooks/use_app_toasts';
import { useStartTransaction } from '../../../common/lib/apm/use_start_transaction';
import type { AlertWorkflowStatus } from '../../../common/types';
import { FILTER_CLOSED, FILTER_OPEN, FILTER_ACKNOWLEDGED } from '../../../../common/types';
import * as i18n from '../translations';
import { buildTimeRangeFilter } from '../../components/alerts_table/helpers';
import { useAlertsPrivileges } from '../../containers/detection_engine/alerts/use_alerts_privileges';

interface UseBulkAlertActionItemsArgs {
  /* Table ID for which this hook is being used */
  tableId: TableId;
  /* start time being passed to the Events Table */
  from: string;
  /* End Time of the table being passed to the Events Table */
  to: string;
  /* Sourcerer Scope Id*/
  scopeId: SourcererScopeName;
  /* filter of the Alerts Query*/
  filters: Filter[];
  refetch?: () => void;
}

export const useBulkAlertActionItems = ({
  scopeId,
  filters,
  from,
  to,
  refetch: refetchProp,
}: UseBulkAlertActionItemsArgs) => {
  const { hasIndexWrite } = useAlertsPrivileges();
  const { startTransaction } = useStartTransaction();

  const { addSuccess, addError, addWarning } = useAppToasts();

  const onAlertStatusUpdateSuccess = useCallback(
    (updated: number, conflicts: number, newStatus: AlertWorkflowStatus) => {
      if (conflicts > 0) {
        // Partial failure
        addWarning({
          title: i18n.UPDATE_ALERT_STATUS_FAILED(conflicts),
          text: i18n.UPDATE_ALERT_STATUS_FAILED_DETAILED(updated, conflicts),
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
    },
    [addSuccess, addWarning]
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
    },
    [addError]
  );

  const getOnAction = useCallback(
    (status: AlertWorkflowStatus) => {
      const onActionClick: BulkActionsConfig['onClick'] = async (
        items,
        isSelectAllChecked,
        setAlertLoading,
        clearSelection,
        refresh
      ) => {
        try {
          let ids: string[] | undefined = items.map((item) => item._id);
          let query: Record<string, unknown> | undefined;

          if (isSelectAllChecked) {
            const timeFilter = buildTimeRangeFilter(from, to);
            query = buildEsQuery(undefined, [], [...timeFilter, ...filters], undefined);
            ids = undefined;
            startTransaction({ name: APM_USER_INTERACTIONS.BULK_QUERY_STATUS_UPDATE });
          } else if (items.length > 1) {
            startTransaction({ name: APM_USER_INTERACTIONS.BULK_STATUS_UPDATE });
          } else {
            startTransaction({ name: APM_USER_INTERACTIONS.STATUS_UPDATE });
          }

          setAlertLoading(true);
          const response = await updateAlertStatus({
            status,
            query,
            signalIds: ids,
          });

          setAlertLoading(false);
          if (refetchProp) refetchProp();
          refresh();
          clearSelection();

          if (response.version_conflicts && items.length === 1) {
            throw new Error(i18n.BULK_ACTION_FAILED_SINGLE_ALERT);
          }

          onAlertStatusUpdateSuccess(
            response.updated ?? 0,
            response.version_conflicts ?? 0,
            status
          );
        } catch (error) {
          onAlertStatusUpdateFailure(status, error);
        }
      };

      return onActionClick;
    },
    [
      onAlertStatusUpdateFailure,
      onAlertStatusUpdateSuccess,
      startTransaction,
      filters,
      from,
      to,
      refetchProp,
    ]
  );

  const getUpdateAlertStatusAction = useCallback(
    (status: AlertWorkflowStatus) => {
      const label =
        status === FILTER_OPEN
          ? i18n.BULK_ACTION_OPEN_SELECTED
          : status === FILTER_CLOSED
          ? i18n.BULK_ACTION_CLOSE_SELECTED
          : i18n.BULK_ACTION_ACKNOWLEDGED_SELECTED;

      return {
        label,
        key: `${status}-alert-status`,
        'data-test-subj': `${status}-alert-status`,
        disableOnQuery: false,
        onClick: getOnAction(status),
      };
    },
    [getOnAction]
  );

  return useMemo(() => {
    return hasIndexWrite
      ? [FILTER_OPEN, FILTER_CLOSED, FILTER_ACKNOWLEDGED].map((status) => {
          return getUpdateAlertStatusAction(status as AlertWorkflowStatus);
        })
      : [];
  }, [getUpdateAlertStatusAction, hasIndexWrite]);
};
