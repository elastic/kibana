/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import { fireEvent, render } from '@testing-library/react';
import type { DataTableRecord } from '@kbn/discover-utils';
import { Header } from './header';
import type { TabType } from './tabs';
import {
  HEADER_JSON_TAB_TEST_ID,
  HEADER_OVERVIEW_TAB_TEST_ID,
  HEADER_SUMMARY_PANEL_TEST_ID,
  HEADER_TABLE_TAB_TEST_ID,
} from './constants/test_ids';

jest.mock('./components/header_title', () => ({
  HeaderTitle: ({ hit }: { hit: DataTableRecord }) => (
    <div data-test-subj="mockHeaderTitle" data-hit-id={hit.id} />
  ),
}));

jest.mock('./components/status', () => ({
  Status: ({ hit, onAttackUpdated }: { hit: DataTableRecord; onAttackUpdated: () => void }) => (
    <div
      data-test-subj="mockStatus"
      data-hit-id={hit.id}
      data-has-on-attack-updated={String(onAttackUpdated != null)}
    />
  ),
}));

jest.mock('./components/alerts_count', () => ({
  AlertsCount: ({ hit }: { hit: DataTableRecord }) => (
    <div data-test-subj="mockAlertsCount" data-hit-id={hit.id} />
  ),
}));

jest.mock('./components/assignees', () => ({
  Assignees: ({ hit, onAttackUpdated }: { hit: DataTableRecord; onAttackUpdated: () => void }) => (
    <div
      data-test-subj="mockAssignees"
      data-hit-id={hit.id}
      data-has-on-attack-updated={String(onAttackUpdated != null)}
    />
  ),
}));

jest.mock('../../shared/components/notes', () => ({
  Notes: ({ documentId, onShowNotes }: { documentId: string; onShowNotes: () => void }) => (
    <button
      type="button"
      data-test-subj="mockNotes"
      data-document-id={documentId}
      onClick={onShowNotes}
    />
  ),
}));

const createMockHit = (overrides: Partial<DataTableRecord> = {}): DataTableRecord =>
  ({
    id: 'test-attack-id',
    raw: { _id: 'test-attack-id' },
    flattened: {
      'kibana.alert.attack_discovery.title': 'Test Attack',
      '@timestamp': '2023-01-01T00:00:00.000Z',
    },
    isAnchor: false,
    ...overrides,
  } as DataTableRecord);

const createTabs = (): TabType[] => [
  {
    id: 'overview',
    name: <>{'Overview'}</>,
    content: <div data-test-subj="overview-content" />,
    'data-test-subj': HEADER_OVERVIEW_TAB_TEST_ID,
  },
  {
    id: 'table',
    name: <>{'Table'}</>,
    content: <div data-test-subj="table-content" />,
    'data-test-subj': HEADER_TABLE_TAB_TEST_ID,
  },
  {
    id: 'json',
    name: <>{'JSON'}</>,
    content: <div data-test-subj="json-content" />,
    'data-test-subj': HEADER_JSON_TAB_TEST_ID,
  },
];

describe('<Header />', () => {
  const mockHit = createMockHit();
  const onAttackUpdated = jest.fn();
  const onShowNotes = jest.fn();

  const renderHeader = (props?: Partial<Parameters<typeof Header>[0]>) =>
    render(
      <IntlProvider locale="en">
        <Header
          hit={mockHit}
          onAttackUpdated={onAttackUpdated}
          onShowNotes={onShowNotes}
          tabs={createTabs()}
          selectedTabId="overview"
          setSelectedTabId={jest.fn()}
          {...props}
        />
      </IntlProvider>
    );

  it('renders all sub-components', () => {
    const { getByTestId } = renderHeader();

    expect(getByTestId('mockHeaderTitle')).toBeInTheDocument();
    expect(getByTestId('mockStatus')).toBeInTheDocument();
    expect(getByTestId('mockAlertsCount')).toBeInTheDocument();
    expect(getByTestId('mockAssignees')).toBeInTheDocument();
    expect(getByTestId('mockNotes')).toBeInTheDocument();
    expect(getByTestId(HEADER_SUMMARY_PANEL_TEST_ID)).toBeInTheDocument();
  });

  it('does not render a share action button (matches document flyout v2)', () => {
    const { queryByTestId } = renderHeader();

    expect(queryByTestId('attack-flyout-v2-header-share-button')).not.toBeInTheDocument();
  });

  it('passes hit to all sub-components', () => {
    const { getByTestId } = renderHeader();

    expect(getByTestId('mockHeaderTitle')).toHaveAttribute('data-hit-id', 'test-attack-id');
    expect(getByTestId('mockStatus')).toHaveAttribute('data-hit-id', 'test-attack-id');
    expect(getByTestId('mockAlertsCount')).toHaveAttribute('data-hit-id', 'test-attack-id');
    expect(getByTestId('mockAssignees')).toHaveAttribute('data-hit-id', 'test-attack-id');
  });

  it('passes onAttackUpdated to status and assignees', () => {
    const { getByTestId } = renderHeader();

    expect(getByTestId('mockStatus')).toHaveAttribute('data-has-on-attack-updated', 'true');
    expect(getByTestId('mockAssignees')).toHaveAttribute('data-has-on-attack-updated', 'true');
  });

  it('passes documentId from hit.raw._id to notes', () => {
    const { getByTestId } = renderHeader();

    expect(getByTestId('mockNotes')).toHaveAttribute('data-document-id', 'test-attack-id');
  });

  it('calls onShowNotes when the notes button is clicked', () => {
    const mockOnShowNotes = jest.fn();
    const { getByTestId } = renderHeader({ onShowNotes: mockOnShowNotes });

    getByTestId('mockNotes').click();

    expect(mockOnShowNotes).toHaveBeenCalledTimes(1);
  });

  it('renders a tab button for each tab', () => {
    const { getByTestId } = renderHeader();

    expect(getByTestId(HEADER_OVERVIEW_TAB_TEST_ID)).toBeInTheDocument();
    expect(getByTestId(HEADER_TABLE_TAB_TEST_ID)).toBeInTheDocument();
    expect(getByTestId(HEADER_JSON_TAB_TEST_ID)).toBeInTheDocument();
  });

  it('marks the selected tab as selected', () => {
    const { getByTestId } = renderHeader({ selectedTabId: 'table' });

    expect(getByTestId(HEADER_TABLE_TAB_TEST_ID)).toHaveAttribute('aria-selected', 'true');
    expect(getByTestId(HEADER_OVERVIEW_TAB_TEST_ID)).toHaveAttribute('aria-selected', 'false');
  });

  it('calls setSelectedTabId with the tab id when a tab is clicked', () => {
    const setSelectedTabId = jest.fn();
    const { getByTestId } = renderHeader({ setSelectedTabId });

    fireEvent.click(getByTestId(HEADER_JSON_TAB_TEST_ID));

    expect(setSelectedTabId).toHaveBeenCalledWith('json');
  });

  it('does not render a tab bar when no tabs are provided', () => {
    const { queryByTestId } = renderHeader({ tabs: [] });

    expect(queryByTestId(HEADER_OVERVIEW_TAB_TEST_ID)).not.toBeInTheDocument();
  });
});
