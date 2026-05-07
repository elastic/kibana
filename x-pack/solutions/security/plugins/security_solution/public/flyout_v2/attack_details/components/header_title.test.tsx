/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { HeaderTitle } from './header_title';
import { TestProviders } from '../../../common/mock';
import { useHeaderData } from '../../../flyout/attack_details/hooks/use_header_data';
import { useAttackDetailsContext } from '../context';
import {
  HEADER_ALERTS_BLOCK_TEST_ID,
  HEADER_ASSIGNEES_BLOCK_TEST_ID,
  HEADER_BADGE_TEST_ID,
} from '../constants/test_ids';

jest.mock('../../../flyout/attack_details/hooks/use_header_data', () => ({
  useHeaderData: jest.fn(),
}));

jest.mock('../context', () => ({
  useAttackDetailsContext: jest.fn(),
}));

jest.mock('../../shared/components/flyout_title', () => ({
  FlyoutTitle: ({ title }: { title: string }) => <div data-test-subj="flyout-title">{title}</div>,
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

jest.mock('../../shared/components/notes', () => ({
  Notes: ({ documentId, onShowNotes }: { documentId: string; onShowNotes: () => void }) => (
    <button
      type="button"
      data-test-subj="notes"
      data-document-id={documentId}
      onClick={onShowNotes}
    >
      {'notes'}
    </button>
  ),
}));

jest.mock('../../shared/components/flyout_header_block', () => ({
  FlyoutHeaderBlock: ({
    children,
    'data-test-subj': dataTestSubj,
  }: {
    children: React.ReactNode;
    'data-test-subj': string;
  }) => <div data-test-subj={dataTestSubj}>{children}</div>,
  flyoutHeaderBlockStyles: {},
}));

const mockedUseHeaderData = useHeaderData as jest.Mock;
const mockedUseAttackDetailsContext = useAttackDetailsContext as jest.Mock;

describe('HeaderTitle', () => {
  const onShowNotes = jest.fn();

  beforeEach(() => {
    mockedUseHeaderData.mockReturnValue({
      title: 'Suspicious PowerShell Activity',
      timestamp: '2024-10-10T10:00:00.000Z',
      alertsCount: 3,
    });
    mockedUseAttackDetailsContext.mockReturnValue({
      attackId: 'attack-1',
      searchHit: { _index: '.alerts-security.alerts-default', _id: 'attack-1' },
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders the attack badge', () => {
    render(
      <TestProviders>
        <HeaderTitle onShowNotes={onShowNotes} />
      </TestProviders>
    );

    expect(screen.getByTestId(HEADER_BADGE_TEST_ID)).toHaveTextContent('Attack');
  });

  it('renders the formatted timestamp when present', () => {
    render(
      <TestProviders>
        <HeaderTitle onShowNotes={onShowNotes} />
      </TestProviders>
    );

    expect(screen.getByTestId('formatted-date')).toBeInTheDocument();
  });

  it('renders the header title', () => {
    render(
      <TestProviders>
        <HeaderTitle onShowNotes={onShowNotes} />
      </TestProviders>
    );

    expect(screen.getByTestId('flyout-title')).toHaveTextContent('Suspicious PowerShell Activity');
  });

  it('renders the alerts count', () => {
    render(
      <TestProviders>
        <HeaderTitle onShowNotes={onShowNotes} />
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
        <HeaderTitle onShowNotes={onShowNotes} />
      </TestProviders>
    );

    expect(screen.queryByTestId('formatted-date')).not.toBeInTheDocument();
  });

  it('renders the assignees block next to the alerts block', () => {
    render(
      <TestProviders>
        <HeaderTitle onShowNotes={onShowNotes} />
      </TestProviders>
    );

    expect(screen.getByTestId(HEADER_ASSIGNEES_BLOCK_TEST_ID)).toBeInTheDocument();
    expect(screen.getByTestId('assignees')).toBeInTheDocument();
  });

  it('invokes onShowNotes when the notes control is activated', async () => {
    const user = userEvent.setup();
    render(
      <TestProviders>
        <HeaderTitle onShowNotes={onShowNotes} />
      </TestProviders>
    );

    await user.click(screen.getByTestId('notes'));

    expect(onShowNotes).toHaveBeenCalledTimes(1);
  });
});
