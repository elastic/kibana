/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, waitFor, within } from '@testing-library/react';
import { EntityTableTruncationCallout } from './entity_table_callouts';

describe('EntityTableTruncationCallout', () => {
  it('names the limit and asks to filter', () => {
    render(<EntityTableTruncationCallout />);

    const callout = screen.getByTestId('entityInventoryTruncationCallout');
    expect(callout).toHaveTextContent('Entity limit reached');
    expect(callout).toHaveTextContent(
      'We can only show a limited number of entities at a time. Use filters to slice and dice further your data.'
    );
  });

  it('announces its title and text to screen readers when it appears', async () => {
    render(<EntityTableTruncationCallout />);

    const callout = screen.getByTestId('entityInventoryTruncationCallout');
    await waitFor(() =>
      expect(within(callout).getByRole('status')).toHaveTextContent('Entity limit reached')
    );
    expect(within(callout).getByRole('status')).toHaveTextContent(
      'We can only show a limited number of entities at a time.'
    );
  });
});
