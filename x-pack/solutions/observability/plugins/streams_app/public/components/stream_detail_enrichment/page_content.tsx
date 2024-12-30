/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect } from 'react';
import {
  DragDropContextProps,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiTitle,
  euiDragDropReorder,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { ReadStreamDefinition } from '@kbn/streams-schema';
import { useBoolean } from '@kbn/react-hooks';
import { EnrichmentEmptyPrompt } from './enrichment_empty_prompt';
import { AddProcessorButton } from './add_processor_button';
import { AddProcessorFlyout } from './flyout';
import { DraggableProcessorListItem } from './processors_list';
import { ManagementBottomBar } from '../management_bottom_bar';
import { SortableList } from './sortable_list';
import { useDefinition } from './hooks/use_definition';

export function StreamDetailEnrichmentContent({
  definition,
  refreshDefinition,
}: {
  definition: ReadStreamDefinition;
  refreshDefinition: () => void;
}) {
  const {
    processors,
    addProcessor,
    updateProcessor,
    deleteProcessor,
    setProcessors,
    hasChanges,
    isSavingChanges,
    resetChanges,
    saveChanges,
  } = useDefinition(definition, refreshDefinition);

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
    <AddProcessorFlyout
      key="add-processor"
      definition={definition}
      onClose={closeAddProcessor}
      onAddProcessor={addProcessor}
    />
  );

  const bottomBar = isBottomBarOpen && (
    <ManagementBottomBar
      onCancel={handleDiscardChanges}
      onConfirm={handleSaveChanges}
      isLoading={isSavingChanges}
    />
  );

  if (!hasProcessors) {
    return (
      <>
        <EnrichmentEmptyPrompt onAddProcessor={openAddProcessor} />
        {addProcessorFlyout}
        {bottomBar}
      </>
    );
  }

  return (
    <EuiPanel paddingSize="none">
      {hasProcessors ? (
        <>
          <ProcessorsHeader />
          <EuiSpacer size="l" />
          <SortableList onDragItem={handlerItemDrag}>
            {processors.map((processor, idx) => (
              <DraggableProcessorListItem
                key={processor.id}
                idx={idx}
                definition={definition}
                processor={processor}
                onUpdateProcessor={updateProcessor}
                onDeleteProcessor={deleteProcessor}
              />
            ))}
          </SortableList>
          <EuiSpacer size="m" />
          <AddProcessorButton onClick={openAddProcessor} />
        </>
      ) : (
        <EnrichmentEmptyPrompt onAddProcessor={openAddProcessor} />
      )}
      {addProcessorFlyout}
      {bottomBar}
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
