/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';
import type { Mock } from 'vitest';

import { screen, render, fireEvent } from '@testing-library/react';
import React from 'react';

import { TestProviders } from '../../../common/mock';
import { OverviewNetwork } from '.';
import { useNetworkOverview } from '../../containers/overview_network';
import { SecurityPageName } from '../../../app/types';
import { useQueryToggle } from '../../../common/containers/query_toggle';

vi.mock('../../../common/components/link_to');
const mockNavigateToApp = vi.fn();
vi.mock('../../../common/lib/kibana', async () => {
  const original = await vi.importActual('../../../common/lib/kibana');

  return {
    ...original,
    useKibana: () => ({
      services: {
        application: {
          navigateToApp: mockNavigateToApp,
          getUrlForApp: vi.fn(),
        },
        data: {
          search: {
            session: {
              start: vi.fn(),
              clear: vi.fn(),
            },
          },
        },
      },
    }),
    useUiSetting$: vi.fn().mockReturnValue([]),
    useGetUserSavedObjectPermissions: vi.fn(),
  };
});

const startDate = '2020-01-20T20:49:57.080Z';
const endDate = '2020-01-21T20:49:57.080Z';
const defaultProps = {
  endDate,
  filterQuery: '',
  startDate,
  setQuery: vi.fn(),
  indexNames: [],
};

const MOCKED_RESPONSE = {
  overviewNetwork: {
    auditbeatSocket: 1,
    filebeatCisco: 1,
    filebeatNetflow: 1,
    filebeatPanw: 1,
    filebeatSuricata: 1,
    filebeatZeek: 1,
    packetbeatDNS: 1,
    packetbeatFlow: 1,
    packetbeatTLS: 1,
  },
};

vi.mock('../../../common/containers/query_toggle');
vi.mock('../../containers/overview_network');
const useNetworkOverviewMock = useNetworkOverview as Mock;
const mockUseQueryToggle = useQueryToggle as Mock;

describe('OverviewNetwork', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useNetworkOverviewMock.mockReturnValue([false, MOCKED_RESPONSE]);
    mockUseQueryToggle.mockReturnValue({ toggleStatus: true, setToggleStatus: vi.fn() });
  });

  test('it renders the expected widget title', () => {
    render(
      <TestProviders>
        <OverviewNetwork {...defaultProps} />
      </TestProviders>
    );

    expect(screen.getByTestId('header-section-title').textContent).toBe('Network events');
  });

  test('it renders an empty subtitle while loading', () => {
    useNetworkOverviewMock.mockReturnValueOnce([true, { overviewNetwork: {} }]);
    render(
      <TestProviders>
        <OverviewNetwork {...defaultProps} />
      </TestProviders>
    );

    expect(screen.getByTestId('header-panel-subtitle').textContent).toBe('');
  });

  test('it renders the expected event count in the subtitle after loading events', async () => {
    render(
      <TestProviders>
        <OverviewNetwork {...defaultProps} />
      </TestProviders>
    );

    expect(screen.getByTestId('header-panel-subtitle').textContent).toEqual('Showing: 9 events');
  });

  it('it renders View Network', () => {
    render(
      <TestProviders>
        <OverviewNetwork {...defaultProps} />
      </TestProviders>
    );

    expect(screen.getByTestId('overview-network-go-to-network-page')).toBeInTheDocument();
  });

  it('when click on View Network we call navigateToApp to make sure to navigate to right page', () => {
    render(
      <TestProviders>
        <OverviewNetwork {...defaultProps} />
      </TestProviders>
    );

    fireEvent.click(screen.getByTestId('overview-network-go-to-network-page'));

    expect(mockNavigateToApp).toHaveBeenCalledWith('securitySolutionUI', {
      path: '',
      deepLinkId: SecurityPageName.network,
    });
  });

  it('toggleStatus=true, do not skip', () => {
    render(
      <TestProviders>
        <OverviewNetwork {...defaultProps} />
      </TestProviders>
    );
    expect(useNetworkOverviewMock.mock.calls[0][0].skip).toEqual(false);
    expect(screen.queryByTestId('overview-network-stats')).toBeInTheDocument();
  });
  it('toggleStatus=false, skip', () => {
    mockUseQueryToggle.mockReturnValue({ toggleStatus: false, setToggleStatus: vi.fn() });
    render(
      <TestProviders>
        <OverviewNetwork {...defaultProps} />
      </TestProviders>
    );
    expect(useNetworkOverviewMock.mock.calls[0][0].skip).toEqual(true);
    expect(screen.queryByTestId('overview-network-stats')).not.toBeInTheDocument();
  });
});
