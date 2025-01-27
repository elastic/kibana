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
  EuiSpacer,
  EuiSplitPanel,
  EuiText,
  EuiTitle,
  euiDragDropReorder,
  useEuiShadow,
  useEuiTheme,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import {
  ReadStreamDefinition,
  getProcessorConfig,
  isRootStreamDefinition,
} from '@kbn/streams-schema';
import { useUnsavedChangesPrompt } from '@kbn/unsaved-changes-prompt';
import { css } from '@emotion/react';
import { useDefinition } from './hooks/use_definition';
import { useKibana } from '../../hooks/use_kibana';
import { RootStreamEmptyPrompt } from './root_stream_empty_prompt';
import { DraggableProcessorListItem } from './processors_list';
import { SortableList } from './sortable_list';
import { ManagementBottomBar } from '../management_bottom_bar';
import { AddProcessorPanel } from './processors';
import { SimulationPlayground } from './simulation_playground';
import { useProcessingSimulator } from './hooks/use_processing_simulator';

interface StreamDetailEnrichmentContentProps {
  definition: ReadStreamDefinition;
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
    setProcessors,
    hasChanges,
    isSavingChanges,
  } = useDefinition(definition, refreshDefinition);

  const { error, isLoading, refreshSamples, simulation, samples } = useProcessingSimulator({
    definition,
    condition: {
      field: processors[0] ? getProcessorConfig(processors[0]).field : '',
      operator: 'exists',
    },
  });

  const handlerItemDrag: DragDropContextProps['onDragEnd'] = ({ source, destination }) => {
    if (source && destination) {
      const items = euiDragDropReorder(processors, source.index, destination.index);
      setProcessors(items);
    }
  };

  useUnsavedChangesPrompt({
    hasUnsavedChanges: hasChanges,
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
          max-width: 100%;
          overflow: auto;
          flex-grow: 1;
        `}
      >
        <EuiResizableContainer>
          {(EuiResizablePanel, EuiResizableButton) => (
            <>
              <EuiResizablePanel
                initialSize={30}
                minSize="400px"
                tabIndex={0}
                paddingSize="none"
                css={css`
                  display: flex;
                  flex-direction: column;
                `}
              >
                <ProcessorsHeader />
                <EuiPanel
                  paddingSize="m"
                  hasShadow={false}
                  borderRadius="none"
                  color="plain"
                  css={css`
                    overflow: auto;
                  `}
                >
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
                  <EuiSpacer size="s" />
                  <AddProcessorPanel definition={definition} onAddProcessor={addProcessor} />
                </EuiPanel>
              </EuiResizablePanel>

              <EuiResizableButton indicator="border" accountForScrollbars="both" />

              <EuiResizablePanel initialSize={70} minSize="300px" tabIndex={0} paddingSize="none">
                <SimulationPlayground
                  definition={definition}
                  columns={['message']} // TODO: get columns from definition
                  simulation={simulation}
                  samples={samples}
                  onRefreshSamples={refreshSamples}
                  simulationError={error}
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

const ProcessorsHeader = () => {
  const { euiTheme } = useEuiTheme();

  return (
    <EuiPanel
      paddingSize="m"
      hasShadow={false}
      borderRadius="none"
      color="plain"
      grow={false}
      css={css`
        z-index: ${euiTheme.levels.maskBelowHeader};
        ${useEuiShadow('xs')};
      `}
    >
      <EuiTitle size="xxs">
        <h2>
          {i18n.translate('xpack.streams.streamDetailView.managementTab.enrichment.headingTitle', {
            defaultMessage: 'Processors for field extraction',
          })}
        </h2>
      </EuiTitle>
      <EuiText component="p" size="xs">
        {i18n.translate('xpack.streams.streamDetailView.managementTab.enrichment.headingSubtitle', {
          defaultMessage: 'Drag and drop existing processors to update their execution order.',
        })}
      </EuiText>
    </EuiPanel>
  );
};
