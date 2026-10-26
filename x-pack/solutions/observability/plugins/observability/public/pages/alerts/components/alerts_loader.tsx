/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiLoadingChart } from '@elastic/eui';

export function AlertsLoader() {
  return (
    <div
      style={{
        minHeight: 238,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <EuiLoadingChart size="l" data-test-subj="alertsLoading" />
    </div>
  );
}
