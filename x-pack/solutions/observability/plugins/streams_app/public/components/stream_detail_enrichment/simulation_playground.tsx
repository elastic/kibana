/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useRef, useState } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiPanel, EuiSpacer, EuiTab, EuiTabs } from '@elastic/eui';
import { ReadStreamDefinition } from '@kbn/streams-schema';
import { ProcessorOutcomePreview } from './processor_outcome_preview';
import { TableColumn, UseProcessingSimulatorReturnType } from './hooks/use_processing_simulator';

const tabs = [
  {
    id: 'dataPreview',
    name: i18n.translate(
      'xpack.streams.streamDetailView.managementTab.enrichment.simulationPlayground.dataPreview',
      { defaultMessage: 'Data preview' }
    ),
  },
  {
    id: 'detectedFields',
    name: i18n.translate(
      'xpack.streams.streamDetailView.managementTab.enrichment.simulationPlayground.detectedFields',
      { defaultMessage: 'Detected fields' }
    ),
    append: null, // TODO: Add badge for detected fields
  },
];

interface SimulationPlaygroundProps {
  definition: ReadStreamDefinition;
  columns: TableColumn[];
  isLoading: UseProcessingSimulatorReturnType['isLoading'];
  simulation: UseProcessingSimulatorReturnType['simulation'];
  samples: UseProcessingSimulatorReturnType['samples'];
  onRefreshSamples: UseProcessingSimulatorReturnType['refreshSamples'];
  simulationError: UseProcessingSimulatorReturnType['error'];
}

export const SimulationPlayground = (props: SimulationPlaygroundProps) => {
  const { definition, columns, isLoading, simulation, samples, onRefreshSamples, simulationError } =
    props;
  const [selectedTabId, setSelectedTabId] = useState(tabs[0].id);
  // This map allow to keep track of which tabs content have been rendered the first time.
  // We need it in order to load a tab content only if it gets clicked, and then keep it in the DOM for performance improvement.
  const renderedTabsSet = useRef(new Set([selectedTabId]));

  const tabEntries = tabs.map((tab, index) => (
    <EuiTab
      {...tab}
      key={index}
      onClick={() => {
        renderedTabsSet.current.add(tab.id); // On a tab click, mark the tab content as allowed to be rendered
        setSelectedTabId(tab.id);
      }}
      isSelected={tab.id === selectedTabId}
      append={tab.append}
    >
      {tab.name}
    </EuiTab>
  ));

  return (
    <EuiPanel hasShadow={false} paddingSize="s">
      <EuiTabs bottomBorder={false}>{tabEntries}</EuiTabs>
      <EuiSpacer />
      {renderedTabsSet.current.has('dataPreview') && (
        <div hidden={selectedTabId !== 'dataPreview'}>
          <ProcessorOutcomePreview
            definition={definition}
            columns={columns}
            isLoading={isLoading}
            simulation={simulation}
            samples={samples}
            onRefreshSamples={onRefreshSamples}
            simulationError={simulationError}
          />
        </div>
      )}
      {renderedTabsSet.current.has('detectedFields') && (
        <div hidden={selectedTabId !== 'detectedFields'}>
          {i18n.translate('xpack.streams.simulationPlayground.div.detectedFieldsLabel', {
            defaultMessage: 'WIP',
          })}
        </div>
      )}
    </EuiPanel>
  );
};
