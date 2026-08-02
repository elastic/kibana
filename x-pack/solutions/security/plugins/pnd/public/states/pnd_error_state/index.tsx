/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiButton, EuiEmptyPrompt } from '@elastic/eui';
import * as i18n from '../translations';

interface PndErrorStateProps {
  body?: React.ReactNode;
  onRetry?: () => void;
  title?: string;
}

/**
 * A read failed. This is deliberately **not** the empty state: PND's list
 * routes propagate a broken read as a 500 by design, and rendering that as
 * "nothing to do" hides an outage behind a reassuring screen.
 */
export const PndErrorState: React.FC<PndErrorStateProps> = ({
  body,
  onRetry,
  title = i18n.ERROR_TITLE,
}) => (
  <EuiEmptyPrompt
    actions={
      onRetry != null ? (
        <EuiButton color="danger" data-test-subj="pndErrorStateRetry" fill onClick={onRetry}>
          {i18n.RETRY}
        </EuiButton>
      ) : undefined
    }
    body={body != null ? <p>{body}</p> : undefined}
    color="danger"
    data-test-subj="pndErrorState"
    iconType="error"
    title={<h2>{title}</h2>}
  />
);
