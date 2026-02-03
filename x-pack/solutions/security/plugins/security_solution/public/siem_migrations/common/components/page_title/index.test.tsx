/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, waitFor } from '@testing-library/react';
import { PageTitle } from '.';
import userEvent from '@testing-library/user-event';

describe('PageTitle', () => {
  it('renders the title', () => {
    const { getByText } = render(<PageTitle title="My Title" />);
    expect(getByText('My Title')).toBeInTheDocument();
  });

  it('renders the beta badge when isBeta is true', () => {
    const { getByTestId } = render(<PageTitle title="My Title" isBeta />);
    expect(getByTestId('migrationsBetaBadge')).toBeInTheDocument();
  });

  it('does not render the beta badge when isBeta is false', () => {
    const { queryByTestId } = render(<PageTitle title="My Title" />);
    expect(queryByTestId('migrationsBetaBadge')).not.toBeInTheDocument();
  });

  it('renders the beta badge tooltip when isBeta is true', async () => {
    const { getByTestId, getByText } = render(<PageTitle title="My Title" isBeta />);

    const betaBadge = getByTestId('migrationsBetaBadge');

    await userEvent.hover(betaBadge);

    await waitFor(() => {
      expect(getByText('Technical preview')).toBeInTheDocument();
      expect(
        getByText(
          'This functionality is in technical preview and is subject to change. Please use Automatic Migration with caution in production environments.'
        )
      ).toBeInTheDocument();
    });
  });
});
