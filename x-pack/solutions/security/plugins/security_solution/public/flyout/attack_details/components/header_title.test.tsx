/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';

import { HeaderTitle } from './header_title';
import { TestProviders } from '../../../common/mock';
import { useHeaderData } from '../hooks/use_header_data';
import { useAttackDetailsContext } from '../context';
import { useNavigateToAttackDetailsLeftPanel } from '../hooks/use_navigate_to_attack_details_left_panel';
import { ATTACK_DISCOVERY_AD_HOC_RULE_ID } from '@kbn/elastic-assistant-common';
import {
  HEADER_ALERTS_BLOCK_TEST_ID,
  HEADER_ASSIGNEES_BLOCK_TEST_ID,
  HEADER_BADGE_TEST_ID,
} from '../constants/test_ids';

jest.mock('../hooks/use_header_data', () => ({
  useHeaderData: jest.fn(),
}));

jest.mock('../context', () => ({
  useAttackDetailsContext: jest.fn(),
}));

jest.mock('../hooks/use_navigate_to_attack_details_left_panel', () => ({
  useNavigateToAttackDetailsLeftPanel: jest.fn(),
}));

jest.mock('../../../flyout_v2/shared/components/flyout_title', () => ({
  FlyoutTitle: ({ title, isLink }: { title: string; isLink?: boolean }) => (
    <div data-test-subj="flyout-title" data-is-link={isLink}>
      {title}
    </div>
  ),
}));

jest.mock('../../../common/components/formatted_date', () => ({
  PreferenceFormattedDate: ({ value }: { value: Date }) => (
    <div data-test-subj="formatted-date">{value.toISOString()}</div>
  ),
}));

jest.mock('./status', () => ({
  Status: () => <div data-test-subj="status" />,
}));

jest.mock('./assignees', () => ({
  Assignees: () => <div data-test-subj="assignees" />,
}));

jest.mock('../../../flyout_v2/shared/components/notes', () => ({
  Notes: ({ documentId }: { documentId: string }) => (
    <div data-test-subj="notes" data-document-id={documentId} />
  ),
}));

jest.mock('../../../flyout_v2/shared/components/alert_header_block', () => ({
  AlertHeaderBlock: ({
    children,
    'data-test-subj': dataTestSubj,
  }: {
    children: React.ReactNode;
    'data-test-subj': string;
  }) => <div data-test-subj={dataTestSubj}>{children}</div>,
}));

jest.mock('../../../attack_discovery/pages/settings_flyout/schedule/details_flyout', () => ({
  DetailsFlyout: ({ scheduleId, onClose }: { scheduleId: string; onClose: () => void }) => (
    <div data-test-subj="schedule-details-flyout">
      <span data-test-subj="schedule-id">{scheduleId}</span>
      <button data-test-subj="close-schedule-details" onClick={onClose} />
    </div>
  ),
}));

const mockedUseHeaderData = useHeaderData as jest.Mock;
const mockedUseAttackDetailsContext = useAttackDetailsContext as jest.Mock;
const mockedUseNavigateToAttackDetailsLeftPanel = useNavigateToAttackDetailsLeftPanel as jest.Mock;

describe('HeaderTitle', () => {
  beforeEach(() => {
    mockedUseHeaderData.mockReturnValue({
      title: 'Suspicious PowerShell Activity',
      timestamp: '2024-10-10T10:00:00.000Z',
      alertsCount: 3,
      alertRuleUuid: 'schedule-id-123',
    });
    mockedUseAttackDetailsContext.mockReturnValue({
      attackId: 'attack-1',
      searchHit: { _index: '.alerts-security.alerts-default', _id: 'attack-1' },
    });
    mockedUseNavigateToAttackDetailsLeftPanel.mockReturnValue(jest.fn());
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders the attack badge', () => {
    render(
      <TestProviders>
        <HeaderTitle />
      </TestProviders>
    );

    expect(screen.getByTestId(HEADER_BADGE_TEST_ID)).toHaveTextContent('Attack');
  });

  it('renders the formatted timestamp when present', () => {
    render(
      <TestProviders>
        <HeaderTitle />
      </TestProviders>
    );

    expect(screen.getByTestId('formatted-date')).toBeInTheDocument();
  });

  it('renders the header title as a link when alertRuleUuid is valid', () => {
    render(
      <TestProviders>
        <HeaderTitle />
      </TestProviders>
    );

    const titleEl = screen.getByTestId('flyout-title');
    expect(titleEl).toHaveTextContent('Suspicious PowerShell Activity');
    expect(titleEl).toHaveAttribute('data-is-link', 'true');
  });

  it('renders the header title as plain text when alertRuleUuid is ad-hoc', () => {
    mockedUseHeaderData.mockReturnValue({
      title: 'Ad-hoc Attack',
      timestamp: '2024-10-10T10:00:00.000Z',
      alertsCount: 3,
      alertRuleUuid: ATTACK_DISCOVERY_AD_HOC_RULE_ID,
    });
    render(
      <TestProviders>
        <HeaderTitle />
      </TestProviders>
    );

    const titleEl = screen.getByTestId('flyout-title');
    expect(titleEl).toHaveTextContent('Ad-hoc Attack');
    expect(titleEl).not.toHaveAttribute('data-is-link', 'true');
  });

  it('opens and closes the schedule details flyout when title is clicked', () => {
    render(
      <TestProviders>
        <HeaderTitle />
      </TestProviders>
    );

    expect(screen.queryByTestId('schedule-details-flyout')).not.toBeInTheDocument();

    fireEvent.click(screen.getByTestId('flyout-title'));

    expect(screen.getByTestId('schedule-details-flyout')).toBeInTheDocument();
    expect(screen.getByTestId('schedule-id')).toHaveTextContent('schedule-id-123');

    fireEvent.click(screen.getByTestId('close-schedule-details'));

    expect(screen.queryByTestId('schedule-details-flyout')).not.toBeInTheDocument();
  });

  it('renders the alerts count', () => {
    render(
      <TestProviders>
        <HeaderTitle />
      </TestProviders>
    );

    expect(screen.getByTestId(HEADER_ALERTS_BLOCK_TEST_ID)).toHaveTextContent('3');
  });

  it('does not render the timestamp when it is missing', () => {
    mockedUseHeaderData.mockReturnValue({
      title: 'Attack title',
      timestamp: undefined,
      alertsCount: 0,
    });

    render(
      <TestProviders>
        <HeaderTitle />
      </TestProviders>
    );

    expect(screen.queryByTestId('formatted-date')).not.toBeInTheDocument();
  });

  it('renders the assignees block next to the alerts block', () => {
    render(
      <TestProviders>
        <HeaderTitle />
      </TestProviders>
    );

    expect(screen.getByTestId(HEADER_ASSIGNEES_BLOCK_TEST_ID)).toBeInTheDocument();
    expect(screen.getByTestId('assignees')).toBeInTheDocument();
  });
});
