/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiLoadingSpinner } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { KibanaErrorBoundary, KibanaErrorBoundaryProvider } from '@kbn/shared-ux-error-boundary';

/**
 * Same shape as `EscalationModalBoundary`: a failed chunk load degrades to a recoverable error
 * prompt rather than unmounting the whole flyout tab, and a visible spinner covers the wait for
 * the lazy chunk. Kept separate rather than shared because the two wrap unrelated lazy subtrees
 * with their own loading copy.
 */
const LOADING_LABEL = i18n.translate('xpack.alertzero.detailsFlyout.proposedActions.loading', {
  defaultMessage: 'Loading proposed actions…',
});

const Spinner: React.FC = () => (
  <EuiFlexGroup justifyContent="center" alignItems="center" style={{ minHeight: 60 }}>
    <EuiFlexItem grow={false}>
      <EuiLoadingSpinner size="m" aria-label={LOADING_LABEL} />
    </EuiFlexItem>
  </EuiFlexGroup>
);

export const ProposedActionsBoundary: React.FC<React.PropsWithChildren> = ({ children }) => (
  <KibanaErrorBoundaryProvider>
    <KibanaErrorBoundary>
      <React.Suspense fallback={<Spinner />}>{children}</React.Suspense>
    </KibanaErrorBoundary>
  </KibanaErrorBoundaryProvider>
);
