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
  it('names the row limit with thousands separators and every truncated type', () => {
    render(<EntityTableTruncationCallout typeNames={['Host', 'K8s Deployment']} />);

    const callout = screen.getByTestId('entityInventoryTruncationCallout');
    expect(callout).toHaveTextContent('9,999 entity limit');
    expect(callout).toHaveTextContent(
      'We can only show 9,999 entities at a time. Use filters to slice and dice further your data.'
    );
    expect(callout).toHaveTextContent('Entity types over the limit: Host and K8s Deployment');
  });

  it('joins three or more type names as a localized list', () => {
    render(<EntityTableTruncationCallout typeNames={['Host', 'K8s Deployment', 'Service']} />);

    expect(screen.getByTestId('entityInventoryTruncationCallout')).toHaveTextContent(
      'Entity types over the limit: Host, K8s Deployment, and Service'
    );
  });

  it('announces its title and text to screen readers when it appears', async () => {
    render(<EntityTableTruncationCallout typeNames={['Host']} />);

    const callout = screen.getByTestId('entityInventoryTruncationCallout');
    await waitFor(() =>
      expect(within(callout).getByRole('status')).toHaveTextContent('9,999 entity limit')
    );
    expect(within(callout).getByRole('status')).toHaveTextContent(
      'Entity types over the limit: Host'
    );
  });
});
