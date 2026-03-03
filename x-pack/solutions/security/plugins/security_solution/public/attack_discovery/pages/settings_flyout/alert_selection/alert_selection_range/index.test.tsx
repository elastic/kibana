/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render, screen } from '@testing-library/react';
import React from 'react';

import { AlertSelectionRange } from '.';
import { SEND_FEWER_ALERTS } from '../translations';

jest.mock('../../../../../common/lib/kibana');

const defaultProps = {
  maxAlerts: 100,
  setMaxAlerts: jest.fn(),
};

describe('AlertSelectionRange', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the AlertsRange', () => {
    render(<AlertSelectionRange {...defaultProps} />);

    expect(screen.getByTestId('alertsRange')).toBeInTheDocument();
  });

  it('renders the send fewer alerts text', () => {
    render(<AlertSelectionRange {...defaultProps} />);

    expect(screen.getByTestId('sendFewerAlerts')).toHaveTextContent(SEND_FEWER_ALERTS);
  });
});
