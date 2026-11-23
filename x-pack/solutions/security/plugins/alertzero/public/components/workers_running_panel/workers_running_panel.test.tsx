/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { EuiProvider } from '@elastic/eui';
import { WorkersRunningPanel } from './workers_running_panel';

describe('WorkersRunningPanel', () => {
  it('should say workers are running in the background', () => {
    render(
      <EuiProvider>
        <WorkersRunningPanel />
      </EuiProvider>
    );

    expect(
      screen.getByRole('heading', { name: 'Workers are running in the background' })
    ).toBeVisible();
  });

  it('should not use first-run wording', () => {
    render(
      <EuiProvider>
        <WorkersRunningPanel />
      </EuiProvider>
    );

    expect(screen.getByTestId('alertZeroWorkersRunningPanel').textContent).not.toMatch(
      /first run/i
    );
  });
});
