/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';

import { AlertPreviewTabs } from '.';
import { TestProviders } from '../../../../../common/mock';
import {
  ALERT_SUMMARY,
  ALERTS_LIST,
  ALERTS_PREVIEW,
  PREVIEW_MATCHED_ALERTS,
  PREVIEW_MATCHED_ALERTS_LOADING,
} from '../translations';

jest.mock('../preview_tab', () => ({
  PreviewTab: ({
    dataTestSubj,
    end,
    esqlQuery,
    start,
    tableStackBy0,
  }: {
    dataTestSubj?: string;
    end: string;
    esqlQuery?: string;
    start: string;
    tableStackBy0: string;
  }) => (
    <div
      data-test-subj={dataTestSubj ?? 'previewTab'}
      data-end={end}
      data-esql-query={esqlQuery ?? ''}
      data-start={start}
      data-table-stack-by0={tableStackBy0}
    />
  ),
}));

const defaultProps = {
  alertsPreviewStackBy0: 'kibana.alert.rule.name',
  alertSummaryStackBy0: 'kibana.alert.severity',
  setAlertsPreviewStackBy0: jest.fn(),
  setAlertSummaryStackBy0: jest.fn(),
  settings: {
    end: 'now',
    filters: [],
    query: { language: 'kuery' as const, query: '' },
    size: 100,
    start: 'now-15m',
  },
};

