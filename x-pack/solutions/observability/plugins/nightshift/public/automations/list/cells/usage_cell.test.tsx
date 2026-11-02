/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
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

  it('shows a dash without a limit', () => {
    render(<AutomationUsageCell used={3} isRateLimited={false} />);

    expect(screen.getByText('—')).toBeInTheDocument();
  });
});
