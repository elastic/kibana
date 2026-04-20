/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react';
import { EntityPanelHeaderTabs, type EntityPanelTabType } from './entity_panel_tabs';

const mockTabs: EntityPanelTabType[] = [
  { id: 'overview', name: <>{'Overview'}</>, 'data-test-subj': 'overviewTab' },
  { id: 'table', name: <>{'Table'}</>, 'data-test-subj': 'tableTab' },
];

describe('EntityPanelHeaderTabs', () => {
  it('renders all tabs', () => {
    const { getByTestId } = render(
      <EntityPanelHeaderTabs
        tabs={mockTabs}
        selectedTabId="overview"
        setSelectedTabId={jest.fn()}
      />
    );

    expect(getByTestId('overviewTab')).toBeInTheDocument();
    expect(getByTestId('tableTab')).toBeInTheDocument();
  });

  it('marks the selected tab', () => {
    const { getByTestId } = render(
      <EntityPanelHeaderTabs
        tabs={mockTabs}
        selectedTabId="overview"
        setSelectedTabId={jest.fn()}
      />
    );

    expect(getByTestId('overviewTab')).toHaveAttribute('aria-selected', 'true');
    expect(getByTestId('tableTab')).toHaveAttribute('aria-selected', 'false');
  });

  it('calls setSelectedTabId when a tab is clicked', () => {
    const setSelectedTabId = jest.fn();
    const { getByTestId } = render(
      <EntityPanelHeaderTabs
        tabs={mockTabs}
        selectedTabId="overview"
        setSelectedTabId={setSelectedTabId}
      />
    );

    fireEvent.click(getByTestId('tableTab'));
    expect(setSelectedTabId).toHaveBeenCalledWith('table');
  });
});
