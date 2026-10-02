/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Suspense } from 'react';

import type { InvestigationDetailFlyoutProps } from './investigation_detail_flyout';
export { InvestigationRunStatusBadge } from './investigation_run_status_badge';

const LazyInvestigationDetailFlyout = React.lazy(async () => {
  const { InvestigationDetailFlyout: InvestigationDetailFlyoutComponent } =
    await import('./investigation_detail_flyout');
  return { default: InvestigationDetailFlyoutComponent };
});

export function InvestigationDetailFlyout(
  props: InvestigationDetailFlyoutProps
): React.ReactElement {
  return (
    <Suspense fallback={null}>
      <LazyInvestigationDetailFlyout {...props} />
    </Suspense>
  );
}

export type { InvestigationDetailFlyoutProps } from './investigation_detail_flyout';
