/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  DragDropContextProps,
  EuiDroppableProps,
  EuiDragDropContext,
  EuiDroppable,
  EuiDraggable,
  EuiPanelProps,
  EuiPanel,
  EuiFlexGroup,
  EuiIcon,
  EuiText,
  EuiFlexItem,
  EuiButtonIcon,
} from '@elastic/eui';
import { ClassNames } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import { useBoolean } from '@kbn/react-hooks';
import { ReadStreamDefinition } from '@kbn/streams-plugin/common';
import { EditProcessorFlyout } from './flyout';
import { ProcessorDefinition } from './types';

interface SortableProcessorsListProps {
  onDragItem: DragDropContextProps['onDragEnd'];
  children: EuiDroppableProps['children'];
}

export const SortableProcessorsList = ({ onDragItem, children }: SortableProcessorsListProps) => {
  return (
    <EuiDragDropContext onDragEnd={onDragItem}>
      <ClassNames>
        {({ css, theme }) => (
          <EuiDroppable
            droppableId="processors-droppable-area"
            className={css`
              background-color: ${theme.euiTheme.colors.backgroundBasePlain};
              max-width: min(800px, 100%);
            `}
          >
            {children}
          </EuiDroppable>
        )}
      </ClassNames>
    </EuiDragDropContext>
  );
};

export const DraggableProcessorListItem = ({
  processor,
  idx,
  ...props
}: Omit<ProcessorListItemProps, 'hasShadow'> & { idx: number }) => (
  <EuiDraggable
    index={idx}
    spacing="m"
    draggableId={processor.id}
    hasInteractiveChildren
    style={{
      paddingLeft: 0,
      paddingRight: 0,
    }}
  >
    {(_provided, state) => (
      <ProcessorListItem processor={processor} hasShadow={state.isDragging} {...props} />
    )}
  </EuiDraggable>
);

interface ProcessorListItemProps {
  definition: ReadStreamDefinition;
  processor: ProcessorDefinition;
  hasShadow: EuiPanelProps['hasShadow'];
}

const ProcessorListItem = ({
  processor,
  definition,
  hasShadow = false,
}: ProcessorListItemProps) => {
  const { type } = processor.config;

  const [isEditProcessorOpen, { on: openEditProcessor, off: closeEditProcessor }] = useBoolean();

  const description = getProcessorDescription(processor);

  return (
    <EuiPanel hasBorder hasShadow={hasShadow} paddingSize="s">
      <EuiFlexGroup gutterSize="m" responsive={false} alignItems="center">
        <EuiIcon type="grab" />
        <EuiText component="span" size="s">
          {type.toUpperCase()}
        </EuiText>
        <EuiFlexItem>
          <EuiText component="span" size="s" color="subdued">
            {description}
          </EuiText>
        </EuiFlexItem>
        <EuiButtonIcon
          onClick={openEditProcessor}
          iconType="pencil"
          color="text"
          size="s"
          aria-label={i18n.translate(
            'xpack.streams.streamDetailView.managementTab.enrichment.editProcessorAction',
            { defaultMessage: 'Edit {type} processor', values: { type } }
          )}
        />
      </EuiFlexGroup>
      {isEditProcessorOpen && (
        <EditProcessorFlyout
          key={`edit-processor`}
          definition={definition}
          onClose={closeEditProcessor}
          processor={processor}
        />
      )}
    </EuiPanel>
  );
};

const getProcessorDescription = (processor: ProcessorDefinition) => {
  if (processor.config.type === 'grok') {
    return processor.config.patterns.join(' • ');
  } else if (processor.config.type === 'dissect') {
    return processor.config.pattern;
  }

  return '';
};
