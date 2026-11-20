/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { focusEuiToolTipTrigger } from '@elastic/eui/lib/test/rtl';
import { AutomationUsageCell } from './usage_cell';

describe('AutomationUsageCell', () => {
  it('shows used triggers out of the limit', () => {
    render(<AutomationUsageCell used={3} limit={5} isRateLimited={false} />);

    expect(screen.getByTestId('automationUsage')).toHaveTextContent('3 / 5');
  });

  it('shows a dash when usage is unknown', () => {
    render(<AutomationUsageCell limit={5} isRateLimited={false} />);

    expect(screen.getByText('—')).toBeInTheDocument();
  });

  it('shows no limit and no progress bar for an unlimited automation', () => {
    render(<AutomationUsageCell used={3} isRateLimited={false} />);

    expect(screen.getByTestId('automationUsage')).toHaveTextContent('3 / No limit');
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
  });

  it('prefers the deployment tooltip while the global limit is reached, then restores per-automation copy', async () => {
    const { rerender } = render(
      <AutomationUsageCell used={8} limit={10} isRateLimited isGlobalLimitReached />
    );

    expect(screen.getByTestId('automationUsage')).toHaveTextContent('8 / 10');
    expect(screen.getByTestId('automationLimitReached')).toBeInTheDocument();
    await focusEuiToolTipTrigger(screen.getByTestId('automationUsage'));
    expect(await screen.findByText('Deployment daily limit reached')).toBeInTheDocument();

    rerender(
      <AutomationUsageCell used={8} limit={10} isRateLimited isGlobalLimitReached={false} />
    );

    await focusEuiToolTipTrigger(screen.getByTestId('automationUsage'));
    expect(await screen.findByText('8 of 10 triggers used today')).toBeInTheDocument();
    expect(screen.queryByText('Deployment daily limit reached')).not.toBeInTheDocument();
  });
});
