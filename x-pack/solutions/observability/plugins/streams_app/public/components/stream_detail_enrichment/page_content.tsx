/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  DragDropContextProps,
  EuiPanel,
  EuiResizableContainer,
  EuiSplitPanel,
  EuiText,
  EuiTitle,
  euiDragDropReorder,
  useEuiShadow,
  useEuiTheme,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { IngestStreamGetResponse, isRootStreamDefinition } from '@kbn/streams-schema';
import { useUnsavedChangesPrompt } from '@kbn/unsaved-changes-prompt';
import { css } from '@emotion/react';
import { isEmpty } from 'lodash';
import { UseDefinitionReturn, useDefinition } from './hooks/use_definition';
import { useKibana } from '../../hooks/use_kibana';
import { RootStreamEmptyPrompt } from './root_stream_empty_prompt';
import { DraggableProcessorListItem } from './processors_list';
import { SortableList } from './sortable_list';
import { ManagementBottomBar } from '../management_bottom_bar';
import { AddProcessorPanel } from './processors';
import { SimulationPlayground } from './simulation_playground';
import {
  UseProcessingSimulatorReturn,
  useProcessingSimulator,
} from './hooks/use_processing_simulator';

const MemoSimulationPlayground = React.memo(SimulationPlayground);

interface StreamDetailEnrichmentContentProps {
  definition: IngestStreamGetResponse;
  refreshDefinition: () => void;
}

export function StreamDetailEnrichmentContent({
  definition,
  refreshDefinition,
}: StreamDetailEnrichmentContentProps) {
  const { appParams, core } = useKibana();

  const {
    processors,
    addProcessor,
    updateProcessor,
    deleteProcessor,
    resetChanges,
    saveChanges,
    reorderProcessors,
    hasChanges,
    isSavingChanges,
  } = useDefinition(definition, refreshDefinition);

  const {
    hasLiveChanges,
    isLoading,
    refreshSamples,
    samples,
    simulation,
    tableColumns,
    watchProcessor,
  } = useProcessingSimulator({ definition, processors });

  useUnsavedChangesPrompt({
    hasUnsavedChanges: hasChanges || hasLiveChanges,
    history: appParams.history,
    http: core.http,
    navigateToUrl: core.application.navigateToUrl,
    openConfirm: core.overlays.openConfirm,
  });

  if (isRootStreamDefinition(definition.stream)) {
    return <RootStreamEmptyPrompt />;
  }

  return (
    <EuiSplitPanel.Outer grow hasBorder hasShadow={false}>
      <EuiSplitPanel.Inner
        paddingSize="none"
        css={css`
          display: flex;
          overflow: auto;
        `}
      >
        <EuiResizableContainer>
          {(EuiResizablePanel, EuiResizableButton) => (
            <>
              <EuiResizablePanel
                initialSize={25}
                minSize="400px"
                tabIndex={0}
                paddingSize="none"
                css={verticalFlexCss}
              >
                <ProcessorsEditor
                  definition={definition}
                  processors={processors}
                  onUpdateProcessor={updateProcessor}
                  onDeleteProcessor={deleteProcessor}
                  onWatchProcessor={watchProcessor}
                  onAddProcessor={addProcessor}
                  onReorderProcessor={reorderProcessors}
                />
              </EuiResizablePanel>

              <EuiResizableButton indicator="border" accountForScrollbars="both" />

              <EuiResizablePanel
                initialSize={75}
                minSize="300px"
                tabIndex={0}
                paddingSize="s"
                css={verticalFlexCss}
              >
                <MemoSimulationPlayground
                  definition={definition}
                  columns={tableColumns}
                  simulation={simulation}
                  samples={samples}
                  onRefreshSamples={refreshSamples}
                  isLoading={isLoading}
                />
              </EuiResizablePanel>
            </>
          )}
        </EuiResizableContainer>
      </EuiSplitPanel.Inner>
      <EuiSplitPanel.Inner grow={false} color="subdued">
        <ManagementBottomBar
          onCancel={resetChanges}
          onConfirm={saveChanges}
          isLoading={isSavingChanges}
          disabled={!hasChanges}
        />
      </EuiSplitPanel.Inner>
    </EuiSplitPanel.Outer>
  );
}

interface ProcessorsEditorProps {
  definition: IngestStreamGetResponse;
  processors: UseDefinitionReturn['processors'];
  onAddProcessor: UseDefinitionReturn['addProcessor'];
  onDeleteProcessor: UseDefinitionReturn['deleteProcessor'];
  onReorderProcessor: UseDefinitionReturn['reorderProcessors'];
  onUpdateProcessor: UseDefinitionReturn['updateProcessor'];
  onWatchProcessor: UseProcessingSimulatorReturn['watchProcessor'];
}

const ProcessorsEditor = React.memo(
  ({
    definition,
    processors,
    onAddProcessor,
    onDeleteProcessor,
    onReorderProcessor,
    onUpdateProcessor,
    onWatchProcessor,
  }: ProcessorsEditorProps) => {
    const { euiTheme } = useEuiTheme();

    const handlerItemDrag: DragDropContextProps['onDragEnd'] = ({ source, destination }) => {
      if (source && destination) {
        const items = euiDragDropReorder(processors, source.index, destination.index);
        onReorderProcessor(items);
      }
    };

    const hasProcessors = !isEmpty(processors);

    return (
      <>
        <EuiPanel
          paddingSize="m"
          hasShadow={false}
          borderRadius="none"
          grow={false}
          css={css`
            z-index: ${euiTheme.levels.maskBelowHeader};
            ${useEuiShadow('xs')};
          `}
        >
          <EuiTitle size="xxs">
            <h2>
              {i18n.translate(
                'xpack.streams.streamDetailView.managementTab.enrichment.headingTitle',
                {
                  defaultMessage: 'Processors for field extraction',
                }
              )}
            </h2>
          </EuiTitle>
          <EuiText component="p" size="xs">
            {i18n.translate(
              'xpack.streams.streamDetailView.managementTab.enrichment.headingSubtitle',
              {
                defaultMessage:
                  'Drag and drop existing processors to update their execution order.',
              }
            )}
          </EuiText>
        </EuiPanel>
        <EuiPanel
          paddingSize="m"
          hasShadow={false}
          borderRadius="none"
          css={css`
            overflow: auto;
          `}
        >
          {hasProcessors && (
            <SortableList onDragItem={handlerItemDrag}>
              {processors.map((processor, idx) => (
                <DraggableProcessorListItem
                  key={processor.id}
                  idx={idx}
                  definition={definition}
                  processor={processor}
                  onDeleteProcessor={onDeleteProcessor}
                  onUpdateProcessor={onUpdateProcessor}
                  onWatchProcessor={onWatchProcessor}
                />
              ))}
            </SortableList>
          )}
          <AddProcessorPanel
            key={processors.length} // Used to force reset the inner form state once a new processor is added
            definition={definition}
            onAddProcessor={onAddProcessor}
            onWatchProcessor={onWatchProcessor}
          />
        </EuiPanel>
      </>
    );
  }
);

const verticalFlexCss = css`
  display: flex;
  flex-direction: column;
`;
