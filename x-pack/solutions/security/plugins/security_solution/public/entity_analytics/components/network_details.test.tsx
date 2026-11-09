/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { NetworkDetails } from './network_details';
import { TestProviders } from '../../common/mock';
import { FlowTargetSourceDest } from '../../../common/search_strategy/security_solution/network';
import { useFlyoutApi } from '../../flyout_v2/use_flyout_api';
import { createFlyoutApiMock } from '../../flyout_v2/use_flyout_api.mock';
import { FLYOUT_ORIGIN } from '../../common/lib/telemetry';

jest.mock('../../flyout_v2/use_flyout_api');

describe('NetworkDetails', () => {
  let flyoutApi: ReturnType<typeof createFlyoutApiMock>;

  beforeEach(() => {
    jest.clearAllMocks();
    flyoutApi = createFlyoutApiMock();
    jest.mocked(useFlyoutApi).mockReturnValue(flyoutApi);
  });

  it('renders the ip address', () => {
    render(
      <TestProviders>
        <NetworkDetails ip="1.2.3.4" />
      </TestProviders>
    );

    expect(screen.getByText('1.2.3.4')).toBeInTheDocument();
  });

  it('opens the network flyout', async () => {
    render(
      <TestProviders>
        <NetworkDetails ip="1.2.3.4" />
      </TestProviders>
    );

    await userEvent.click(screen.getByTestId('network-details'));

    expect(flyoutApi.openNetworkFlyout).toHaveBeenCalledWith({
      ip: '1.2.3.4',
      flowTarget: FlowTargetSourceDest.source,
      origin: FLYOUT_ORIGIN.TABLE_FIELD_LINK,
    });
  });

  it('renders the empty tag and opens no flyout when ip is not provided', () => {
    render(
      <TestProviders>
        <NetworkDetails ip={null} />
      </TestProviders>
    );

    expect(screen.getByText('—')).toBeInTheDocument();
    expect(screen.queryByTestId('network-details')).not.toBeInTheDocument();
    expect(flyoutApi.openNetworkFlyout).not.toHaveBeenCalled();
  });
});
