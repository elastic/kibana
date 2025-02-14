/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EcsSecurityExtension as Ecs } from '@kbn/securitysolution-ecs';
import React, { memo, useCallback, useContext, useMemo } from 'react';
import { useSelector } from 'react-redux';
import { TableId } from '@kbn/securitysolution-data-table';
import { noop } from 'lodash';
import type { SetEventsLoading } from '../../../../common/types';
import { StatefulEventContext } from '../../../common/components/events_viewer/stateful_event_context';
import { eventsViewerSelector } from '../../../common/components/events_viewer/selectors';
import { useLicense } from '../../../common/hooks/use_license';
import type { TimelineItem } from '../../../../common/search_strategy';
import { getAlertsDefaultModel } from './default_config';
import type { State } from '../../../common/store';
import { RowAction } from '../../../common/components/control_columns/row_action';
import type { GetSecurityAlertsTableProp } from './types';

export const ActionsCellComponent: GetSecurityAlertsTableProp<'renderActionsCell'> = ({
  tableType = TableId.alertsOnAlertsPage,
  rowIndex,
  isDetails,
  isExpanded,
  isExpandable,
  colIndex,
  setCellProps,
  ecsAlert: alert,
  legacyAlert,
  setIsActionLoading,
  refresh: alertsTableRefresh,
  clearSelection,
  leadingControlColumn,
}) => {
  const license = useLicense();
  const {
    dataTable: {
      columns: columnHeaders,
      showCheckboxes,
      selectedEventIds,
      loadingEventIds,
    } = getAlertsDefaultModel(license),
  } = useSelector((state: State) => eventsViewerSelector(state, tableType));
  const eventContext = useContext(StatefulEventContext);

  const timelineItem = useMemo<TimelineItem>(
    () => ({
      _id: (alert as Ecs)._id,
      _index: (alert as Ecs)._index,
      ecs: alert as Ecs,
      data: legacyAlert as TimelineItem['data'],
    }),
    [alert, legacyAlert]
  );

  const setEventsLoading = useCallback<SetEventsLoading>(
    ({ isLoading }) => {
      if (!isLoading) {
        clearSelection();
        return;
      }
      if (setIsActionLoading) setIsActionLoading(isLoading);
    },
    [clearSelection, setIsActionLoading]
  );

  return (
    <RowAction
      columnId={`actions-${rowIndex}`}
      columnHeaders={columnHeaders}
      controlColumn={leadingControlColumn}
      data={timelineItem}
      disabled={false}
      index={rowIndex}
      isDetails={isDetails}
      isExpanded={isExpanded}
      isEventViewer={false}
      isExpandable={isExpandable}
      loadingEventIds={loadingEventIds}
      onRowSelected={() => {}}
      rowIndex={rowIndex}
      colIndex={colIndex}
      pageRowIndex={rowIndex}
      selectedEventIds={selectedEventIds}
      setCellProps={setCellProps}
      showCheckboxes={showCheckboxes}
      onRuleChange={eventContext?.onRuleChange}
      tabType={'query'}
      tableId={tableType}
      width={0}
      setEventsLoading={setEventsLoading}
      setEventsDeleted={noop}
      refetch={alertsTableRefresh}
    />
  );
};

export const ActionsCell = memo(ActionsCellComponent);
