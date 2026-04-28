/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ATTACK_DISCOVERY_AD_HOC_RULE_ID } from '@kbn/elastic-assistant-common';

import { HeaderTitle } from './header_title';
import { TestProviders } from '../../../common/mock';
import { useHeaderData } from '../hooks/use_header_data';
import { useAttackDetailsContext } from '../context';
import { useNavigateToAttackDetailsLeftPanel } from '../hooks/use_navigate_to_attack_details_left_panel';
import {
  HEADER_ALERTS_BLOCK_TEST_ID,
  HEADER_ASSIGNEES_BLOCK_TEST_ID,
  HEADER_BADGE_TEST_ID,
  HEADER_TITLE_SCHEDULE_LINK_TEST_ID,
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
    <div data-test-subj="flyout-title" data-is-link={isLink === true ? 'true' : 'false'}>
      {title}
    </div>
  ),
}));

jest.mock('../../../attack_discovery/pages/settings_flyout/schedule/details_flyout', () => ({
  DetailsFlyout: ({ scheduleId, onClose }: { scheduleId: string; onClose: () => void }) => (
    <div data-test-subj="schedule-details-flyout-mock" data-schedule-id={scheduleId}>
      <button type="button" data-test-subj="schedule-details-close" onClick={onClose} />
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

const mockedUseHeaderData = useHeaderData as jest.Mock;
const mockedUseAttackDetailsContext = useAttackDetailsContext as jest.Mock;
const mockedUseNavigateToAttackDetailsLeftPanel = useNavigateToAttackDetailsLeftPanel as jest.Mock;

describe('HeaderTitle', () => {
  beforeEach(() => {
    mockedUseHeaderData.mockReturnValue({
      title: 'Suspicious PowerShell Activity',
      timestamp: '2024-10-10T10:00:00.000Z',
      alertsCount: 3,
    });
    mockedUseAttackDetailsContext.mockReturnValue({
      attackId: 'attack-1',
      attack: { alertRuleUuid: ATTACK_DISCOVERY_AD_HOC_RULE_ID },
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

  it('renders the header title', () => {
    render(
      <TestProviders>
        <HeaderTitle />
      </TestProviders>
    );

    expect(screen.getByTestId('flyout-title')).toHaveTextContent('Suspicious PowerShell Activity');
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

  it('renders the title as a plain title when the attack is ad hoc', () => {
    render(
      <TestProviders>
        <HeaderTitle />
      </TestProviders>
    );

    expect(screen.queryByTestId(HEADER_TITLE_SCHEDULE_LINK_TEST_ID)).not.toBeInTheDocument();
    expect(screen.getByTestId('flyout-title')).toHaveAttribute('data-is-link', 'false');
  });

  it('renders the title as a link for scheduled attacks', () => {
    mockedUseAttackDetailsContext.mockReturnValue({
      attackId: 'attack-1',
      attack: { alertRuleUuid: 'attack-discovery-schedule-rule-uuid' },
      searchHit: { _index: '.alerts-security.alerts-default', _id: 'attack-1' },
    });

    render(
      <TestProviders>
        <HeaderTitle />
      </TestProviders>
    );

    expect(screen.getByTestId(HEADER_TITLE_SCHEDULE_LINK_TEST_ID)).toBeInTheDocument();
    expect(screen.getByTestId('flyout-title')).toHaveAttribute('data-is-link', 'true');
  });

  it('opens the schedule details flyout when the title link is clicked', async () => {
    mockedUseAttackDetailsContext.mockReturnValue({
      attackId: 'attack-1',
      attack: { alertRuleUuid: 'attack-discovery-schedule-rule-uuid' },
      searchHit: { _index: '.alerts-security.alerts-default', _id: 'attack-1' },
    });

    const user = userEvent.setup();

    render(
      <TestProviders>
        <HeaderTitle />
      </TestProviders>
    );

    await user.click(screen.getByTestId(HEADER_TITLE_SCHEDULE_LINK_TEST_ID));

    expect(screen.getByTestId('schedule-details-flyout-mock')).toHaveAttribute(
      'data-schedule-id',
      'attack-discovery-schedule-rule-uuid'
    );
  });
});
