/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiFlexItem, EuiSpacer, EuiTab, EuiTabs } from '@elastic/eui';
import { IngestStreamGetResponse, isWiredStreamGetResponse } from '@kbn/streams-schema';
import { ProcessorOutcomePreview } from './processor_outcome_preview';
import { TableColumn, UseProcessingSimulatorReturn } from './hooks/use_processing_simulator';

interface SimulationPlaygroundProps {
  definition: IngestStreamGetResponse;
  columns: TableColumn[];
  isLoading: UseProcessingSimulatorReturn['isLoading'];
  simulation: UseProcessingSimulatorReturn['simulation'];
  samples: UseProcessingSimulatorReturn['samples'];
  onRefreshSamples: UseProcessingSimulatorReturn['refreshSamples'];
}

export const SimulationPlayground = (props: SimulationPlaygroundProps) => {
  const { definition, columns, isLoading, simulation, samples, onRefreshSamples } = props;

  const tabs = {
    dataPreview: {
      name: i18n.translate(
        'xpack.streams.streamDetailView.managementTab.enrichment.simulationPlayground.dataPreview',
        { defaultMessage: 'Data preview' }
      ),
    },
    ...(isWiredStreamGetResponse(definition) && {
      detectedFields: {
        name: i18n.translate(
          'xpack.streams.streamDetailView.managementTab.enrichment.simulationPlayground.detectedFields',
          { defaultMessage: 'Detected fields' }
        ),
      },
    }),
  } as const;

  const [selectedTabId, setSelectedTabId] = useState<keyof typeof tabs>('dataPreview');

  return (
    <>
      <EuiFlexItem grow={false}>
        <EuiTabs bottomBorder={false}>
          {Object.entries(tabs).map(([tabId, tab]) => (
            <EuiTab
              key={tabId}
              isSelected={selectedTabId === tabId}
              onClick={() => setSelectedTabId(tabId as keyof typeof tabs)}
            >
              {tab.name}
            </EuiTab>
          ))}
        </EuiTabs>
      </EuiFlexItem>
      <EuiSpacer size="m" />
      {selectedTabId === 'dataPreview' && (
        <ProcessorOutcomePreview
          columns={columns}
          isLoading={isLoading}
          simulation={simulation}
          samples={samples}
          onRefreshSamples={onRefreshSamples}
        />
      )}
      {selectedTabId === 'detectedFields' &&
        i18n.translate('xpack.streams.simulationPlayground.div.detectedFieldsLabel', {
          defaultMessage: 'WIP',
        })}
    </>
  );
};
