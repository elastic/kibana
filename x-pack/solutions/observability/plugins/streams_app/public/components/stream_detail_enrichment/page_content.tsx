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
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiTitle,
  euiDragDropReorder,
  htmlIdGenerator,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useBoolean } from '@kbn/react-hooks';
import { EnrichmentEmptyPrompt } from './enrichment_empty_prompt';
import { AddProcessorButton } from './add_processor_button';
import { AddProcessorFlyout } from './flyout';
import { DraggableProcessorListItem, SortableProcessorsList } from './processors_list';
import { ProcessorDefinition } from './types';

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

  const addProcessor = () => {};

  const updateProcessor = () => {};

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
          defaultMessage:
            'Use processors to transform data before indexing. Drag and drop existing processors to update their execution order.',
        })}
      </EuiText>
    </>
  );
};

const createId = htmlIdGenerator();
const createProcessorsList = (processors: ProcessingDefinition[]): ProcessorDefinition[] =>
  processors.map((processor) => ({
    ...processor,
    id: createId(),
  }));
