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
import { css } from '@emotion/react';
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

  const [selectedTabId, setSelectedTabId] = useState<TabId>('dataPreview');
  // This map allow to keep track of which tabs content have been rendered the first time.
  // We need it in order to load a tab content only if it gets clicked, and then keep it in the DOM for performance improvement.
  const renderedTabsSet = useRef(new Set([selectedTabId]));

  const handleTabClick = (tabId: TabId) => {
    renderedTabsSet.current.add(tabId); // On a tab click, mark the tab content as allowed to be rendered
    setSelectedTabId(tabId);
  };

  return (
    <>
      <EuiFlexItem grow={false}>
        <EuiTabs bottomBorder={false}>
          <EuiTab
            isSelected={selectedTabId === 'dataPreview'}
            onClick={() => handleTabClick('dataPreview')}
          >
            {i18n.translate(
              'xpack.streams.streamDetailView.managementTab.enrichment.simulationPlayground.dataPreview',
              { defaultMessage: 'Data preview' }
            )}
          </EuiTab>
          <EuiTab
            isSelected={selectedTabId === 'detectedFields'}
            onClick={() => handleTabClick('detectedFields')}
          >
            {i18n.translate(
              'xpack.streams.streamDetailView.managementTab.enrichment.simulationPlayground.detectedFields',
              { defaultMessage: 'Detected fields' }
            )}
          </EuiTab>
        </EuiTabs>
      </EuiFlexItem>
      <EuiSpacer size="m" />
      {renderedTabsSet.current.has('dataPreview') && (
        <EuiFlexItem
          /* The EuiFlexItem doesn't support the hidden prop, so we need to use the css display property to hide the component */
          css={css`
            display: ${selectedTabId !== 'dataPreview' ? 'none' : 'flex'};
          `}
        >
          <ProcessorOutcomePreview
            definition={definition}
            columns={columns}
            isLoading={isLoading}
            simulation={simulation}
            samples={samples}
            onRefreshSamples={onRefreshSamples}
            simulationError={simulationError}
          />
        </EuiFlexItem>
      )}
      {renderedTabsSet.current.has('detectedFields') && (
        <div hidden={selectedTabId !== 'detectedFields'}>
          {i18n.translate('xpack.streams.simulationPlayground.div.detectedFieldsLabel', {
            defaultMessage: 'WIP',
          })}
        </div>
      )}
    </>
  );
};
