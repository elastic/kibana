/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { DraggableBadge } from '../../../../../common/components/draggables';

import { isNillEmptyOrNotFinite, TokensFlexItem } from './helpers';

interface Props {
  contextId: string;
  endgameParentProcessName: string | null | undefined;
  eventId: string;
  processParentPid: number | null | undefined;
  processParentName: string | null | undefined;
  processPpid: number | undefined | null;
  text: string | null | undefined;
}

export const ParentProcessDraggable = React.memo<Props>(
  ({
    contextId,
    endgameParentProcessName,
    eventId,
    processParentName,
    processParentPid,
    processPpid,
    text,
  }) => {
    if (
      isNillEmptyOrNotFinite(processParentName) &&
      isNillEmptyOrNotFinite(endgameParentProcessName)
    ) {
      return null;
    }

    return (
      <>
        {!isNillEmptyOrNotFinite(text) && (
          <TokensFlexItem
            data-test-subj="parent-process-draggable-text"
            grow={false}
            component="span"
          >
            {text}
          </TokensFlexItem>
        )}

        {!isNillEmptyOrNotFinite(processParentName) && (
          <TokensFlexItem grow={false} component="span">
            <DraggableBadge
              contextId={contextId}
              eventId={eventId}
              field="process.parent.name"
              value={processParentName}
              fieldType="keyword"
              isAggregatable={true}
            />
          </TokensFlexItem>
        )}

        {!isNillEmptyOrNotFinite(endgameParentProcessName) && (
          <TokensFlexItem grow={false} component="span">
            <DraggableBadge
              contextId={contextId}
              eventId={eventId}
              field="endgame.parent_process_name"
              value={endgameParentProcessName}
              fieldType="keyword"
              isAggregatable={true}
            />
          </TokensFlexItem>
        )}

        {!isNillEmptyOrNotFinite(processParentPid) && (
          <TokensFlexItem grow={false} component="span">
            <DraggableBadge
              contextId={contextId}
              eventId={eventId}
              field="process.parent.pid"
              queryValue={String(processParentPid)}
              value={`(${String(processParentPid)})`}
              fieldType="keyword"
              isAggregatable={true}
            />
          </TokensFlexItem>
        )}

        {!isNillEmptyOrNotFinite(processPpid) && (
          <TokensFlexItem grow={false} component="span">
            <DraggableBadge
              contextId={contextId}
              eventId={eventId}
              field="process.ppid"
              queryValue={String(processPpid)}
              value={`(${String(processPpid)})`}
              fieldType="keyword"
              isAggregatable={true}
            />
          </TokensFlexItem>
        )}
      </>
    );
  }
);

ParentProcessDraggable.displayName = 'ParentProcessDraggable';
