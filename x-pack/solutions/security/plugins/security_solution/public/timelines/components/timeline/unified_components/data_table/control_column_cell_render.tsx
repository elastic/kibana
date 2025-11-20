/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import type { ActionProps } from '../../../../../../common/types';
import { Actions } from '../../../../../common/components/header_actions';

const noOp = () => {};

type TimelineControlColumnCellRenderProps = Pick<
  ActionProps,
  | 'ariaRowindex'
  | 'columnValues'
  | 'disablePinAction'
  | 'ecsData'
  | 'eventId'
  | 'eventIdToNoteIds'
  | 'pinnedEventIds'
  | 'refetch'
  | 'showNotes'
  | 'timelineId'
  | 'toggleShowNotes'
>;

export const TimelineControlColumnCellRender = memo(function TimelineControlColumnCellRender(
  props: TimelineControlColumnCellRenderProps
) {
  return (
    <Actions
      ariaRowindex={props.ariaRowindex}
      columnValues={props.columnValues}
      disableExpandAction
      disablePinAction={props.disablePinAction}
      disableTimelineAction={false}
      ecsData={props.ecsData}
      eventId={props.eventId}
      eventIdToNoteIds={props.eventIdToNoteIds}
      isEventViewer={false}
      isEventPinned={props.pinnedEventIds?.[props.eventId]}
      onEventDetailsPanelOpened={noOp}
      onRuleChange={noOp}
      refetch={props.refetch}
      showNotes={props.showNotes}
      timelineId={props.timelineId}
      toggleShowNotes={props.toggleShowNotes}
    />
  );
});
