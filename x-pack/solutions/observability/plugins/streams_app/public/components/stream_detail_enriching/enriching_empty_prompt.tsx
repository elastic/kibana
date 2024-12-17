/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiButton, EuiEmptyPrompt } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { WelcomeImage } from '../welcome_image';

interface EnrichingEmptyPromptProps {
  onAddProcessor: () => void;
}

export const EnrichingEmptyPrompt = ({ onAddProcessor }: EnrichingEmptyPromptProps) => {
  return (
    <EuiEmptyPrompt
      color="subdued"
      titleSize="xs"
      icon={<WelcomeImage />}
      title={title}
      body={body}
      actions={[
        <EuiButton iconType="plusInCircle" onClick={onAddProcessor}>
          {i18n.translate(
            'xpack.streams.streamDetailView.managementTab.enrichmentEmptyPrompt.addProcessorAction',
            {
              defaultMessage: 'Add a processor',
            }
          )}
        </EuiButton>,
      ]}
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
