/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { CellTooltip } from './cell_tooltip';

describe('CellTooltip', () => {
  it('should render tooltipContent on hover', async () => {
    render(<CellTooltip value="cell value" tooltipContent="tooltip content" />);

    fireEvent.mouseOver(screen.getByText('cell value'));

    await waitFor(() => screen.getByTestId('cell-tooltip'));

    expect(screen.getByText('tooltip content')).toBeInTheDocument();
  });
});
