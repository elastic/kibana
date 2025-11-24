/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useLocation } from 'react-router-dom';
import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import type { AttackDiscoveryPanelProps } from './attack_discovery_panel';
import {
  ATTACK_DISCOVERY_VIEW_DETAILS_BUTTON_TEST_ID,
  AttackDiscoveryPanel,
} from './attack_discovery_panel';
import { useNavigateTo } from '@kbn/security-solution-navigation';
import { useFindAttackDiscoveries } from '../../../attack_discovery/pages/use_find_attack_discoveries';
import { useIdsFromUrl } from '../../../attack_discovery/pages/results/history/use_ids_from_url';
import { useAttackDiscoveryHistoryTimerange } from '../../../attack_discovery/pages/use_attack_discovery_history_timerange';
import { ATTACK_DISCOVERY_DETAILS_ALERTS_BADGE_TEST_ID } from './attack_discovery_details';

jest.mock('../../../attack_discovery/pages/use_find_attack_discoveries', () => ({
  useFindAttackDiscoveries: jest.fn(),
}));
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useLocation: jest.fn().mockReturnValue({ pathname: '/test' }),
}));
jest.mock('../../../attack_discovery/pages/results/history/use_ids_from_url');
jest.mock('../../../attack_discovery/pages/use_attack_discovery_history_timerange');
jest.mock('@kbn/security-solution-navigation');

const mockSetIdsUrl = jest.fn();
const attackDiscovery = {
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
  connectorId: '789',
  connectorName: 'Something',
  generationUuid: '567',
  timestamp: '2025-04-29T20:30:00.000Z',
};
const defaultProps: AttackDiscoveryPanelProps = {
  attackDiscovery,
  start: '2025-04-29T20:00:00.000Z',
  end: '2025-04-29T21:00:00.000Z',
};
const mockSetHistoryEnd = jest.fn();
const mockSetHistoryStart = jest.fn();

describe('AttackDiscoveryPanel', () => {
  const mockNavigateTo = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (useNavigateTo as jest.Mock).mockReturnValue({
      navigateTo: mockNavigateTo,
    });
    (useIdsFromUrl as jest.Mock).mockReturnValue({
      setIdsUrl: mockSetIdsUrl,
    });
    (useAttackDiscoveryHistoryTimerange as jest.Mock).mockReturnValue({
      setHistoryEnd: mockSetHistoryEnd,
      setHistoryStart: mockSetHistoryStart,
    });
  });

  it('should render attack discovery details', () => {
    render(<AttackDiscoveryPanel {...defaultProps} />);

    expect(screen.getByText(attackDiscovery.title)).toBeInTheDocument();
    expect(screen.getByTestId(ATTACK_DISCOVERY_DETAILS_ALERTS_BADGE_TEST_ID)).toHaveTextContent(
      '1'
    );
  });

  it('should navigate to attack discovery page when "View Details" button is clicked', () => {
    (useFindAttackDiscoveries as jest.Mock).mockReturnValue({
      isLoading: false,
      data: { data: [attackDiscovery] },
    });

    render(<AttackDiscoveryPanel {...defaultProps} />);

    fireEvent.click(screen.getByTestId(ATTACK_DISCOVERY_VIEW_DETAILS_BUTTON_TEST_ID));

    expect(mockNavigateTo).toHaveBeenCalledWith({
      path: 'attack_discovery?id=123',
    });

    expect(mockSetHistoryEnd).toHaveBeenCalledWith(defaultProps.end);
    expect(mockSetHistoryStart).toHaveBeenCalledWith(defaultProps.start);
    expect(mockSetIdsUrl).not.toHaveBeenCalled();
  });

  it('when already on attack discovery, when "View Details" button is clicked sets search params', () => {
    (useLocation as jest.Mock).mockReturnValue({
      pathname: '/attack_discovery',
    });

    render(<AttackDiscoveryPanel {...defaultProps} />);

    fireEvent.click(screen.getByTestId(ATTACK_DISCOVERY_VIEW_DETAILS_BUTTON_TEST_ID));

    expect(mockSetIdsUrl).toHaveBeenCalledWith(['123']);
    expect(mockSetHistoryEnd).toHaveBeenCalledWith(defaultProps.end);
    expect(mockSetHistoryStart).toHaveBeenCalledWith(defaultProps.start);
    expect(mockNavigateTo).not.toHaveBeenCalled();
  });
});
