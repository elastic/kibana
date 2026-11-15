/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';

import { EntityAnalyticsErrorPanel } from './entity_analytics_error_panel';
import { ENTITY_ANALYTICS_ERROR_PANEL_TEST_ID } from '../test_ids';

describe('EntityAnalyticsErrorPanel', () => {
  it('renders nothing when there are no errors', () => {
    const { container } = render(<EntityAnalyticsErrorPanel entityStoreErrors={[]} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders error callout with entity store errors', () => {
    render(<EntityAnalyticsErrorPanel entityStoreErrors={['Entity store install failed']} />);
    expect(screen.getByTestId(ENTITY_ANALYTICS_ERROR_PANEL_TEST_ID)).toBeInTheDocument();
    expect(screen.getByText('Entity store install failed')).toBeInTheDocument();
  });
});
