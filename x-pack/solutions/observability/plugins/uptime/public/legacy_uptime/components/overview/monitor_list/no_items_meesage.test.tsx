/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { screen } from '@testing-library/react';
import { render } from '../../../lib/helper/rtl_helpers';
import { NoItemsMessage } from './no_items_message';

describe('NoItemsMessage', () => {
  it('returns loading message while loading', () => {
    render(<NoItemsMessage loading />);

    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('returns loading message when filters are defined and loading', () => {
    render(<NoItemsMessage loading filters={'es'} />);

    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('returns no monitors selected when filters are defined and not loading', () => {
    render(<NoItemsMessage loading={false} filters={'es'} />);

    expect(screen.getByText('No monitors found for selected filter criteria')).toBeInTheDocument();
  });

  it('returns no data message when no filters and not loading', () => {
    render(<NoItemsMessage loading={false} filters={''} />);

    expect(screen.getByText('No uptime monitors found')).toBeInTheDocument();
  });
});
