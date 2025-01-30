/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useRef, useState } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiFlexItem, EuiSpacer, EuiTab, EuiTabs } from '@elastic/eui';
import { IngestStreamGetResponse } from '@kbn/streams-schema';
import { ProcessorOutcomePreview } from './processor_outcome_preview';
import { TableColumn, UseProcessingSimulatorReturnType } from './hooks/use_processing_simulator';

type TabId = 'dataPreview' | 'detectedFields';

interface SimulationPlaygroundProps {
  definition: IngestStreamGetResponse;
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

  const tabs = {
    dataPreview: {
      name: i18n.translate(
        'xpack.streams.streamDetailView.managementTab.enrichment.simulationPlayground.dataPreview',
        { defaultMessage: 'Data preview' }
      ),
      content: (
        <ProcessorOutcomePreview
          definition={definition}
          columns={columns}
          isLoading={isLoading}
          simulation={simulation}
          samples={samples}
          onRefreshSamples={onRefreshSamples}
          simulationError={simulationError}
        />
      ),
    },
    detectedFields: {
      name: i18n.translate(
        'xpack.streams.streamDetailView.managementTab.enrichment.simulationPlayground.detectedFields',
        { defaultMessage: 'Detected fields' }
      ),
      content: i18n.translate('xpack.streams.simulationPlayground.div.detectedFieldsLabel', {
        defaultMessage: 'WIP',
      }),
    },
  } as const;

  const [selectedTabId, setSelectedTabId] = useState<TabId>('dataPreview');

  const currentTabContent = tabs[selectedTabId].content;

  return (
    <>
      <EuiFlexItem grow={false}>
        <EuiTabs bottomBorder={false}>
          {Object.entries(tabs).map(([tabId, tab]) => (
            <EuiTab
              key={tabId}
              isSelected={selectedTabId === tabId}
              onClick={() => setSelectedTabId(tabId as TabId)}
            >
              {tab.name}
            </EuiTab>
          ))}
        </EuiTabs>
      </EuiFlexItem>
      <EuiSpacer size="m" />
      {currentTabContent}
    </>
  );
};
