/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiButton, EuiEmptyPrompt, EuiImage, EuiText, EuiTitle, useEuiTheme } from '@elastic/eui';
import { useEffect, useState } from 'react';
import { i18n } from '@kbn/i18n';

interface EnrichingEmptyPromptProps {
  onAddProcessor: () => void;
}

export const EnrichingEmptyPrompt = ({ onAddProcessor }: EnrichingEmptyPromptProps) => {
  const { colorMode } = useEuiTheme();

  const [imageSrc, setImageSrc] = useState<string>();

  useEffect(() => {
    const imagePath =
      colorMode === 'LIGHT' ? '../../assets/welcome--light.svg' : '../../assets/welcome--dark.svg';

    import(imagePath).then(setImageSrc);
  }, [colorMode]);

  const image = imageSrc ? <EuiImage src={imageSrc} alt="" /> : null;

  return (
    <EuiEmptyPrompt
      color="subdued"
      titleSize="m"
      icon={image}
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
  <EuiTitle>
    <p>
      {i18n.translate('xpack.streams.streamDetailView.managementTab.enrichmentEmptyPrompt.title', {
        defaultMessage: 'Start extracting useful fields from your data',
      })}
    </p>
  </EuiTitle>
);

const body = (
  <EuiText component="p">
    {i18n.translate('xpack.streams.streamDetailView.managementTab.enrichmentEmptyPrompt.body', {
      defaultMessage: 'Use processors to transform data before indexing',
    })}
  </EuiText>
);
