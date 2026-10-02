/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { SeverityBadge } from './severity_badge';

describe('SeverityBadge', () => {
  it('renders the low severity for a score of 0', () => {
    render(<SeverityBadge score={0} />);

    expect(screen.queryByText('None')).not.toBeInTheDocument();
    expect(screen.getByText('Low')).toBeInTheDocument();
  });
});
