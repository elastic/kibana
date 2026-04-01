/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render, screen } from '@testing-library/react';
import React from 'react';

import { StatusBadge } from './get_status_badge';
import type { GenerationStatus } from '../types';

describe('StatusBadge', () => {
  const statusCases: Array<{ status: GenerationStatus; expectedLabel: string }> = [
    { status: 'failed', expectedLabel: 'Failed' },
    { status: 'running', expectedLabel: 'Running' },
    { status: 'succeeded', expectedLabel: 'Succeeded' },
    { status: 'unknown', expectedLabel: 'Unknown' },
  ];

  it.each(statusCases)(
    'renders "$expectedLabel" for status "$status"',
    ({ expectedLabel, status }) => {
      render(<StatusBadge status={status} />);

      expect(screen.getByText(expectedLabel)).toBeInTheDocument();
    }
  );
});
