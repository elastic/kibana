/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { ProcessingDefinition, ReadStreamDefinition } from '@kbn/streams-plugin/common';

import {
  DragDropContextProps,
  EuiButtonIcon,
  EuiDragDropContext,
  EuiDraggable,
  EuiDroppable,
  EuiDroppableProps,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiPanel,
  EuiPanelProps,
  EuiSpacer,
  EuiText,
  EuiTitle,
  euiDragDropReorder,
  htmlIdGenerator,
} from '@elastic/eui';
import { ClassNames } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import { useBoolean } from '@kbn/react-hooks';
import { EnrichmentEmptyPrompt } from './enrichment_empty_prompt';
import { AddProcessorButton } from './add_processor_button';
import { AddProcessorFlyout, EditProcessorFlyout } from './flyout';

export function StreamDetailEnrichmentContent({
  definition,
  refreshDefinition,
}: {
  definition: ReadStreamDefinition;
  refreshDefinition: () => void;
}) {
  const [processors, setProcessors] = useState(() => createProcessorsList(definition.processing));

  const [isAddProcessorOpen, { on: openAddProcessor, off: closeAddProcessor }] = useBoolean();

  const handlerItemDrag: DragDropContextProps['onDragEnd'] = ({ source, destination }) => {
    if (source && destination) {
      const items = euiDragDropReorder(processors, source.index, destination.index);
      setProcessors(items);
    }
  };

  const hasProcessors = processors.length > 0;

  if (!hasProcessors) {
    return (
      <>
        <EnrichmentEmptyPrompt onAddProcessor={openAddProcessor} />
        {isAddProcessorOpen && (
          <AddProcessorFlyout
            key="add-processor"
            definition={definition}
            onClose={closeAddProcessor}
          />
        )}
      </>
    );
  }

  return (
    <EuiPanel paddingSize="none">
      <ProcessorsHeader />
      <EuiSpacer size="l" />
      <SortableProcessorsList onDragItem={handlerItemDrag}>
        {processors.map((processor, idx) => (
          <DraggableProcessorListItem
            key={processor.id}
            idx={idx}
            definition={definition}
            processor={processor}
          />
        ))}
      </SortableProcessorsList>
      <EuiSpacer size="m" />
      <AddProcessorButton onClick={openAddProcessor} />
      {isAddProcessorOpen && (
        <AddProcessorFlyout
          key="add-processor"
          definition={definition}
          onClose={closeAddProcessor}
        />
      )}
    </EuiPanel>
  );
}

const ProcessorsHeader = () => {
  return (
    <>
      <EuiTitle size="xs">
        <h2>
          {i18n.translate('xpack.streams.streamDetailView.managementTab.enrichment.headingTitle', {
            defaultMessage: 'Processors for field extraction',
          })}
        </h2>
      </EuiTitle>
      <EuiText component="p" size="s">
        {i18n.translate('xpack.streams.streamDetailView.managementTab.enrichment.headingSubtitle', {
          defaultMessage: 'Use processors to transform data before indexing',
        })}
      </EuiText>
    </>
  );
};

interface SortableProcessorsListProps {
  onDragItem: DragDropContextProps['onDragEnd'];
  children: EuiDroppableProps['children'];
}

const SortableProcessorsList = ({ onDragItem, children }: SortableProcessorsListProps) => {
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

const DraggableProcessorListItem = ({
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

interface ProcessorDefinition extends ProcessingDefinition {
  id: string;
}

const createId = htmlIdGenerator();
const createProcessorsList = (processors: ProcessingDefinition[]): ProcessorDefinition[] =>
  processors.map((processor) => ({
    ...processor,
    id: createId(),
  }));

const getProcessorDescription = (processor: ProcessorDefinition) => {
  if (processor.config.type === 'grok') {
    return processor.config.patterns.join(' • ');
  } else if (processor.config.type === 'dissect') {
    return processor.config.pattern;
  }

  return '';
};
