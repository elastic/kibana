/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useMemo } from 'react';
import { eventIsPinned } from '../../body/helpers';
import { Actions } from '../../../../../common/components/header_actions';
import type { TimelineModel } from '../../../../store/model';
import type { ActionProps } from '../../../../../../common/types';

const noOp = () => {};
export interface UnifiedActionProps extends ActionProps {
  pinnedEventIds: TimelineModel['pinnedEventIds'];
}

export const TimelineControlColumnCellRender = memo(function TimelineControlColumnCellRender(
  props: UnifiedActionProps
) {
  const { rowIndex, pinnedEventIds } = props;

  const isPinned = useMemo(
    () => eventIsPinned({ eventId: props.eventId, pinnedEventIds }),
    [props.eventId, pinnedEventIds]
  );
  return (
    <Actions
      action={props.action}
      columnId={props.columnId}
      columnValues="columnValues"
      data={props.data}
      ecsData={props.ecsData}
      eventId={props.eventId}
      eventIdToNoteIds={props.eventIdToNoteIds}
      index={rowIndex}
      isEventPinned={isPinned}
      isEventViewer={false}
      refetch={props.refetch}
      rowIndex={rowIndex}
      setEventsDeleted={noOp}
      setEventsLoading={noOp}
      onEventDetailsPanelOpened={noOp}
      onRowSelected={noOp}
      onRuleChange={noOp}
      showCheckboxes={false}
      showNotes={true}
      timelineId={props.timelineId}
      ariaRowindex={rowIndex}
      checked={false}
      loadingEventIds={props.loadingEventIds}
      toggleShowNotes={props.toggleShowNotes}
      disableExpandAction
      disablePinAction={false}
    />
  );
});
