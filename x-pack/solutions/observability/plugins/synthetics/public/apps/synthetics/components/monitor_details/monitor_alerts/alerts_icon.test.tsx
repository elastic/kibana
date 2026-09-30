/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { MonitorAlertsIcon } from './alerts_icon';

const mockUrlParams = jest.fn();
jest.mock('../../../hooks', () => ({
  useGetUrlParams: () => mockUrlParams(),
}));

const mockUseFetchActiveAlerts = jest.fn();
jest.mock('../hooks/use_fetch_active_alerts', () => ({
  useFetchActiveAlerts: () => mockUseFetchActiveAlerts(),
}));

describe('MonitorAlertsIcon', () => {
  beforeEach(() => {
    mockUrlParams.mockReturnValue({});
    mockUseFetchActiveAlerts.mockReturnValue({ numberOfActiveAlerts: 0 });
  });

  afterEach(() => jest.clearAllMocks());

  it('renders nothing when there are no active alerts (local monitor)', () => {
    const { container } = render(<MonitorAlertsIcon />);
    expect(container).toBeEmptyDOMElement();
    expect(mockUseFetchActiveAlerts).toHaveBeenCalled();
  });

  it('renders the active-alerts badge when count > 0 (local monitor)', () => {
    mockUseFetchActiveAlerts.mockReturnValue({ numberOfActiveAlerts: 3 });

    render(<MonitorAlertsIcon />);
    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('renders nothing for remote monitors and never calls useFetchActiveAlerts', () => {
    mockUrlParams.mockReturnValue({ remoteName: 'remote-a' });
    mockUseFetchActiveAlerts.mockReturnValue({ numberOfActiveAlerts: 5 });

    const { container } = render(<MonitorAlertsIcon />);

    expect(container).toBeEmptyDOMElement();
    expect(mockUseFetchActiveAlerts).not.toHaveBeenCalled();
  });
});
