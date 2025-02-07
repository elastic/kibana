/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { noop } from 'lodash/fp';
import {
  EuiFlexGroup,
  EuiFocusTrap,
  EuiOutsideClickDetector,
  EuiScreenReaderOnly,
  EuiFlexItem,
} from '@elastic/eui';
import React, { useMemo } from 'react';

import {
  ARIA_COLINDEX_ATTRIBUTE,
  ARIA_ROWINDEX_ATTRIBUTE,
  getRowRendererClassName,
} from '@kbn/timelines-plugin/public';
import type { RowRenderer } from '../../../../../../../common/types';
import type { TimelineItem } from '../../../../../../../common/search_strategy/timeline';
import { useStatefulEventFocus } from '../use_stateful_event_focus';

import * as i18n from '../translations';
import { useStatefulRowRenderer } from './use_stateful_row_renderer';

/**
 * This component addresses the accessibility of row renderers.
 *
 * accessibility details:
 * - This component has a 'dialog' `role` because it's rendered as a dialog
 *   "outside" the current row for screen readers, similar to a popover
 * - It has tabIndex="0" to allow for keyboard focus
 * - It traps keyboard focus when a user clicks inside a row renderer, to
 *   allow for tabbing through the contents of row renderers
 * - The "dialog" can be dismissed via the up arrow key, down arrow key,
 *   which focuses the current or next row, respectively.
 * - A screen-reader-only message provides additional context and instruction
 */
export const StatefulRowRenderer = React.memo(
  ({
    ariaRowindex,
    containerRef,
    event,
    lastFocusedAriaColindex,
    rowRenderers,
    timelineId,
  }: {
    ariaRowindex: number;
    containerRef: React.MutableRefObject<HTMLDivElement | null>;
    event: TimelineItem;
    lastFocusedAriaColindex: number;
    rowRenderers: RowRenderer[];
    timelineId: string;
  }) => {
    const { focusOwnership, onFocus, onKeyDown, onOutsideClick } = useStatefulEventFocus({
      ariaRowindex,
      colindexAttribute: ARIA_COLINDEX_ATTRIBUTE,
      containerRef,
      lastFocusedAriaColindex,
      onColumnFocused: noop,
      rowindexAttribute: ARIA_ROWINDEX_ATTRIBUTE,
    });

    const { rowRenderer } = useStatefulRowRenderer({
      data: event.ecs,
      rowRenderers,
    });

    const row = useMemo(() => {
      const result = rowRenderer?.renderRow({
        data: event.ecs,
        scopeId: timelineId,
      });
      return result;
    }, [rowRenderer, event.ecs, timelineId]);

    const content = useMemo(
      () =>
        rowRenderer && (
          // eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions
          <div className={getRowRendererClassName(ariaRowindex)} role="dialog" onFocus={onFocus}>
            <EuiOutsideClickDetector onOutsideClick={onOutsideClick}>
              <EuiFocusTrap clickOutsideDisables={true} disabled={focusOwnership !== 'owned'}>
                <EuiScreenReaderOnly data-test-subj="eventRendererScreenReaderOnly">
                  <p>{i18n.YOU_ARE_IN_AN_EVENT_RENDERER(ariaRowindex)}</p>
                </EuiScreenReaderOnly>
                <EuiFlexGroup direction="column" onKeyDown={onKeyDown}>
                  <EuiFlexItem grow={true}>{row}</EuiFlexItem>
                </EuiFlexGroup>
              </EuiFocusTrap>
            </EuiOutsideClickDetector>
          </div>
        ),
      [ariaRowindex, focusOwnership, onFocus, onKeyDown, onOutsideClick, rowRenderer, row]
    );

    return content;
  }
);

StatefulRowRenderer.displayName = 'StatefulRowRenderer';
