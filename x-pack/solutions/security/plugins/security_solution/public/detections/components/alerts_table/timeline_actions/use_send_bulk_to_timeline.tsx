/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TimelineItem } from '@kbn/timelines-plugin/common';
import { useCallback, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import type { TableId } from '@kbn/securitysolution-data-table';
import {
  dataTableActions,
  dataTableSelectors,
  tableDefaults,
} from '@kbn/securitysolution-data-table';
import type { State } from '../../../../common/store/types';
import { useUpdateTimeline } from '../../../../timelines/components/open_timeline/use_update_timeline';
import { useCreateTimeline } from '../../../../timelines/hooks/use_create_timeline';
import { TimelineId } from '../../../../../common/types/timeline';
import { TimelineTypeEnum } from '../../../../../common/api/timeline';
import { sendBulkEventsToTimelineAction } from '../actions';
import type { CreateTimelineProps } from '../types';

const { setSelected } = dataTableActions;

export interface UseSendBulkToTimelineProps {
  tableId: TableId;
  from: string;
  to: string;
}

/**
 * Hook that provides a handler to send bulk events to the timeline.
 * This can be used independently from the bulk actions table infrastructure.
 */
export const useSendBulkToTimeline = ({ tableId, from, to }: UseSendBulkToTimelineProps) => {
  const dispatch = useDispatch();

  const selectTableById = useMemo(() => dataTableSelectors.createTableSelector(tableId), [tableId]);
  const { selectedEventIds } = useSelector(
    (state: State) => selectTableById(state) ?? tableDefaults
  );

  const clearActiveTimeline = useCreateTimeline({
    timelineId: TimelineId.active,
    timelineType: TimelineTypeEnum.default,
  });

  const updateTimeline = useUpdateTimeline();

  const createTimeline = useCallback(
    async ({ timeline, ruleNote, timeline: { filters: eventIdFilters } }: CreateTimelineProps) => {
      await clearActiveTimeline();
      updateTimeline({
        duplicate: true,
        from,
        id: TimelineId.active,
        notes: [],
        timeline: {
          ...timeline,
          indexNames: timeline.indexNames ?? [],
          show: true,
          filters: eventIdFilters,
        },
        to,
        ruleNote,
      });
    },
    [updateTimeline, clearActiveTimeline, from, to]
  );

  const sendBulkEventsToTimelineHandler = useCallback(
    (items: TimelineItem[]) => {
      sendBulkEventsToTimelineAction(
        createTimeline,
        items.map((item) => item.ecs),
        'KqlFilter'
      );

      dispatch(
        setSelected({
          id: tableId,
          isSelectAllChecked: false,
          isSelected: false,
          eventIds: selectedEventIds,
        })
      );
    },
    [dispatch, createTimeline, selectedEventIds, tableId]
  );

  return { sendBulkEventsToTimelineHandler };
};
