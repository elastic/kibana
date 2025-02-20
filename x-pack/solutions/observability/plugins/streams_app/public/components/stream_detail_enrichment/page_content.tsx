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
import { IngestStreamGetResponse } from '@kbn/streams-schema';
import { useUnsavedChangesPrompt } from '@kbn/unsaved-changes-prompt';
import { css } from '@emotion/react';
import { isEmpty } from 'lodash';
import { UseDefinitionReturn, useDefinition } from './hooks/use_definition';
import { useKibana } from '../../hooks/use_kibana';
import { DraggableProcessorListItem } from './processors_list';
import { SortableList } from './sortable_list';
import { ManagementBottomBar } from '../management_bottom_bar';
import { AddProcessorPanel } from './processors';
import { SimulationPlayground } from './simulation_playground';
import {
  UseProcessingSimulatorReturn,
  useProcessingSimulator,
} from './hooks/use_processing_simulator';
import {
  StreamEnrichmentContextProvider,
  StreamsEnrichmentEvents,
  useStreamsEnrichmentEvents,
  useStreamsEnrichmentSelector,
} from './services/stream_enrichment_service';
import { SimulatorContextProvider } from './simulator_context';

const MemoSimulationPlayground = React.memo(SimulationPlayground);

interface StreamDetailEnrichmentContentProps {
  definition: IngestStreamGetResponse;
  refreshDefinition: () => void;
}

export function StreamDetailEnrichmentContent(props: StreamDetailEnrichmentContentProps) {
  const { core, dependencies } = useKibana();
  const { toasts } = core.notifications;
  const { streamsRepositoryClient } = dependencies.start.streams;

  return (
    <StreamEnrichmentContextProvider
      definition={props.definition}
      refreshDefinition={props.refreshDefinition}
      streamsRepositoryClient={streamsRepositoryClient}
      toasts={toasts}
    >
      <StreamDetailEnrichmentContentImpl />
    </StreamEnrichmentContextProvider>
  );
}

export function StreamDetailEnrichmentContentImpl() {
  const { appParams, core } = useKibana();

  // const {
  //   // processors,
  //   addProcessor,
  //   updateProcessor,
  //   deleteProcessor,
  //   // resetChanges,
  //   // saveChanges,
  //   reorderProcessors,
  //   // hasChanges,
  //   // isSavingChanges,
  // } = useDefinition(definition, refreshDefinition);

  const {
    addProcessor,
    updateProcessor,
    deleteProcessor,
    reorderProcessors,
    resetChanges,
    saveChanges,
  } = useStreamsEnrichmentEvents();

  const definition = useStreamsEnrichmentSelector((state) => state.context.definition);
  const processors = useStreamsEnrichmentSelector((state) => state.context.processors);
  const hasChanges = useStreamsEnrichmentSelector((state) => state.context.hasStagedChanges);
  const isSavingChanges = useStreamsEnrichmentSelector((state) => state.matches('updatingStream'));

  const processingSimulator = useProcessingSimulator({ definition, processors });

  const {
    hasLiveChanges,
    isLoading,
    refreshSamples,
    filteredSamples,
    simulation,
    tableColumns,
    watchProcessor,
    selectedDocsFilter,
    setSelectedDocsFilter,
  } = processingSimulator;

  useUnsavedChangesPrompt({
    hasUnsavedChanges: hasChanges || hasLiveChanges,
    history: appParams.history,
    http: core.http,
    navigateToUrl: core.application.navigateToUrl,
    openConfirm: core.overlays.openConfirm,
  });

  const isNonAdditiveSimulation = simulation && simulation.is_non_additive_simulation;
  const isSubmitDisabled = Boolean(!hasChanges || isNonAdditiveSimulation);

  const confirmTooltip = isNonAdditiveSimulation
    ? {
        title: i18n.translate(
          'xpack.streams.streamDetailView.managementTab.enrichment.nonAdditiveProcessorsTooltip.title',
          { defaultMessage: 'Non additive simulation detected' }
        ),
        content: i18n.translate(
          'xpack.streams.streamDetailView.managementTab.enrichment.nonAdditiveProcessorsTooltip.content',
          {
            defaultMessage:
              'We currently prevent adding processors that change/remove existing data. Please update your processor configurations to continue.',
          }
        ),
      }
    : undefined;

  return (
    <SimulatorContextProvider processingSimulator={processingSimulator} definition={definition}>
      <EuiSplitPanel.Outer grow hasBorder hasShadow={false}>
        <EuiSplitPanel.Inner
          paddingSize="none"
          css={css`
            display: flex;
            overflow: hidden auto;
          `}
        >
          <EuiResizableContainer>
            {(EuiResizablePanel, EuiResizableButton) => (
              <>
                <EuiResizablePanel
                  initialSize={40}
                  minSize="480px"
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
                    simulation={simulation}
                  />
                </EuiResizablePanel>
                <EuiResizableButton indicator="border" accountForScrollbars="both" />
                <EuiResizablePanel
                  initialSize={60}
                  minSize="300px"
                  tabIndex={0}
                  paddingSize="s"
                  css={verticalFlexCss}
                >
                  <MemoSimulationPlayground
                    definition={definition}
                    columns={tableColumns}
                    simulation={simulation}
                    filteredSamples={filteredSamples}
                    onRefreshSamples={refreshSamples}
                    isLoading={isLoading}
                    selectedDocsFilter={selectedDocsFilter}
                    setSelectedDocsFilter={setSelectedDocsFilter}
                  />
                </EuiResizablePanel>
              </>
            )}
          </EuiResizableContainer>
        </EuiSplitPanel.Inner>
        <EuiSplitPanel.Inner grow={false} color="subdued">
          <ManagementBottomBar
            confirmTooltip={confirmTooltip}
            onCancel={resetChanges}
            onConfirm={saveChanges}
            isLoading={isSavingChanges}
            disabled={isSubmitDisabled}
          />
        </EuiSplitPanel.Inner>
      </EuiSplitPanel.Outer>
    </SimulatorContextProvider>
  );
}

interface ProcessorsEditorProps {
  definition: IngestStreamGetResponse;
  processors: UseDefinitionReturn['processors'];
  onAddProcessor: StreamsEnrichmentEvents['addProcessor'];
  onDeleteProcessor: StreamsEnrichmentEvents['deleteProcessor'];
  onReorderProcessor: StreamsEnrichmentEvents['reorderProcessors'];
  onUpdateProcessor: StreamsEnrichmentEvents['updateProcessor'];
  onWatchProcessor: UseProcessingSimulatorReturn['watchProcessor'];
  simulation: UseProcessingSimulatorReturn['simulation'];
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
    simulation,
  }: ProcessorsEditorProps) => {
    const { euiTheme } = useEuiTheme();

    const handlerItemDrag: DragDropContextProps['onDragEnd'] = ({ source, destination }) => {
      if (source && destination) {
        const items = euiDragDropReorder(processors, source.index, destination.index);
        onReorderProcessor({ processors: items });
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
                  processorMetrics={simulation?.processors_metrics[processor.id]}
                />
              ))}
            </SortableList>
          )}
          <AddProcessorPanel
            key={processors.length} // Used to force reset the inner form state once a new processor is added
            definition={definition}
            onAddProcessor={onAddProcessor}
            onWatchProcessor={onWatchProcessor}
            processorMetrics={simulation?.processors_metrics.draft}
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
