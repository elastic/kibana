/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import type { TimelineItem } from '@kbn/timelines-plugin/common';
import type { DataTableRecord, EsHitRecord, RowControlColumn } from '@kbn/discover-utils';
import { buildDataTableRecord } from '@kbn/discover-utils';
import { useLicense } from '../../../../../common/hooks/use_license';
import { getDefaultControlColumn } from '../../body/control_columns';
import { TimelineControlColumnCellRender } from '../../unified_components/data_table/control_column_cell_render';
import { useUserPrivileges } from '../../../../../common/components/user_privileges';

interface UseTimelineControlColumnArgs {
  timelineId: string;
  refetch: () => void;
  events: TimelineItem[];
  rawEvents: EsHitRecord[];
  eventIdToNoteIds: Record<string, string[]>;
  onToggleShowNotes: (eventId?: string, eventData?: DataTableRecord & TimelineItem) => void;
}

export const useTimelineControlColumn = ({
  timelineId,
  refetch,
  events,
  rawEvents,
  eventIdToNoteIds,
  onToggleShowNotes,
}: UseTimelineControlColumnArgs): RowControlColumn[] => {
  const isEnterprisePlus = useLicense().isEnterprise();
  const ACTION_BUTTON_COUNT = useMemo(() => (isEnterprisePlus ? 5 : 4), [isEnterprisePlus]);
  const {
    notesPrivileges: { read: canReadNotes },
    timelinePrivileges: { crud: canWriteTimelines },
  } = useUserPrivileges();

  return useMemo<RowControlColumn[]>(() => {
    const [{ id, width }] = getDefaultControlColumn(ACTION_BUTTON_COUNT);
    return [
      {
        id,
        width,
        render: (_Control, { rowIndex }) => {
          /*
           * In some cases, when number of events is updated
           * but new table is not yet rendered it can result
           * in the mismatch between the number of events v/s
           * the number of rows in the table currently rendered.
           *
           * */
          if (rowIndex >= events.length || rowIndex >= rawEvents.length) return <></>;

          // We are creating this object here so we can pass it to the cell action, which will then pass it to the flyout.
          // This way we can use the same flyout content code between Security Solution and Discover.
          const esHitRecord: DataTableRecord = buildDataTableRecord(rawEvents[rowIndex]);
          const eventData: DataTableRecord & TimelineItem = {
            ...esHitRecord,
            ...events[rowIndex],
          };

          return (
            <TimelineControlColumnCellRender
              ariaRowindex={rowIndex}
              columnValues=""
              disablePinAction={!canWriteTimelines}
              ecsData={events[rowIndex].ecs}
              eventData={eventData}
              eventId={events[rowIndex]?._id}
              eventIdToNoteIds={eventIdToNoteIds}
              hit={esHitRecord}
              refetch={refetch}
              showNotes={canReadNotes}
              timelineId={timelineId}
              toggleShowNotes={onToggleShowNotes}
            />
          );
        },
      },
    ];
  }, [
    ACTION_BUTTON_COUNT,
    canReadNotes,
    canWriteTimelines,
    eventIdToNoteIds,
    events,
    onToggleShowNotes,
    rawEvents,
    refetch,
    timelineId,
  ]);
};
