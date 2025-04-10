/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiPanel, EuiText, EuiSpacer } from '@elastic/eui';
import { ElasticAiIcon } from './icons';
import { CALLOUT_TITLE, CALLOUT_DESCRIPTION, CALLOUT_ARIA_LABEL } from './translations';

export const AiSocCallout: React.FC = () => {
  return (
    <EuiPanel color="accent" data-test-subj={'ai-soc-callout'} aria-label={CALLOUT_ARIA_LABEL}>
      <ElasticAiIcon aria-hidden="true" />
      <EuiText size="xs">
        <h4>{CALLOUT_TITLE}</h4>
        <EuiSpacer size="xs" />
        <p>
          <small>{CALLOUT_DESCRIPTION}</small>
        </p>
      </EuiText>
    </EuiPanel>
  );
};
