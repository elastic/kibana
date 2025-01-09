/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiScreenReaderOnly } from '@elastic/eui';
import { DRAGGABLE_KEYBOARD_WRAPPER_CLASS_NAME } from '@kbn/securitysolution-t-grid';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import type {
  DraggableProvided,
  DraggableStateSnapshot,
  DraggingStyle,
  DroppableProvided,
  NotDraggingStyle,
} from '@hello-pangea/dnd';
import { Draggable, Droppable } from '@hello-pangea/dnd';
import { useDispatch } from 'react-redux';
import styled from 'styled-components';

import { TableId } from '@kbn/securitysolution-data-table';
import { dragAndDropActions } from '../../store/drag_and_drop';
import type { DataProvider } from '../../../timelines/components/timeline/data_providers/data_provider';
import { ROW_RENDERER_BROWSER_EXAMPLE_TIMELINE_ID } from '../../../timelines/components/row_renderers_browser/constants';

import { TruncatableText } from '../truncatable_text';
import { CellActionsWrapper } from './cell_actions_wrapper';

import { getDraggableId, getDroppableId } from './helpers';
import { ProviderContainer } from './provider_container';

import * as i18n from './translations';

// As right now, we do not know what we want there, we will keep it as a placeholder
export const DragEffects = styled.div``;

DragEffects.displayName = 'DragEffects';

/**
 * Wraps the `@hello-pangea/dnd` error boundary. See also:
 * https://github.com/atlassian/react-beautiful-dnd/blob/v12.0.0/docs/guides/setup-problem-detection-and-error-recovery.md
 *
 * NOTE: This extends from `PureComponent` because, at the time of this
 * writing, there's no hook equivalent for `componentDidCatch`, per
 * https://reactjs.org/docs/hooks-faq.html#do-hooks-cover-all-use-cases-for-classes
 */
class DragDropErrorBoundary extends React.PureComponent<React.PropsWithChildren<{}>> {
  componentDidCatch() {
    this.forceUpdate(); // required for recovery
  }

  render() {
    return this.props.children;
  }
}

interface WrapperProps {
  disabled: boolean;
}

const Wrapper = styled.div<WrapperProps>`
  display: inline-block;
  max-width: 100%;

  [data-rbd-placeholder-context-id] {
    display: none !important;
  }

  ${({ disabled }) =>
    disabled &&
    `
    [data-rbd-draggable-id]:hover,
    .euiBadge:hover,
    .euiBadge__text:hover {
      cursor: default;
    }
  `}
`;

Wrapper.displayName = 'Wrapper';

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
  isDraggable?: boolean;
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

