/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiLoadingSpinner } from '@elastic/eui';
import * as i18n from '../translations';

interface PndLoadingStateProps {
  /** Screen-reader label; pass a page-specific one where it helps. */
  label?: string;
}

export const PndLoadingState: React.FC<PndLoadingStateProps> = ({ label = i18n.LOADING }) => (
  <EuiFlexGroup alignItems="center" justifyContent="center">
    <EuiFlexItem grow={false}>
      <EuiLoadingSpinner aria-label={label} data-test-subj="pndLoadingState" size="xl" />
    </EuiFlexItem>
  </EuiFlexGroup>
);
