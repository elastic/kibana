/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useMemo, useCallback } from 'react';
import { EuiHorizontalRule, EuiTextTruncate, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import type { PopoverActions, PopoverState } from '../graph/use_graph_popover';
import { useGraphPopover } from '../graph/use_graph_popover';
import { GraphPopover } from '../graph/graph_popover';
import { LabelNodePopoverContent } from '../node/label_node/label_node_popover';
import type { DocumentAnalysisOutput } from '../node/label_node/analyze_documents';
import { GRAPH_EVENTS_POPOVER_ID } from '../test_ids';

export interface UseEventDetailsPopoverReturn {
  /**
   * The ID of the popover.
   */
  id: string;

  /**
   * Handler to open the popover when the button is clicked.
   */
  onEventClick: (e: React.MouseEvent<HTMLButtonElement>) => void;

  /**
   * The component that renders the popover.
   */
  PopoverComponent: React.FC;

  /**
   * The popover actions and state.
   */
  actions: PopoverActions;

  /**
   * The popover state.
   */
  state: PopoverState;
}

export const useEventDetailsPopover = (
  analysis: DocumentAnalysisOutput | null,
  text: string
): UseEventDetailsPopoverReturn => {
  const { id, state, actions } = useGraphPopover('events-popover');
  const { euiTheme } = useEuiTheme();

  // eslint-disable-next-line react/display-name
  const PopoverComponent = memo(() => (
    <GraphPopover
      anchorPosition="upCenter"
      panelPaddingSize="m"
      isOpen={state.isOpen}
      anchorElement={state.anchorElement}
      closePopover={actions.closePopover}
      data-test-subj={GRAPH_EVENTS_POPOVER_ID}
    >
      {text && (
        <>
          <EuiTextTruncate
            css={css`
              font-weight: ${euiTheme.font.weight.bold};
            `}
            truncation="end"
            text={text}
          />
          <EuiHorizontalRule
            margin="m"
            size="full"
            css={css`
              width: calc(100% + ${euiTheme.size.xl});
              margin-left: -${euiTheme.size.base};
            `}
          />
        </>
      )}
      {analysis && <LabelNodePopoverContent analysis={analysis} />}
    </GraphPopover>
  ));

  const onEventClick = useCallback(
    (e: React.MouseEvent<HTMLButtonElement>) => actions.openPopover(e.currentTarget),
    [actions]
  );

  return useMemo(
    () => ({
      id,
      onEventClick,
      PopoverComponent,
      actions,
      state,
    }),
    [PopoverComponent, actions, id, state, onEventClick]
  );
};
