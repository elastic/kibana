/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiButton, EuiEmptyPrompt } from '@elastic/eui';
import * as i18n from '../translations';

interface PndCorrelationUnavailableStateProps {
  onRetry?: () => void;
}

/**
 * The four-phase view found no orchestrator run for this attack discovery.
 *
 * Rendered instead of an all-`not_started` skeleton, which reads as "nothing has
 * happened yet" when the truth is "we could not find out" — correlation is a
 * merged, newest-first cap with no time bounds, so an older discovery drops off
 * it entirely.
 */
export const PndCorrelationUnavailableState: React.FC<PndCorrelationUnavailableStateProps> = ({
  onRetry,
}) => (
  <EuiEmptyPrompt
    actions={
      onRetry != null ? (
        <EuiButton data-test-subj="pndCorrelationUnavailableStateRetry" onClick={onRetry}>
          {i18n.RETRY}
        </EuiButton>
      ) : undefined
    }
    body={<p>{i18n.CORRELATION_UNAVAILABLE_BODY}</p>}
    data-test-subj="pndCorrelationUnavailableState"
    iconType="questionInCircle"
    title={<h2>{i18n.CORRELATION_UNAVAILABLE_TITLE}</h2>}
  />
);
