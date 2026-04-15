/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render, screen } from '@testing-library/react';
import React from 'react';

import { AlertsTab, ALERTS_TAB_TEST_ID } from './alerts_tab';
import { TestProviders } from '../../../../../common/mock/test_providers';
import { AlertsTable } from '../../../alerts_table';

jest.mock('../../../alerts_table', () => ({
  AlertsTable: jest.fn(() => <div data-test-subj="mock-alerts-table">{'AlertsTable'}</div>),
}));

describe('AlertsTab', () => {
  const defaultProps = {
    groupingFilters: [],
    defaultFilters: [],
    isTableLoading: false,
  };

  const renderAlertsTab = (props = {}) =>
    render(
      <TestProviders>
        <AlertsTab {...defaultProps} {...props} />
      </TestProviders>
    );

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the alerts tab', () => {
    renderAlertsTab();

    expect(screen.getByTestId(ALERTS_TAB_TEST_ID)).toBeInTheDocument();
  });

  it('renders AlertsTable with correct props', () => {
    const groupingFilters = [{ meta: { alias: 'group', disabled: false, negate: false } }];
    const defaultFilters = [{ meta: { alias: 'default', disabled: false, negate: false } }];

    renderAlertsTab({ groupingFilters, defaultFilters, isTableLoading: true });

    expect(AlertsTable).toHaveBeenCalledWith(
      expect.objectContaining({
        tableType: expect.any(String),
        inputFilters: expect.arrayContaining([...defaultFilters, ...groupingFilters]),
        isLoading: true,
        pageScope: expect.any(String),
        disableAdditionalToolbarControls: true,
      }),
      {}
    );
  });

  it('passes disableAdditionalToolbarControls as false when groupingFilters is empty', () => {
    renderAlertsTab({ groupingFilters: [] });

    expect(AlertsTable).toHaveBeenCalledWith(
      expect.objectContaining({
        disableAdditionalToolbarControls: false,
      }),
      {}
    );
  });

  it('passes disableAdditionalToolbarControls as true when groupingFilters is not empty', () => {
    const groupingFilters = [{ meta: { alias: 'group', disabled: false, negate: false } }];

    renderAlertsTab({ groupingFilters });

    expect(AlertsTable).toHaveBeenCalledWith(
      expect.objectContaining({
        disableAdditionalToolbarControls: true,
      }),
      {}
    );
  });
});
