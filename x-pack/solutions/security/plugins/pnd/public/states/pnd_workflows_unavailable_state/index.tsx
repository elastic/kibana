/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiButton, EuiEmptyPrompt } from '@elastic/eui';
import * as i18n from '../translations';

interface PndWorkflowsUnavailableStateProps {
  onRetry?: () => void;
}

/**
 * The 503 state: `workflowsManagement.management` is not wired, so every
 * management-backed PND route answers 503.
 *
 * This is the **expected** status on any Kibana started without Task Manager,
 * which is why it must never render as "no proposals" — the queue was not read,
 * so nothing is known about whether it is empty.
 */
export const PndWorkflowsUnavailableState: React.FC<PndWorkflowsUnavailableStateProps> = ({
  onRetry,
}) => (
  <EuiEmptyPrompt
    actions={
      onRetry != null ? (
        <EuiButton
          color="warning"
          data-test-subj="pndWorkflowsUnavailableStateRetry"
          fill
          onClick={onRetry}
        >
          {i18n.RETRY}
        </EuiButton>
      ) : undefined
    }
    body={<p>{i18n.WORKFLOWS_UNAVAILABLE_BODY}</p>}
    color="warning"
    data-test-subj="pndWorkflowsUnavailableState"
    iconType="warning"
    title={<h2>{i18n.WORKFLOWS_UNAVAILABLE_TITLE}</h2>}
  />
);
