/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { ReadStreamDefinition } from '@kbn/streams-plugin/common';

import {
  DragDropContextProps,
  EuiButtonIcon,
  EuiDragDropContext,
  EuiDraggable,
  EuiDroppable,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiTitle,
  euiDragDropReorder,
  htmlIdGenerator,
} from '@elastic/eui';
import { ClassNames } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import { EnrichmentEmptyPrompt } from './enrichment_empty_prompt';
import { AddProcessorButton } from './add_processor_button';

export function StreamDetailEnrichmentContent({
  definition,
  refreshDefinition,
}: {
  definition: ReadStreamDefinition;
  refreshDefinition: () => void;
}) {
  const [processors, setProcessors] = useState(() => createProcessorsList(definition.processing));

  const onDragEnd: DragDropContextProps['onDragEnd'] = ({ source, destination }) => {
    if (source && destination) {
      const items = euiDragDropReorder(processors, source.index, destination.index);
      setProcessors(items);
    }
  };

  const handleAddProcessorClick = () => {};

  const hasProcessors = processors.length > 0;

  if (!hasProcessors) {
    return <EnrichmentEmptyPrompt onAddProcessor={handleAddProcessorClick} />;
  }

  return (
    <EuiPanel paddingSize="none">
      <ProcessorsHeader />
      <EuiSpacer size="l" />
      <SortableProcessorsList processors={processors} onDragEnd={onDragEnd} />
      <EuiSpacer size="m" />
      <AddProcessorButton onClick={handleAddProcessorClick} />
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

const SortableProcessorsList = ({ processors, onDragEnd }) => {
  return (
    <EuiDragDropContext onDragEnd={onDragEnd}>
      <ClassNames>
        {({ css, theme }) => (
          <EuiDroppable
            droppableId="processors-droppable-area"
            className={css`
              background-color: ${theme.euiTheme.colors.backgroundBasePlain};
              max-width: min(800px, 100%);
            `}
          >
            {processors.map((processor, idx) => (
              <EuiDraggable
                spacing="m"
                key={processor.id}
                index={idx}
                draggableId={processor.id}
                hasInteractiveChildren
                style={{
                  paddingLeft: 0,
                  paddingRight: 0,
                }}
              >
                {(_provided, state) => (
                  <ProcessorListItem processor={processor} hasShadow={state.isDragging} />
                )}
              </EuiDraggable>
            ))}
          </EuiDroppable>
        )}
      </ClassNames>
    </EuiDragDropContext>
  );
};

const ProcessorListItem = ({ processor, hasShadow = false }) => {
  const { patterns, type } = processor.config;

  return (
    <EuiPanel hasBorder hasShadow={hasShadow} paddingSize="s">
      <EuiFlexGroup gutterSize="m" responsive={false} alignItems="center">
        <EuiIcon type="grab" />
        <EuiText component="span" size="s">
          {type.toUpperCase()}
        </EuiText>
        <EuiFlexItem>
          <EuiText component="span" size="s" color="subdued">
            {patterns.join(' • ')}
          </EuiText>
        </EuiFlexItem>
        <EuiButtonIcon
          iconType="pencil"
          color="text"
          size="s"
          aria-label={i18n.translate(
            'xpack.streams.streamDetailView.managementTab.enrichment.editProcessorAction',
            { defaultMessage: 'Edit {type} processor', values: { type } }
          )}
        />
      </EuiFlexGroup>
    </EuiPanel>
  );
};

const createId = htmlIdGenerator();
const createProcessorsList = (processors) =>
  processors.map((processor) => ({
    ...processor,
    id: createId(),
  }));
