/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { ComponentProps, lazy, Suspense } from 'react';
import { EuiLoadingSpinner } from '@elastic/eui';
import type { ObservabilityAlertsTable as ObservabilityAlertsTableType } from './alerts_table';

export const AlertsTable = lazy(() => import('./alerts_table')) as ObservabilityAlertsTableType;

export function ObservabilityAlertsTable(
  props: ComponentProps<ObservabilityAlertsTableType> & { hideLazyLoader?: boolean }
) {
  const { hideLazyLoader, ...tableProps } = props;
  return (
    <Suspense fallback={hideLazyLoader ? null : <EuiLoadingSpinner />}>
      <AlertsTable {...tableProps} />
    </Suspense>
  );
}
