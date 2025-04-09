/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiCallOut, EuiText } from '@elastic/eui';
import { ElasticAiIcon } from './icons';
import { CALLOUT_TITLE, CALLOUT_DESCRIPTION } from './translations';

export const AiSocCallout: React.FC = () => {
  return (
    <EuiCallOut color="accent" css={{ borderRadius: '10px' }} data-test-subj={'ai-soc-callout'}>
      <ElasticAiIcon />
      <EuiText css={{ fontSize: 12.25, fontWeight: 700 }}>{CALLOUT_TITLE}</EuiText>
      <EuiText css={{ fontSize: 10.5, lineHeight: '1.25rem' }}>{CALLOUT_DESCRIPTION}</EuiText>
    </EuiCallOut>
  );
};
