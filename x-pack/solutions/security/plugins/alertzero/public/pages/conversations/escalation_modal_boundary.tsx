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
 * Wraps the lazy escalation-modal subtree with:
 *  - `KibanaErrorBoundaryProvider` + `KibanaErrorBoundary`: a failed chunk load degrades
 *    to a recoverable error prompt (KibanaErrorBoundary classifies `ChunkLoadError` as
 *    non-fatal), rather than unmounting the entire flyout tree.
 *  - `React.Suspense` with a visible spinner: while the chunk is resolving, the user sees
 *    a loading indicator instead of a blank screen.
 *
 * The provider is mounted here rather than inherited from the page because the flyout
 * renders outside alertzero's main React tree.
 *
 * Note: the loading/error strings live in this file rather than `escalation_modal_translations.ts`
 * because that module is intentionally kept in the lazy chunk so its `i18n.translate` calls do
 * not affect the main-chunk size.
 */

const LOADING_LABEL = i18n.translate('xpack.alertzero.escalationModal.loading', {
  defaultMessage: 'Loading escalation modal…',
});

const Spinner: React.FC = () => (
  <EuiFlexGroup justifyContent="center" alignItems="center" style={{ minHeight: 120 }}>
    <EuiFlexItem grow={false}>
      <EuiLoadingSpinner size="l" aria-label={LOADING_LABEL} />
    </EuiFlexItem>
  </EuiFlexGroup>
);

export const EscalationModalBoundary: React.FC<React.PropsWithChildren> = ({ children }) => (
  <KibanaErrorBoundaryProvider>
    <KibanaErrorBoundary>
      <React.Suspense fallback={<Spinner />}>{children}</React.Suspense>
    </KibanaErrorBoundary>
  </KibanaErrorBoundaryProvider>
);
