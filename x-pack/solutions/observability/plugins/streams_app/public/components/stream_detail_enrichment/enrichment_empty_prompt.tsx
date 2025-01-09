/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiEmptyPrompt } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { AssetImage } from '../asset_image';
import { AddProcessorButton } from './add_processor_button';

interface EnrichmentEmptyPromptProps {
  onAddProcessor: () => void;
}

export const EnrichmentEmptyPrompt = ({ onAddProcessor }: EnrichmentEmptyPromptProps) => {
  return (
    <EuiEmptyPrompt
      titleSize="xs"
      icon={<AssetImage />}
      title={title}
      body={body}
      actions={[<AddProcessorButton onClick={onAddProcessor} />]}
    />
  );
};

const title = (
  <h2>
    {i18n.translate('xpack.streams.streamDetailView.managementTab.enrichmentEmptyPrompt.title', {
      defaultMessage: 'Start extracting useful fields from your data',
    })}
  </h2>
);

const body = (
  <p>
    {i18n.translate('xpack.streams.streamDetailView.managementTab.enrichmentEmptyPrompt.body', {
      defaultMessage: 'Use processors to transform data before indexing',
    })}
  </p>
);