describe('AlertPreviewTabs', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('accordion', () => {
    it('renders the collapsible accordion', () => {
      render(
        <TestProviders>
          <AlertPreviewTabs {...defaultProps} />
        </TestProviders>
      );

      expect(
        screen
          .getByTestId('previewMatchedAlertsPanel')
          .contains(screen.getByTestId('previewMatchedAlertsAccordion'))
      ).toBe(true);
      expect(screen.getByTestId('previewMatchedAlertsAccordion')).toBeInTheDocument();
    });

    it('renders the accordion button with count when alertsCount is provided', () => {
      render(
        <TestProviders>
          <AlertPreviewTabs {...defaultProps} alertsCount={95} />
        </TestProviders>
      );

      expect(screen.getByText(PREVIEW_MATCHED_ALERTS(95))).toBeInTheDocument();
    });

    it('renders the accordion button without count when alertsCount is null', () => {
      render(
        <TestProviders>
          <AlertPreviewTabs {...defaultProps} alertsCount={null} />
        </TestProviders>
      );

      expect(screen.getByText(PREVIEW_MATCHED_ALERTS_LOADING)).toBeInTheDocument();
    });

    it('renders the accordion button without count when alertsCount is undefined', () => {
      render(
        <TestProviders>
          <AlertPreviewTabs {...defaultProps} />
        </TestProviders>
      );

      expect(screen.getByText(PREVIEW_MATCHED_ALERTS_LOADING)).toBeInTheDocument();
    });

    it('renders the accordion button with zero count', () => {
      render(
        <TestProviders>
          <AlertPreviewTabs {...defaultProps} alertsCount={0} />
        </TestProviders>
      );

      expect(screen.getByText(PREVIEW_MATCHED_ALERTS(0))).toBeInTheDocument();
    });
  });

  it('renders the Alert summary tab header', () => {
    render(
      <TestProviders>
        <AlertPreviewTabs {...defaultProps} />
      </TestProviders>
    );

    expect(screen.getByText(ALERT_SUMMARY)).toBeInTheDocument();
  });

  it('renders the Alerts preview tab header', () => {
    render(
      <TestProviders>
        <AlertPreviewTabs {...defaultProps} />
      </TestProviders>
    );

    expect(screen.getByText(ALERTS_PREVIEW)).toBeInTheDocument();
  });

  it('renders the Alerts list tab header when an override label is provided', () => {
    render(
      <TestProviders>
        <AlertPreviewTabs {...defaultProps} alertsPreviewTabLabel={ALERTS_LIST} />
      </TestProviders>
    );

    expect(screen.getByText(ALERTS_LIST)).toBeInTheDocument();
    expect(screen.queryByText(ALERTS_PREVIEW)).not.toBeInTheDocument();
  });

  describe('tab-specific content', () => {
    it('renders the alert summary PreviewTab by default', () => {
      render(
        <TestProviders>
          <AlertPreviewTabs {...defaultProps} />
        </TestProviders>
      );

      expect(screen.getByTestId('alertSummaryPreviewTab')).toBeInTheDocument();
    });

    it('does not render the alerts preview PreviewTab when alert summary is selected', () => {
      render(
        <TestProviders>
          <AlertPreviewTabs {...defaultProps} />
        </TestProviders>
      );

      expect(screen.queryByTestId('alertsPreviewTab')).not.toBeInTheDocument();
    });

    it('renders the alerts preview PreviewTab when the Alerts preview tab is clicked', () => {
      render(
        <TestProviders>
          <AlertPreviewTabs {...defaultProps} />
        </TestProviders>
      );

      fireEvent.click(screen.getByText(ALERTS_PREVIEW));

      expect(screen.getByTestId('alertsPreviewTab')).toBeInTheDocument();
    });

    it('does not render the alert summary PreviewTab when the Alerts preview tab is selected', () => {
      render(
        <TestProviders>
          <AlertPreviewTabs {...defaultProps} />
        </TestProviders>
      );

      fireEvent.click(screen.getByText(ALERTS_PREVIEW));

      expect(screen.queryByTestId('alertSummaryPreviewTab')).not.toBeInTheDocument();
    });

    it('switches back to alert summary content when the Alert summary tab is re-selected', () => {
      render(
        <TestProviders>
          <AlertPreviewTabs {...defaultProps} />
        </TestProviders>
      );

      fireEvent.click(screen.getByText(ALERTS_PREVIEW));
      fireEvent.click(screen.getByText(ALERT_SUMMARY));

      expect(screen.getByTestId('alertSummaryPreviewTab')).toBeInTheDocument();
    });
  });

  describe('independent previews', () => {
    it('passes alertSummaryStackBy0 as tableStackBy0 to the alert summary PreviewTab', () => {
      render(
        <TestProviders>
          <AlertPreviewTabs {...defaultProps} />
        </TestProviders>
      );

      expect(screen.getByTestId('alertSummaryPreviewTab')).toHaveAttribute(
        'data-table-stack-by0',
        defaultProps.alertSummaryStackBy0
      );
    });

    it('passes alertsPreviewStackBy0 as tableStackBy0 to the alerts preview PreviewTab', () => {
      render(
        <TestProviders>
          <AlertPreviewTabs {...defaultProps} />
        </TestProviders>
      );

      fireEvent.click(screen.getByText(ALERTS_PREVIEW));

      expect(screen.getByTestId('alertsPreviewTab')).toHaveAttribute(
        'data-table-stack-by0',
        defaultProps.alertsPreviewStackBy0
      );
    });

    it('maintains independent tableStackBy0 values when switching between tabs', () => {
      render(
        <TestProviders>
          <AlertPreviewTabs
            {...defaultProps}
            alertSummaryStackBy0="field.summary"
            alertsPreviewStackBy0="field.preview"
          />
        </TestProviders>
      );

      expect(screen.getByTestId('alertSummaryPreviewTab')).toHaveAttribute(
        'data-table-stack-by0',
        'field.summary'
      );

      fireEvent.click(screen.getByText(ALERTS_PREVIEW));

      expect(screen.getByTestId('alertsPreviewTab')).toHaveAttribute(
        'data-table-stack-by0',
        'field.preview'
      );
    });
  });

  describe('re-execution on time change', () => {
    it('updates the alert summary PreviewTab when start changes', () => {
      const { rerender } = render(
        <TestProviders>
          <AlertPreviewTabs {...defaultProps} />
        </TestProviders>
      );

      rerender(
        <TestProviders>
          <AlertPreviewTabs
            {...defaultProps}
            settings={{ ...defaultProps.settings, start: 'now-1h' }}
          />
        </TestProviders>
      );

      expect(screen.getByTestId('alertSummaryPreviewTab')).toHaveAttribute('data-start', 'now-1h');
    });

    it('updates the alert summary PreviewTab when end changes', () => {
      const { rerender } = render(
        <TestProviders>
          <AlertPreviewTabs {...defaultProps} />
        </TestProviders>
      );

      rerender(
        <TestProviders>
          <AlertPreviewTabs
            {...defaultProps}
            settings={{ ...defaultProps.settings, end: 'now-5m' }}
          />
        </TestProviders>
      );

      expect(screen.getByTestId('alertSummaryPreviewTab')).toHaveAttribute('data-end', 'now-5m');
    });

    it('updates the alerts preview PreviewTab when start changes', () => {
      const { rerender } = render(
        <TestProviders>
          <AlertPreviewTabs {...defaultProps} />
        </TestProviders>
      );

      fireEvent.click(screen.getByText(ALERTS_PREVIEW));

      rerender(
        <TestProviders>
          <AlertPreviewTabs
            {...defaultProps}
            settings={{ ...defaultProps.settings, start: 'now-1h' }}
          />
        </TestProviders>
      );

      expect(screen.getByTestId('alertsPreviewTab')).toHaveAttribute('data-start', 'now-1h');
    });

    it('updates the alerts preview PreviewTab when end changes', () => {
      const { rerender } = render(
        <TestProviders>
          <AlertPreviewTabs {...defaultProps} />
        </TestProviders>
      );

      fireEvent.click(screen.getByText(ALERTS_PREVIEW));

      rerender(
        <TestProviders>
          <AlertPreviewTabs
            {...defaultProps}
            settings={{ ...defaultProps.settings, end: 'now-5m' }}
          />
        </TestProviders>
      );

      expect(screen.getByTestId('alertsPreviewTab')).toHaveAttribute('data-end', 'now-5m');
    });

    it('propagates time changes to the non-selected tab when switching after a time change', () => {
      const { rerender } = render(
        <TestProviders>
          <AlertPreviewTabs {...defaultProps} />
        </TestProviders>
      );

      rerender(
        <TestProviders>
          <AlertPreviewTabs
            {...defaultProps}
            settings={{ ...defaultProps.settings, end: 'now-10m', start: 'now-2h' }}
          />
        </TestProviders>
      );

      fireEvent.click(screen.getByText(ALERTS_PREVIEW));

      expect(screen.getByTestId('alertsPreviewTab')).toHaveAttribute('data-start', 'now-2h');
    });
  });

  describe('esqlQuery propagation', () => {
    it('passes esqlQuery to the alert summary PreviewTab when provided', () => {
      const esqlQuery = 'FROM .alerts-security.alerts-default | LIMIT 50';

      render(
        <TestProviders>
          <AlertPreviewTabs {...defaultProps} esqlQuery={esqlQuery} />
        </TestProviders>
      );

      expect(screen.getByTestId('alertSummaryPreviewTab')).toHaveAttribute(
        'data-esql-query',
        esqlQuery
      );
    });

    it('passes esqlQuery to the alerts preview PreviewTab when provided', () => {
      const esqlQuery = 'FROM .alerts-security.alerts-default | LIMIT 50';

      render(
        <TestProviders>
          <AlertPreviewTabs {...defaultProps} esqlQuery={esqlQuery} />
        </TestProviders>
      );

      fireEvent.click(screen.getByText(ALERTS_PREVIEW));

      expect(screen.getByTestId('alertsPreviewTab')).toHaveAttribute('data-esql-query', esqlQuery);
    });

    it('does not pass esqlQuery to PreviewTab when not provided', () => {
      render(
        <TestProviders>
          <AlertPreviewTabs {...defaultProps} />
        </TestProviders>
      );

      expect(screen.getByTestId('alertSummaryPreviewTab')).toHaveAttribute('data-esql-query', '');
    });
  });
});
