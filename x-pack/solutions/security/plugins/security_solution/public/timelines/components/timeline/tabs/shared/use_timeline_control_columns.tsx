/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useMemo } from 'react';
import { useEuiTheme, type EuiDataGridCellValueElementProps } from '@elastic/eui';
import type { TimelineItem } from '@kbn/timelines-plugin/common';
import { JEST_ENVIRONMENT } from '../../../../../../common/constants';
import { useLicense } from '../../../../../common/hooks/use_license';
import { getDefaultControlColumn } from '../../body/control_columns';
import { TimelineControlColumnCellRender } from '../../unified_components/data_table/control_column_cell_render';
import type { UnifiedTimelineDataGridCellContext } from '../../types';
import { useTimelineUnifiedDataTableContext } from '../../unified_components/data_table/use_timeline_unified_data_table_context';
import { useUserPrivileges } from '../../../../../common/components/user_privileges';

interface UseTimelineControlColumnArgs {
  timelineId: string;
  refetch: () => void;
  events: TimelineItem[];
  pinnedEventIds: Record<string, boolean>;
  eventIdToNoteIds: Record<string, string[]>;
  onToggleShowNotes: (eventId?: string) => void;
}

const EMPTY_STRING_ARRAY: string[] = [];

const noOp = () => {};
export const useTimelineControlColumn = ({
  timelineId,
  refetch,
  events,
  pinnedEventIds,
  eventIdToNoteIds,
  onToggleShowNotes,
}: UseTimelineControlColumnArgs) => {
  const { euiTheme } = useEuiTheme();
  const { highlight: highlightColor } = euiTheme.colors;
  const isEnterprisePlus = useLicense().isEnterprise();
  const ACTION_BUTTON_COUNT = useMemo(() => (isEnterprisePlus ? 5 : 4), [isEnterprisePlus]);
  const {
    notesPrivileges: { read: canReadNotes },
    timelinePrivileges: { crud: canWriteTimelines },
  } = useUserPrivileges();

  const RowCellRender = useMemo(
    () =>
      function TimelineControlColumnCellRenderer(
        props: EuiDataGridCellValueElementProps & UnifiedTimelineDataGridCellContext
      ) {
        const ctx = useTimelineUnifiedDataTableContext();

        useEffect(() => {
          props.setCellProps({
            className:
              ctx.expanded?.id === events[props.rowIndex]?._id
                ? 'unifiedDataTable__cell--expanded'
                : '',
            css: { backgroundColor: highlightColor },
          });
        });

        /*
         * In some cases, when number of events is updated
         * but new table is not yet rendered it can result
         * in the mismatch between the number of events v/s
         * the number of rows in the table currently rendered.
         *
         * */
        if ('rowIndex' in props && props.rowIndex >= events.length) return <></>;
        return (
          <TimelineControlColumnCellRender
            rowIndex={props.rowIndex}
            columnId={props.columnId}
            timelineId={timelineId}
            ariaRowindex={props.rowIndex}
            checked={false}
            columnValues=""
            data={events[props.rowIndex].data}
            ecsData={events[props.rowIndex].ecs}
            loadingEventIds={EMPTY_STRING_ARRAY}
            eventId={events[props.rowIndex]?._id}
            index={props.rowIndex}
            onEventDetailsPanelOpened={noOp}
            onRowSelected={noOp}
            refetch={refetch}
            showCheckboxes={false}
            setEventsLoading={noOp}
            setEventsDeleted={noOp}
            pinnedEventIds={pinnedEventIds}
            eventIdToNoteIds={eventIdToNoteIds}
            toggleShowNotes={onToggleShowNotes}
            showNotes={canReadNotes}
            disablePinAction={!canWriteTimelines}
          />
        );
      },
    [
      events,
      timelineId,
      refetch,
      pinnedEventIds,
      eventIdToNoteIds,
      onToggleShowNotes,
      canReadNotes,
      canWriteTimelines,
      highlightColor,
    ]
  );

  return useMemo(() => {
    return getDefaultControlColumn(ACTION_BUTTON_COUNT).map((x) => ({
      ...x,
      rowCellRender: JEST_ENVIRONMENT ? RowCellRender : React.memo(RowCellRender),
    }));
  }, [ACTION_BUTTON_COUNT, RowCellRender]);
};
