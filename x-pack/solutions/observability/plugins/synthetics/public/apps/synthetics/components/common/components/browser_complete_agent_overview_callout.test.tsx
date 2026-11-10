/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';
import { BrowserCompleteAgentOverviewCallout } from './browser_complete_agent_overview_callout';
import { useMissingCompleteAgentLocations } from './use_missing_complete_agent_locations';
import { useLocationMonitors } from '../../settings/private_locations/hooks/use_location_monitors';

jest.mock('./use_missing_complete_agent_locations');
jest.mock('../../settings/private_locations/hooks/use_location_monitors');

const mockMissing = useMissingCompleteAgentLocations as jest.Mock;
const mockLocationMonitors = useLocationMonitors as jest.Mock;

const renderCallout = () =>
  render(
    <I18nProvider>
      <BrowserCompleteAgentOverviewCallout />
    </I18nProvider>
  );

describe('BrowserCompleteAgentOverviewCallout', () => {
  beforeEach(() => {
    mockMissing.mockReturnValue({
      locations: [
        { id: 'loc-1', label: 'Browser location' },
        { id: 'loc-2', label: 'Lightweight location' },
      ],
    });
    mockLocationMonitors.mockReturnValue({
      loading: false,
      locationMonitors: [
        { id: 'loc-1', count: 2, browserCount: 1 },
        { id: 'loc-2', count: 3, browserCount: 0 },
      ],
    });
  });

  it('warns only for locations that have browser monitors', () => {
    renderCallout();

    expect(screen.getByText(/Browser location/)).toBeInTheDocument();
    expect(screen.queryByText(/Lightweight location/)).not.toBeInTheDocument();
  });

  it('renders nothing while the location check is loading', () => {
    mockMissing.mockReturnValue({ locations: undefined });

    const { container } = renderCallout();

    expect(container).toBeEmptyDOMElement();
  });
});
