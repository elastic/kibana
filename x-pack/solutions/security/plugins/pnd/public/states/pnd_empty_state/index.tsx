/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { IconType } from '@elastic/eui';
import { EuiEmptyPrompt } from '@elastic/eui';

interface PndEmptyStateProps {
  body?: React.ReactNode;
  iconType?: IconType;
  title: string;
}

/**
 * "The request succeeded and there is genuinely nothing to show."
 *
 * Only ever render this for a 2xx. A failed read gets `PndErrorState`, and a
 * missing Workflows management API gets `PndWorkflowsUnavailableState`.
 *
 * Default icon is an EUI 119 glyph: `visTagCloud` was removed and rendered as
 * the broken-image placeholder.
 */
export const PndEmptyState: React.FC<PndEmptyStateProps> = ({
  body,
  iconType = 'checkCircle',
  title,
}) => (
  <EuiEmptyPrompt
    body={body != null ? <p>{body}</p> : undefined}
    data-test-subj="pndEmptyState"
    iconType={iconType}
    title={<h2>{title}</h2>}
  />
);
