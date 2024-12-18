/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useMemo, useState } from 'react';
import deepEqual from 'fast-deep-equal';
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
import { ManagementBottomBar } from '../management_bottom_bar';
import { useKibana } from '../../hooks/use_kibana';

export function StreamDetailEnrichmentContent({
  definition,
  refreshDefinition,
}: {
  definition: ReadStreamDefinition;
  refreshDefinition: () => void;
}) {
  const { processors, setProcessors, hasChanges, resetChanges, saveChanges } = useProcessorsList(
    definition,
    refreshDefinition
  );

  const [isAddProcessorOpen, { on: openAddProcessor, off: closeAddProcessor }] = useBoolean();
  const [isBottomBarOpen, { on: openBottomBar, off: closeBottomBar }] = useBoolean();

  const handlerItemDrag: DragDropContextProps['onDragEnd'] = ({ source, destination }) => {
    if (source && destination) {
      const items = euiDragDropReorder(processors, source.index, destination.index);
      setProcessors(items);
    }
  };

  useEffect(() => {
    if (hasChanges) openBottomBar();
    else closeBottomBar();
  }, [closeBottomBar, hasChanges, openBottomBar]);

  const handleSaveChanges = async () => {
    await saveChanges();
    closeBottomBar();
  };

  const handleDiscardChanges = async () => {
    await resetChanges();
    closeBottomBar();
  };

  const hasProcessors = processors.length > 0;

  const addProcessorFlyout = isAddProcessorOpen && (
    <AddProcessorFlyout key="add-processor" definition={definition} onClose={closeAddProcessor} />
  );

  if (!hasProcessors) {
    return (
      <>
        <EnrichmentEmptyPrompt onAddProcessor={openAddProcessor} />
        {addProcessorFlyout}
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
      {addProcessorFlyout}
      {isBottomBarOpen && (
        <ManagementBottomBar onCancel={handleDiscardChanges} onConfirm={handleSaveChanges} />
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

const useProcessorsList = (definition: ReadStreamDefinition, refreshDefinition: () => void) => {
  const { core, dependencies } = useKibana();
  const { toasts } = core.notifications;
  const { streamsRepositoryClient } = dependencies.start.streams;

  const [processors, setProcessors] = useState(() => createProcessorsList(definition.processing));

  const httpProcessing = useMemo(() => processors.map(removeIdFromProcessor), [processors]);

  const hasChanges = useMemo(
    () => !deepEqual(definition.processing, httpProcessing),
    [definition.processing, httpProcessing]
  );

  const addProcessor = (processor: ProcessingDefinition) => {
    setProcessors(processors.concat(createProcessorWithId(processor)));
  };

  const resetChanges = () => {
    setProcessors(createProcessorsList(definition.processing));
  };

  const saveChanges = async () => {
    try {
      await streamsRepositoryClient.fetch(`PUT /api/streams/{id}`, {
        params: {
          path: {
            id: definition.id,
          },
          body: {
            processing: httpProcessing,
            children: definition.children,
            fields: definition.fields,
          },
        },
      });

      await refreshDefinition();

      toasts.addSuccess(
        i18n.translate(
          'xpack.streams.streamDetailView.managementTab.enrichment.saveChangesSuccess',
          { defaultMessage: "Stream's processors were successfully updated" }
        )
      );
    } catch (error) {}
  };

  return {
    hasChanges,
    processors,
    addProcessor,
    resetChanges,
    saveChanges,
    setProcessors,
  };
};

const createId = htmlIdGenerator();
const createProcessorsList = (processors: ProcessingDefinition[]): ProcessorDefinition[] =>
  processors.map(createProcessorWithId);

const createProcessorWithId = (processor: ProcessingDefinition): ProcessorDefinition => ({
  ...processor,
  id: createId(),
});

const removeIdFromProcessor = (processor: ProcessorDefinition): ProcessingDefinition => {
  const { id, ...rest } = processor;
  return rest;
};
