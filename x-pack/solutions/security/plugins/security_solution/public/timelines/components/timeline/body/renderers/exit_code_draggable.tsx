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
  endgameExitCode: string | null | undefined;
  eventId: string;
  processExitCode: number | null | undefined;
  text: string | null | undefined;
}

export const ExitCodeDraggable = React.memo<Props>(
  ({ contextId, endgameExitCode, eventId, processExitCode, text }) => {
    if (isNillEmptyOrNotFinite(processExitCode) && isNillEmptyOrNotFinite(endgameExitCode)) {
      return null;
    }

    return (
      <>
        {!isNillEmptyOrNotFinite(text) && (
          <TokensFlexItem data-test-subj="exit-code-draggable-text" grow={false} component="span">
            {text}
          </TokensFlexItem>
        )}

        {!isNillEmptyOrNotFinite(processExitCode) && (
          <TokensFlexItem grow={false} component="span">
            <DraggableBadge
              contextId={contextId}
              eventId={eventId}
              field="process.exit_code"
              value={`${processExitCode}`}
              fieldType="number"
              isAggregatable={true}
            />
          </TokensFlexItem>
        )}

        {!isNillEmptyOrNotFinite(endgameExitCode) && (
          <TokensFlexItem grow={false} component="span">
            <DraggableBadge
              contextId={contextId}
              eventId={eventId}
              field="endgame.exit_code"
              value={endgameExitCode}
              fieldType="number"
              isAggregatable={true}
            />
          </TokensFlexItem>
        )}
      </>
    );
  }
);

ExitCodeDraggable.displayName = 'ExitCodeDraggable';
