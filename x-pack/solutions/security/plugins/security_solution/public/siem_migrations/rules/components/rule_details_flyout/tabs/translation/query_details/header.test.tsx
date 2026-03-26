/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react';
import { QueryHeader } from './header';

describe('QueryHeader', () => {
  it('renders the title', () => {
    const { getByTestId } = render(<QueryHeader title="My Title" tooltip="My Tooltip" />);
    expect(getByTestId('headerTitle')).toBeInTheDocument();
    expect(getByTestId('headerTitle')).toHaveTextContent('My Title');
  });

  it('renders the tooltip icon', () => {
    const { getByTestId } = render(<QueryHeader title="My Title" tooltip="My Tooltip" />);
    expect(getByTestId('headerIconTip')).toBeInTheDocument();
  });

  it('shows the tooltip content on hover', async () => {
    const { getByTestId, getByText } = render(
      <QueryHeader title="My Title" tooltip="My Tooltip" />
    );
    const tooltipIcon = getByTestId('headerIconTip');
    fireEvent.mouseOver(tooltipIcon);

    await waitFor(() => {
      expect(getByText('My Tooltip')).toBeInTheDocument();
    });
  });
});
