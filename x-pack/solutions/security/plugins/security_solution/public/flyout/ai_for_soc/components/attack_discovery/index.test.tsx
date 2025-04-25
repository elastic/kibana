/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useLocation } from 'react-router-dom';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { useSearchParams } from 'react-router-dom-v5-compat';
import { AttackDiscoveryWidget } from '.';
import { useAssistantContext } from '@kbn/elastic-assistant';
import { useFindAttackDiscoveries } from '../../../../attack_discovery/pages/use_find_attack_discoveries';

// Mock the custom hooks
jest.mock('@kbn/elastic-assistant', () => ({
  useAssistantContext: jest.fn(),
}));

jest.mock('../../../../attack_discovery/pages/use_find_attack_discoveries', () => ({
  useFindAttackDiscoveries: jest.fn(),
}));
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useLocation: jest.fn().mockReturnValue({ pathname: '/test' }),
}));
jest.mock('react-router-dom-v5-compat');
const mockData = {
  id: '123',
  alertIds: ['alert-id-xyz789'],
  detailsMarkdown: `
* Suspicious process \`process.name\`:\`rundll32.exe\` launched by \`process.parent.name\`:\`winword.exe\` on \`host.name\`:\`finance-ws-03\`.
* Network connection initiated by \`process.name\`:\`rundll32.exe\` to \`destination.ip\`:\`203.0.113.25\` on \`destination.port\`:\`443\`.
  `,
  mitreAttackTactics: ['TA0002', 'TA0011'],
  summaryMarkdown:
    'Possible command and control activity initiated by `process.name`:`rundll32.exe` originating from `process.parent.name`:`winword.exe` on host `host.name`:`finance-ws-03`.',
  title: 'Suspicious Rundll32 Network Activity',
};
describe('AttackDiscoveryWidget', () => {
  const mockNavigateToApp = jest.fn();
  const mockHttp = {};

  const searchParamsSetMock = jest.fn();
  const setSearchParamsMock = jest.fn();
  const searchParamsMock = { set: searchParamsSetMock };
  beforeEach(() => {
    jest.clearAllMocks();

    (useAssistantContext as jest.Mock).mockReturnValue({
      http: mockHttp,
      assistantAvailability: {
        isAssistantEnabled: true,
      },
      navigateToApp: mockNavigateToApp,
    });

    (useSearchParams as jest.Mock).mockReturnValue([searchParamsMock, setSearchParamsMock]);
  });

  it('renders loading spinner when data is being fetched', () => {
    (useFindAttackDiscoveries as jest.Mock).mockReturnValue({
      isLoading: true,
      data: null,
    });

    render(<AttackDiscoveryWidget id={'123'} />);

    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('renders no results message when no data is available', () => {
    (useFindAttackDiscoveries as jest.Mock).mockReturnValue({
      isLoading: false,
      data: null,
    });

    render(<AttackDiscoveryWidget id={'123'} />);

    expect(screen.getByTestId('no-results')).toBeInTheDocument();
  });

  it('renders attack discovery details when data is available', () => {
    (useFindAttackDiscoveries as jest.Mock).mockReturnValue({
      isLoading: false,
      data: { data: [mockData] },
    });

    render(<AttackDiscoveryWidget id={'123'} />);

    expect(screen.getByText(mockData.title)).toBeInTheDocument();
    expect(screen.getByTestId('alertsBadge')).toHaveTextContent('1');
  });

  it('navigates to attack discovery page when "View Details" button is clicked', () => {
    (useFindAttackDiscoveries as jest.Mock).mockReturnValue({
      isLoading: false,
      data: { data: [mockData] },
    });

    render(<AttackDiscoveryWidget id={'123'} />);

    fireEvent.click(screen.getByTestId('attackDiscoveryViewDetails'));

    expect(mockNavigateToApp).toHaveBeenCalledWith('security', {
      path: 'attack_discovery?id=123',
    });
    expect(searchParamsSetMock).not.toHaveBeenCalled();
    expect(setSearchParamsMock).not.toHaveBeenCalled();
  });

  it('when already on attack discovery, when "View Details" button is clicked sets search params', () => {
    (useFindAttackDiscoveries as jest.Mock).mockReturnValue({
      isLoading: false,
      data: { data: [mockData] },
    });
    (useLocation as jest.Mock).mockReturnValue({
      pathname: '/attack_discovery',
    });

    render(<AttackDiscoveryWidget id={'123'} />);

    fireEvent.click(screen.getByTestId('attackDiscoveryViewDetails'));

    expect(searchParamsSetMock).toHaveBeenCalledWith('id', '123');
    expect(setSearchParamsMock).toHaveBeenCalledWith(searchParamsMock);
    expect(mockNavigateToApp).not.toHaveBeenCalled();
  });
});
