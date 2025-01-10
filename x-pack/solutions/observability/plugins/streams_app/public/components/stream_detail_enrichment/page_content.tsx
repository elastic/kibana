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
import { ReadStreamDefinition, isRootStream } from '@kbn/streams-schema';
import { useBoolean } from '@kbn/react-hooks';
import { useUnsavedChangesPrompt } from '@kbn/unsaved-changes-prompt';
import { EnrichmentEmptyPrompt } from './enrichment_empty_prompt';
import { AddProcessorButton } from './add_processor_button';
import { AddProcessorFlyout } from './flyout';
import { DraggableProcessorListItem } from './processors_list';
import { ManagementBottomBar } from '../management_bottom_bar';
import { SortableList } from './sortable_list';
import { useDefinition } from './hooks/use_definition';
import { useKibana } from '../../hooks/use_kibana';
import { RootStreamEmptyPrompt } from './root_stream_empty_prompt';

interface StreamDetailEnrichmentContentProps {
  definition: ReadStreamDefinition;
  refreshDefinition: () => void;
}

export function StreamDetailEnrichmentContent({
  definition,
  refreshDefinition,
}: StreamDetailEnrichmentContentProps) {
  const { appParams, core } = useKibana();

  const [isBottomBarOpen, { on: openBottomBar, off: closeBottomBar }] = useBoolean();
  const [isAddProcessorOpen, { on: openAddProcessor, off: closeAddProcessor }] = useBoolean();

  const {
    processors,
    addProcessor,
    updateProcessor,
    deleteProcessor,
    resetChanges,
    saveChanges,
    setProcessors,
    hasChanges,
    isSavingChanges,
  } = useDefinition(definition, refreshDefinition);

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

  useUnsavedChangesPrompt({
    hasUnsavedChanges: hasChanges,
    history: appParams.history,
    http: core.http,
    navigateToUrl: core.application.navigateToUrl,
    openConfirm: core.overlays.openConfirm,
  });

  const handleSaveChanges = async () => {
    await saveChanges();
    closeBottomBar();
  };

  const handleDiscardChanges = async () => {
    await resetChanges();
    closeBottomBar();
  };

  const bottomBar = isBottomBarOpen && (
    <ManagementBottomBar
      onCancel={handleDiscardChanges}
      onConfirm={handleSaveChanges}
      isLoading={isSavingChanges}
    />
  );

  const addProcessorFlyout = isAddProcessorOpen && (
    <AddProcessorFlyout
      key="add-processor"
      definition={definition}
      onClose={closeAddProcessor}
      onAddProcessor={addProcessor}
    />
  );

  const hasProcessors = processors.length > 0;

  if (isRootStream(definition)) {
    return <RootStreamEmptyPrompt />;
  }

  return (
    <>
      {hasProcessors ? (
        <EuiPanel paddingSize="none">
          <ProcessorsHeader />
          <EuiSpacer size="l" />
          <SortableList onDragItem={handlerItemDrag}>
            {processors.map((processor, idx) => (
              <DraggableProcessorListItem
                key={processor.id}
                idx={idx}
                processor={processor}
                onUpdateProcessor={updateProcessor}
                onDeleteProcessor={deleteProcessor}
              />
            ))}
          </SortableList>
          <EuiSpacer size="m" />
          <AddProcessorButton onClick={openAddProcessor} />
        </EuiPanel>
      ) : (
        <EnrichmentEmptyPrompt onAddProcessor={openAddProcessor} />
      )}
      {addProcessorFlyout}
      {bottomBar}
    </>
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
