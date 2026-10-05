/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { useAutomationRunsInRange } from '../../hooks/use_automations';
import { AutomationRunsCell } from './runs_cell';

jest.mock('../../hooks/use_automations', () => ({ useAutomationRunsInRange: jest.fn() }));

const range = {
  startedAfter: '2026-10-01T00:00:00.000Z',
  startedBefore: '2026-10-02T00:00:00.000Z',
};

describe('AutomationRunsCell', () => {
  it('shows a warning instead of zero when runs fail to load', () => {
    jest
      .mocked(useAutomationRunsInRange)
      .mockReturnValue({ isInitialLoading: false, isError: true } as never);

    render(<AutomationRunsCell id="automation-1" {...range} />);

    expect(screen.queryByText('0')).not.toBeInTheDocument();
    expect(document.querySelector('[data-euiicon-type="warning"]')).toBeInTheDocument();
  });
});
