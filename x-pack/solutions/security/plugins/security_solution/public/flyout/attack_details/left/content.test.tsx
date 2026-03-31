/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { TestProviders } from '../../../common/mock';
import { PanelContent } from './content';
import type { LeftPanelTabType } from './tabs';
import type { LeftPanelPaths } from '../constants/left_panel_paths';
import { INSIGHTS_TAB_ID, NOTES_TAB_ID } from '../constants/left_panel_paths';

jest.mock('../../shared/components/flyout_body', () => ({
  FlyoutBody: ({ children }: { children: React.ReactNode }) => (
    <div data-test-subj="flyout-body">{children}</div>
  ),
}));

const mockTabs: LeftPanelTabType[] = [
  {
    id: INSIGHTS_TAB_ID,
    'data-test-subj': 'insights-tab',
    name: <span>{'Insights'}</span>,
    content: <div data-test-subj="insights-tab-content">{'Insights content'}</div>,
  },
  {
    id: NOTES_TAB_ID,
    'data-test-subj': 'notes-tab',
    name: <span>{'Notes'}</span>,
    content: <div data-test-subj="notes-tab-content">{'Notes content'}</div>,
  },
];

const renderPanelContent = (selectedTabId: typeof INSIGHTS_TAB_ID | typeof NOTES_TAB_ID) =>
  render(
    <TestProviders>
      <PanelContent selectedTabId={selectedTabId} tabs={mockTabs} />
    </TestProviders>
  );

describe('PanelContent', () => {
  it('renders FlyoutBody', () => {
    renderPanelContent(INSIGHTS_TAB_ID);

    expect(screen.getByTestId('flyout-body')).toBeInTheDocument();
  });

  it('renders the content of the selected Insights tab', () => {
    renderPanelContent(INSIGHTS_TAB_ID);

    expect(screen.getByTestId('insights-tab-content')).toBeInTheDocument();
    expect(screen.getByText('Insights content')).toBeInTheDocument();
    expect(screen.queryByTestId('notes-tab-content')).not.toBeInTheDocument();
  });

  it('renders the content of the selected Notes tab', () => {
    renderPanelContent(NOTES_TAB_ID);

    expect(screen.getByTestId('notes-tab-content')).toBeInTheDocument();
    expect(screen.getByText('Notes content')).toBeInTheDocument();
    expect(screen.queryByTestId('insights-tab-content')).not.toBeInTheDocument();
  });

  it('renders nothing when selectedTabId does not match any tab', () => {
    render(
      <TestProviders>
        <PanelContent selectedTabId={'nonexistent' as LeftPanelPaths} tabs={mockTabs} />
      </TestProviders>
    );

    expect(screen.getByTestId('flyout-body')).toBeInTheDocument();
    expect(screen.queryByTestId('insights-tab-content')).not.toBeInTheDocument();
    expect(screen.queryByTestId('notes-tab-content')).not.toBeInTheDocument();
  });

  it('renders content when tabs array has a single tab matching selectedTabId', () => {
    const singleTab = [mockTabs[0]];
    render(
      <TestProviders>
        <PanelContent selectedTabId={INSIGHTS_TAB_ID} tabs={singleTab} />
      </TestProviders>
    );

    expect(screen.getByTestId('insights-tab-content')).toBeInTheDocument();
    expect(screen.getByText('Insights content')).toBeInTheDocument();
  });
});
