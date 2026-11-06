/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';

import {
  AlertsTab,
  ALERTS_TAB_TEST_ID,
  ALERTS_TAB_CALLOUT_TEST_ID,
  ALERTS_TAB_FILTERING_MODE_CONTROL_TEST_ID,
} from './alerts_tab';
import { TestProviders, kibanaMock } from '../../../../../common/mock/test_providers';
import { AttacksEventTypes } from '../../../../../common/lib/telemetry';
import { AlertsTable } from '../../../alerts_table';
import { useFilteredRelatedAlertIds } from './use_filtered_related_alert_ids';

jest.mock('../../../alerts_table', () => ({
  AlertsTable: jest.fn(() => <div data-test-subj="mock-alerts-table">{'AlertsTable'}</div>),
}));

jest.mock('./use_filtered_related_alert_ids', () => ({
  useFilteredRelatedAlertIds: jest.fn(),
}));

describe('AlertsTab', () => {
  const defaultProps = {
    attackAlertIds: ['alert-1', 'alert-2'],
    defaultFilters: [],
    isTableLoading: false,
  };

  const renderAlertsTab = (props = {}) =>
    render(
      <TestProviders
        startServices={
          {
            ...kibanaMock,
            telemetry: { ...kibanaMock.telemetry, reportEvent: reportEventMock },
          } as unknown as typeof kibanaMock
        }
      >
        <AlertsTab {...defaultProps} {...props} />
      </TestProviders>
    );

  const reportEventMock = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (useFilteredRelatedAlertIds as jest.Mock).mockReturnValue({
      filteredAlertIds: new Set(['alert-1', 'alert-2']),
      isLoading: false,
      isReady: true,
    });
  });

  it('renders the alerts tab', () => {
    renderAlertsTab();

    expect(screen.getByTestId(ALERTS_TAB_TEST_ID)).toBeInTheDocument();
  });

  it('renders AlertsTable with correct props', () => {
    const defaultFilters = [{ meta: { alias: 'default', disabled: false, negate: false } }];

    renderAlertsTab({ defaultFilters, isTableLoading: true });

    expect(AlertsTable).toHaveBeenCalledWith(
      expect.objectContaining({
        tableType: expect.any(String),
        inputFilters: expect.arrayContaining([
          ...defaultFilters,
          expect.objectContaining({
            meta: expect.objectContaining({ type: 'custom' }),
            query: { ids: { values: defaultProps.attackAlertIds } },
          }),
        ]),
        isLoading: true,
        pageScope: expect.any(String),
        disableAdditionalToolbarControls: true,
      }),
      {}
    );
  });

  describe('Filtering Mode and CallOut', () => {
    it('does not render callout when all alerts match the filters', () => {
      const defaultFilters = [{ meta: { alias: 'default', disabled: false, negate: false } }];
      (useFilteredRelatedAlertIds as jest.Mock).mockReturnValue({
        filteredAlertIds: new Set(['alert-1', 'alert-2']), // Matches defaultProps.attackAlertIds length
        isLoading: false,
        isReady: true,
      });

      renderAlertsTab({ defaultFilters });
      expect(screen.queryByTestId(ALERTS_TAB_CALLOUT_TEST_ID)).not.toBeInTheDocument();
    });

    it('renders callout and applies query override when there are filtered-out alerts', () => {
      const defaultFilters = [{ meta: { alias: 'default', disabled: false, negate: false } }];
      (useFilteredRelatedAlertIds as jest.Mock).mockReturnValue({
        filteredAlertIds: new Set(['alert-1']), // Missing 'alert-2'
        isLoading: false,
        isReady: true,
      });

      renderAlertsTab({ defaultFilters });

      // Callout is visible
      expect(screen.getByTestId(ALERTS_TAB_CALLOUT_TEST_ID)).toBeInTheDocument();

      // AlertsTable receives query override
      expect(AlertsTable).toHaveBeenCalledWith(
        expect.objectContaining({
          query: { ids: { values: ['alert-1', 'alert-2'] } },
          shouldHighlightRow: expect.any(Function),
        }),
        {}
      );

      // Verify shouldHighlightRow logic
      const lastCallProps = (AlertsTable as unknown as jest.Mock).mock.calls.at(-1)?.[0];
      expect(lastCallProps.shouldHighlightRow({ _id: 'alert-1' })).toBe(false); // Filtered in, not highlighted
      expect(lastCallProps.shouldHighlightRow({ _id: 'alert-2' })).toBe(true); // Filtered out, highlighted
      expect(
        lastCallProps.shouldHighlightRow({
          _id: 'alert-1',
          'kibana.alert.building_block_type': 'default',
        })
      ).toBe(true); // Preserves building block highlight
    });

    it('toggles to "Show matching alerts only" mode', () => {
      const defaultFilters = [{ meta: { alias: 'default', disabled: false, negate: false } }];
      (useFilteredRelatedAlertIds as jest.Mock).mockReturnValue({
        filteredAlertIds: new Set(['alert-1']),
        isLoading: false,
        isReady: true,
      });

      renderAlertsTab({ defaultFilters });

      const switchControl = screen.getByTestId(ALERTS_TAB_FILTERING_MODE_CONTROL_TEST_ID);
      fireEvent.click(switchControl);

      // AlertsTable no longer receives query override, relies on inputFilters
      expect(AlertsTable).toHaveBeenLastCalledWith(
        expect.objectContaining({
          inputFilters: expect.arrayContaining([
            ...defaultFilters,
            expect.objectContaining({
              meta: expect.objectContaining({ type: 'custom' }),
              query: { ids: { values: defaultProps.attackAlertIds } },
            }),
          ]),
        }),
        {}
      );

      const lastCallProps = (AlertsTable as unknown as jest.Mock).mock.calls.at(-1)?.[0];
      expect(lastCallProps.query).toBeUndefined();
      expect(lastCallProps.shouldHighlightRow).toBeUndefined();

      expect(reportEventMock).toHaveBeenCalledWith(AttacksEventTypes.ViewOptionChanged, {
        option: 'showMatchingAlertsOnly',
        enabled: true,
      });
    });
  });
});
