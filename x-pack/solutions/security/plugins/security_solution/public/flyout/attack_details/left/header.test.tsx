/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TestProviders } from '../../../common/mock';
import { PanelHeader } from './header';
import type { LeftPanelTabType } from './tabs';
import { INSIGHTS_TAB_ID, NOTES_TAB_ID } from '../constants/left_panel_paths';
import { INSIGHTS_TAB_TEST_ID } from '../constants/test_ids';
import { NOTES_DETAILS_TEST_ID } from '../../../flyout_v2/notes/test_ids';

jest.mock('../../shared/components/flyout_header', () => ({
  FlyoutHeader: ({ children }: { children: React.ReactNode }) => (
    <div data-test-subj="flyout-header">{children}</div>
  ),
}));

const mockTabs: LeftPanelTabType[] = [
  {
    id: INSIGHTS_TAB_ID,
    'data-test-subj': INSIGHTS_TAB_TEST_ID,
    name: <span>{'Insights'}</span>,
    content: <div>{'Insights content'}</div>,
  },
  {
    id: NOTES_TAB_ID,
    'data-test-subj': NOTES_DETAILS_TEST_ID,
    name: <span>{'Notes'}</span>,
    content: <div>{'Notes content'}</div>,
  },
];

const renderPanelHeader = (
  selectedTabId: typeof INSIGHTS_TAB_ID | typeof NOTES_TAB_ID,
  setSelectedTabId: (id: typeof INSIGHTS_TAB_ID | typeof NOTES_TAB_ID) => void = jest.fn()
) =>
  render(
    <TestProviders>
      <PanelHeader
        selectedTabId={selectedTabId}
        setSelectedTabId={setSelectedTabId}
        tabs={mockTabs}
      />
    </TestProviders>
  );

describe('PanelHeader', () => {
  it('renders FlyoutHeader', () => {
    renderPanelHeader(INSIGHTS_TAB_ID);

    expect(screen.getByTestId('flyout-header')).toBeInTheDocument();
  });

  it('renders a tab for each item in tabs', () => {
    renderPanelHeader(INSIGHTS_TAB_ID);

    expect(screen.getByTestId(INSIGHTS_TAB_TEST_ID)).toBeInTheDocument();
    expect(screen.getByTestId(NOTES_DETAILS_TEST_ID)).toBeInTheDocument();
  });

  it('renders tab names', () => {
    renderPanelHeader(INSIGHTS_TAB_ID);

    expect(screen.getByText('Insights')).toBeInTheDocument();
    expect(screen.getByText('Notes')).toBeInTheDocument();
  });

  it('calls setSelectedTabId with the tab id when a tab is clicked', async () => {
    const user = userEvent.setup();
    const setSelectedTabId = jest.fn();
    renderPanelHeader(INSIGHTS_TAB_ID, setSelectedTabId);

    await user.click(screen.getByTestId(NOTES_DETAILS_TEST_ID));

    expect(setSelectedTabId).toHaveBeenCalledTimes(1);
    expect(setSelectedTabId).toHaveBeenCalledWith(NOTES_TAB_ID);
  });

  it('calls setSelectedTabId with Insights tab id when Insights tab is clicked', async () => {
    const user = userEvent.setup();
    const setSelectedTabId = jest.fn();
    renderPanelHeader(NOTES_TAB_ID, setSelectedTabId);

    await user.click(screen.getByTestId(INSIGHTS_TAB_TEST_ID));

    expect(setSelectedTabId).toHaveBeenCalledWith(INSIGHTS_TAB_ID);
  });

  it('renders only the tabs provided in the tabs prop', () => {
    const singleTab = [mockTabs[0]];
    render(
      <TestProviders>
        <PanelHeader
          selectedTabId={INSIGHTS_TAB_ID}
          setSelectedTabId={jest.fn()}
          tabs={singleTab}
        />
      </TestProviders>
    );

    expect(screen.getByTestId(INSIGHTS_TAB_TEST_ID)).toBeInTheDocument();
    expect(screen.queryByTestId(NOTES_DETAILS_TEST_ID)).not.toBeInTheDocument();
  });
});
