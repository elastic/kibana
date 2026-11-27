/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Suspense } from 'react';
import { render, waitFor } from '@testing-library/react';
import { AlertZeroStepIcon } from './alertzero_step_icon';

// Jest doesn't transform EUI's ES module build, so load the same asset from its CommonJS build.
// An import of any other path in `alertzero_step_icon.ts` misses this mock and fails to resolve.
jest.mock('@elastic/eui/es/components/icon/assets/product_alert_zero', () =>
  jest.requireActual('@elastic/eui/lib/components/icon/assets/product_alert_zero')
);

describe('AlertZeroStepIcon', () => {
  // The asset path is only checked when the lazy import runs: the type check accepts any path.
  it('loads the EUI asset and renders its SVG', async () => {
    const { container } = render(
      <Suspense fallback={null}>
        <AlertZeroStepIcon />
      </Suspense>
    );

    await waitFor(() => expect(container.querySelector('svg')).not.toBeNull());
  });
});
