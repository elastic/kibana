/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { rgba } from 'polished';
import React, { useCallback } from 'react';
import type { DraggableChildrenFn, DroppableProps } from '@hello-pangea/dnd';
import { Droppable } from '@hello-pangea/dnd';
import { css } from '@emotion/react';
import { useEuiTheme, type UseEuiTheme } from '@elastic/eui';

interface Props {
  children?: React.ReactNode;
  droppableId: string;
  height?: string;
  type?: string;
  render?: ({ isDraggingOver }: { isDraggingOver: boolean }) => React.ReactNode;
  renderClone?: DraggableChildrenFn;
}

const getDropTargetStyles = ({
  euiTheme,
  height,
  isDraggingOver,
}: {
  euiTheme: UseEuiTheme['euiTheme'];
  height: string;
  isDraggingOver: boolean;
}) => css`
  transition: background-color 0.7s ease;
  width: 100%;
  height: ${height};

  .flyout-overlay {
    .euiPanel {
      background-color: ${euiTheme.colors.body};
    }
  }

  ${isDraggingOver
    ? css`
        .drop-and-provider-timeline {
          &:hover {
            background-color: ${rgba(euiTheme.colors.success, 0.3)};
          }
        }
        .drop-and-provider-timeline:hover {
          background-color: ${rgba(euiTheme.colors.success, 0.3)};
        }
        > div.timeline-drop-area-empty {
          color: ${euiTheme.colors.success};
          background-color: ${rgba(euiTheme.colors.success, 0.2)};

          & .timeline-drop-area-empty__text {
            color: ${euiTheme.colors.success};
          }
        }
        > div.timeline-drop-area {
          background-color: ${rgba(euiTheme.colors.success, 0.2)};
          .provider-item-filter-container div:first-child {
            /* Override dragNdrop beautiful so we do not have our droppable moving around for no good reason */
            transform: none !important;
          }
          .drop-and-provider-timeline {
            display: block !important;
            + div {
              display: none;
            }
          }

          & .euiFormHelpText {
            color: ${euiTheme.colors.success};
          }
        }
        .flyout-overlay {
          .euiPanel {
            background-color: ${euiTheme.colors.lightShade};
          }
          + div {
            /* Override dragNdrop beautiful so we do not have our droppable moving around for no good reason */
            display: none !important;
          }
        }
      `
    : ''}
  > div.timeline-drop-area {
    .drop-and-provider-timeline {
      display: none;
    }

    & + div {
      /* Override dragNdrop beautiful so we do not have our droppable moving around for no good reason */
      display: none !important;
    }
  }
`;

export const DroppableWrapper = React.memo<Props>(
  ({ children = null, droppableId, height = '100%', type, render = null, renderClone }) => {
    const { euiTheme } = useEuiTheme();
    const DroppableContent = useCallback<DroppableProps['children']>(
      (provided, snapshot) => (
        <div
          css={getDropTargetStyles({
            euiTheme,
            height,
            isDraggingOver: snapshot.isDraggingOver,
          })}
          ref={provided.innerRef}
          {...provided.droppableProps}
        >
          {render == null ? children : render({ isDraggingOver: snapshot.isDraggingOver })}
          {provided.placeholder}
        </div>
      ),
      [children, euiTheme, height, render]
    );

    return (
      <Droppable
        droppableId={droppableId}
        direction={'horizontal'}
        type={type}
        renderClone={renderClone}
      >
        {DroppableContent}
      </Droppable>
    );
  }
);
DroppableWrapper.displayName = 'DroppableWrapper';