const DraggableOnWrapper: React.FC<DraggableWrapperProps> = React.memo(
  ({ dataProvider, render, scopeId, truncate, hideTopN }) => {
    const [providerRegistered, setProviderRegistered] = useState(false);
    const isDisabled = dataProvider.id.includes(`-${ROW_RENDERER_BROWSER_EXAMPLE_TIMELINE_ID}-`);
    const dispatch = useDispatch();

    const registerProvider = useCallback(() => {
      if (!isDisabled) {
        dispatch(dragAndDropActions.registerProvider({ provider: dataProvider }));
        setProviderRegistered(true);
      }
    }, [isDisabled, dispatch, dataProvider]);

    const unRegisterProvider = useCallback(
      () =>
        providerRegistered &&
        dispatch(dragAndDropActions.unRegisterProvider({ id: dataProvider.id })),
      [providerRegistered, dispatch, dataProvider.id]
    );

    useEffect(
      () => () => {
        unRegisterProvider();
      },
      [unRegisterProvider]
    );

    const RenderClone = useCallback(
      (provided: DraggableProvided, snapshot: DraggableStateSnapshot) => (
        <ConditionalPortal registerProvider={registerProvider}>
          <div
            {...provided.draggableProps}
            {...provided.dragHandleProps}
            style={getStyle(provided.draggableProps.style, snapshot)}
            ref={provided.innerRef}
            data-test-subj="providerContainer"
            tabIndex={-1}
          >
            <ProviderContentWrapper
              data-test-subj={`draggable-content-${dataProvider.queryMatch.field}`}
            >
              {render(dataProvider, provided, snapshot)}
            </ProviderContentWrapper>
          </div>
        </ConditionalPortal>
      ),
      [dataProvider, registerProvider, render]
    );

    const DraggableContent = useCallback(
      (provided: DraggableProvided, snapshot: DraggableStateSnapshot) => (
        <ProviderContainer
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          ref={(e: HTMLDivElement) => {
            provided.innerRef(e);
          }}
          data-test-subj="providerContainer"
          isDragging={snapshot.isDragging}
          registerProvider={registerProvider}
          tabIndex={-1}
        >
          <EuiScreenReaderOnly data-test-subj="screenReaderOnlyField">
            <p>{dataProvider.queryMatch.field}</p>
          </EuiScreenReaderOnly>
          {truncate && !snapshot.isDragging ? (
            <TruncatableText data-test-subj="draggable-truncatable-content">
              {render(dataProvider, provided, snapshot)}
            </TruncatableText>
          ) : (
            <ProviderContentWrapper
              data-test-subj={`draggable-content-${dataProvider.queryMatch.field}`}
            >
              {render(dataProvider, provided, snapshot)}
            </ProviderContentWrapper>
          )}
          {!snapshot.isDragging && (
            <EuiScreenReaderOnly data-test-subj="draggableKeyboardInstructionsNotDragging">
              <p>{i18n.DRAGGABLE_KEYBOARD_INSTRUCTIONS_NOT_DRAGGING_SCREEN_READER_ONLY}</p>
            </EuiScreenReaderOnly>
          )}
        </ProviderContainer>
      ),
      [dataProvider, registerProvider, render, truncate]
    );

    const DroppableContent = useCallback(
      (droppableProvided: DroppableProvided) => (
        <div ref={droppableProvided.innerRef} {...droppableProvided.droppableProps}>
          <div
            className={DRAGGABLE_KEYBOARD_WRAPPER_CLASS_NAME}
            data-test-subj="draggableWrapperKeyboardHandler"
            role="button"
            tabIndex={0}
          >
            <Draggable
              draggableId={getDraggableId(dataProvider.id)}
              index={0}
              key={getDraggableId(dataProvider.id)}
              isDragDisabled={isDisabled}
            >
              {DraggableContent}
            </Draggable>
          </div>
          {droppableProvided.placeholder}
        </div>
      ),
      [DraggableContent, dataProvider.id, isDisabled]
    );

    const content = useMemo(
      () => (
        <Wrapper data-test-subj="draggableWrapperDiv" disabled={isDisabled}>
          <DragDropErrorBoundary>
            <Droppable
              isDropDisabled={true}
              droppableId={getDroppableId(dataProvider.id)}
              renderClone={RenderClone}
            >
              {DroppableContent}
            </Droppable>
          </DragDropErrorBoundary>
        </Wrapper>
      ),
      [DroppableContent, RenderClone, dataProvider.id, isDisabled]
    );

    if (isDisabled) return <>{content}</>;
    return (
      <CellActionsWrapper dataProvider={dataProvider} scopeId={scopeId} hideTopN={hideTopN}>
        {content}
      </CellActionsWrapper>
    );
  }
);
DraggableOnWrapper.displayName = 'DraggableOnWrapper';

export const DraggableWrapper: React.FC<DraggableWrapperProps> = React.memo(
  ({ dataProvider, isDraggable = false, render, scopeId, truncate, hideTopN }) => {
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

    if (!isDraggable) {
      if (disableHoverActions(scopeId)) {
        return <>{content}</>;
      }
      return (
        <CellActionsWrapper dataProvider={dataProvider} scopeId={scopeId} hideTopN={hideTopN}>
          {content}
        </CellActionsWrapper>
      );
    }
    return (
      <DraggableOnWrapper
        dataProvider={dataProvider}
        render={render}
        scopeId={scopeId}
        truncate={truncate}
      />
    );
  }
);
DraggableWrapper.displayName = 'DraggableWrapper';
/**
 * Conditionally wraps children in an EuiPortal to ensure drag offsets are correct when dragging
 * from containers that have css transforms
 *
 * See: https://github.com/atlassian/react-beautiful-dnd/issues/499
 */

interface ConditionalPortalProps {
  children: React.ReactNode;
  registerProvider: () => void;
}

export const ConditionalPortal = React.memo<ConditionalPortalProps>(
  ({ children, registerProvider }) => {
    useEffect(() => {
      registerProvider();
    }, [registerProvider]);

    return <>{children}</>;
  }
);

ConditionalPortal.displayName = 'ConditionalPortal';
