/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import type {
  DraggableProvided,
  DraggableStateSnapshot,
  DraggingStyle,
  NotDraggingStyle,
} from '@hello-pangea/dnd';
import styled from 'styled-components';
import { TableId } from '@kbn/securitysolution-data-table';
import type { DataProvider } from '../../../timelines/components/timeline/data_providers/data_provider';
import { ROW_RENDERER_BROWSER_EXAMPLE_TIMELINE_ID } from '../../../timelines/components/row_renderers_browser/constants';
import { TruncatableText } from '../truncatable_text';
import { CellActionsWrapper } from './cell_actions_wrapper';
import { getDraggableId } from './helpers';

export const ProviderContentWrapper = styled.span`
  > span.euiToolTipAnchor {
    display: block; /* allow EuiTooltip content to be truncatable */
  }

  > span.euiToolTipAnchor.eui-textTruncate {
    display: inline-block; /* do not override display when a tooltip is truncated via eui-textTruncate */
  }
`;

export type RenderFunctionProp = (
  props: DataProvider,
  provided: DraggableProvided | null,
  state: DraggableStateSnapshot
) => React.ReactNode;

export interface DraggableWrapperProps {
  dataProvider: DataProvider;
  fieldType?: string;
  isAggregatable?: boolean;
  hideTopN?: boolean;
  render: RenderFunctionProp;
  scopeId?: string;
  truncate?: boolean;
}

export const disableHoverActions = (timelineId: string | undefined): boolean =>
  [TableId.rulePreview, ROW_RENDERER_BROWSER_EXAMPLE_TIMELINE_ID].includes(timelineId ?? '');

/**
 * Wraps a draggable component to handle registration / unregistration of the
 * data provider associated with the item being dropped
 */

export const getStyle = (
  style: DraggingStyle | NotDraggingStyle | undefined,
  snapshot: DraggableStateSnapshot
) => {
  if (!snapshot.isDropAnimating) {
    return style;
  }

  return {
    ...style,
    transitionDuration: '0.00000001s', // cannot be 0, but can be a very short duration
  };
};

export const DraggableWrapper: React.FC<DraggableWrapperProps> = React.memo(
  ({ dataProvider, render, scopeId, truncate, hideTopN }) => {
    const content = useMemo(
      () => (
        <div tabIndex={-1} data-provider-id={getDraggableId(dataProvider.id)}>
          {truncate ? (
            <TruncatableText data-test-subj="render-truncatable-content">
              {render(dataProvider, null, {
                isDragging: false,
                isDropAnimating: false,
                isClone: false,
                dropAnimation: null,
                draggingOver: null,
                combineWith: null,
                combineTargetFor: null,
                mode: null,
              })}
            </TruncatableText>
          ) : (
            <ProviderContentWrapper
              data-test-subj={`render-content-${dataProvider.queryMatch.field}`}
            >
              {render(dataProvider, null, {
                isDragging: false,
                isDropAnimating: false,
                isClone: false,
                dropAnimation: null,
                draggingOver: null,
                combineWith: null,
                combineTargetFor: null,
                mode: null,
              })}
            </ProviderContentWrapper>
          )}
        </div>
      ),
      [dataProvider, render, truncate]
    );

    if (disableHoverActions(scopeId)) {
      return <>{content}</>;
    }
    return (
      <CellActionsWrapper dataProvider={dataProvider} scopeId={scopeId} hideTopN={hideTopN}>
        {content}
      </CellActionsWrapper>
    );
  }
);
DraggableWrapper.displayName = 'DraggableWrapper';
