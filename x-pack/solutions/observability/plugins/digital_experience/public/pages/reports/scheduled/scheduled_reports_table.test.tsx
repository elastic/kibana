/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { EuiProvider } from '@elastic/eui';
import { I18nProvider } from '@kbn/i18n-react';
import {
  DIGITAL_EXPERIENCE_FEATURE_ID,
  DIGITAL_EXPERIENCE_UI_PRIVILEGES,
} from '../../../../common/feature';
import type { ScheduledReport } from '../../../../common/types/scheduled_reports';
import { useFormatters } from '../../../hooks/use_formatters';
import { useKibanaServices } from '../../../hooks/use_kibana_services';
import { ScheduledReports } from './scheduled_reports_table';
import { useScheduledReportActions } from './use_scheduled_report_actions';
import { useScheduledReports } from './use_scheduled_reports';

jest.mock('./use_scheduled_reports');
jest.mock('./use_scheduled_report_actions');
jest.mock('../../../hooks/use_formatters');
jest.mock('../../../hooks/use_kibana_services');
jest.mock('./schedule_report_flyout', () => ({
  ScheduleReportFlyout: ({
    serviceName,
    report,
    onClose,
    onSaved,
  }: {
    serviceName: string;
    report?: ScheduledReport;
    onClose: () => void;
    onSaved?: () => void;
  }) => (
    <div data-test-subj="mockScheduleFlyout">
      <span>{report ? `edit:${report.id}` : `create:${serviceName}`}</span>
      <button onClick={() => onSaved?.()}>save</button>
      <button onClick={onClose}>close</button>
    </div>
  ),
}));

const REPORT: ScheduledReport = {
  id: 'system-digital-experience-scorecard-report-1',
  reportType: 'scorecard',
  serviceName: 'shop',
  name: 'Weekly scorecard: shop',
  environment: 'production',
  lookbackDays: 7,
  schedule: { frequency: 'WEEKLY', weekday: 'MO', hour: 9, minute: 0, timeZone: 'UTC' },
  connectorId: 'email-1',
  recipients: ['team@example.com'],
  enabled: true,
  lastRun: { status: 'completed', startedAt: '2026-11-23T09:00:00.000Z' },
};

const refresh = jest.fn();
const actions = { setEnabled: jest.fn(), run: jest.fn(), remove: jest.fn() };

const setCapabilities = (canManage: boolean) => {
  jest.mocked(useKibanaServices).mockReturnValue({
    application: {
      capabilities: {
        [DIGITAL_EXPERIENCE_FEATURE_ID]: {
          [DIGITAL_EXPERIENCE_UI_PRIVILEGES.show]: true,
          [DIGITAL_EXPERIENCE_UI_PRIVILEGES.save]: canManage,
        },
      },
    },
  } as never);
};

const renderTable = () =>
  render(
    <I18nProvider>
      <EuiProvider>
        <ScheduledReports serviceName="shop" />
      </EuiProvider>
    </I18nProvider>
  );

describe('ScheduledReports', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setCapabilities(true);
    jest.mocked(useFormatters).mockReturnValue({
      formatDate: (value: string | number) => `date(${value})`,
    } as never);
    jest.mocked(useScheduledReportActions).mockReturnValue(actions);
    jest.mocked(useScheduledReports).mockReturnValue({
      available: true,
      reports: [REPORT],
      isLoading: false,
      error: undefined,
      refresh,
    });
  });

  it('hides the section when Workflows is unavailable', () => {
    jest.mocked(useScheduledReports).mockReturnValue({
      available: false,
      reports: [],
      isLoading: false,
      error: undefined,
      refresh,
    });

    renderTable();

    expect(screen.queryByTestId('digitalExperienceScheduledReports')).not.toBeInTheDocument();
  });

  it('renders schedule details and opens the flyout to create or edit', () => {
    renderTable();

    expect(screen.getByTestId('digitalExperienceScheduledReportName')).toHaveTextContent(
      'Weekly scorecard: shop'
    );
    expect(screen.getByText('production')).toBeInTheDocument();
    expect(screen.getByText('Weekly on Mon at 09:00 UTC')).toBeInTheDocument();
    expect(screen.getByText('team@example.com')).toBeInTheDocument();
    expect(screen.getByText('Completed')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('digitalExperienceScheduledReportsCreate'));
    expect(screen.getByTestId('mockScheduleFlyout')).toHaveTextContent('create:shop');

    fireEvent.click(within(screen.getByTestId('mockScheduleFlyout')).getByText('close'));
    fireEvent.click(screen.getByTestId('digitalExperienceScheduledReportEdit'));
    expect(screen.getByTestId('mockScheduleFlyout')).toHaveTextContent(`edit:${REPORT.id}`);
  });

  it('runs, toggles, and deletes reports after confirmation', () => {
    renderTable();

    fireEvent.click(screen.getByTestId('digitalExperienceScheduledReportRun'));
    expect(actions.run).toHaveBeenCalledWith(REPORT);

    fireEvent.click(screen.getByTestId('euiCollapsedItemActionsButton'));
    fireEvent.click(screen.getByTestId('digitalExperienceScheduledReportToggle'));
    expect(actions.setEnabled).toHaveBeenCalledWith(REPORT, false);

    fireEvent.click(screen.getByTestId('euiCollapsedItemActionsButton'));
    fireEvent.click(screen.getByTestId('digitalExperienceScheduledReportDelete'));
    const modal = screen.getByTestId('digitalExperienceScheduledReportDeleteModal');
    fireEvent.click(within(modal).getByRole('button', { name: 'Delete' }));
    expect(actions.remove).toHaveBeenCalledWith(REPORT);
  });

  it('disables Run now for a disabled schedule', () => {
    jest.mocked(useScheduledReports).mockReturnValue({
      available: true,
      reports: [{ ...REPORT, enabled: false }],
      isLoading: false,
      error: undefined,
      refresh,
    });

    renderTable();

    expect(screen.getByTestId('digitalExperienceScheduledReportRun')).toHaveAttribute(
      'aria-disabled',
      'true'
    );
  });

  it('hides management buttons and row actions for read-only users', () => {
    setCapabilities(false);
    renderTable();

    expect(screen.queryByTestId('digitalExperienceScheduledReportsCreate')).not.toBeInTheDocument();
    expect(screen.queryByTestId('digitalExperienceScheduledReportEdit')).not.toBeInTheDocument();
    expect(screen.queryByTestId('digitalExperienceScheduledReportDelete')).not.toBeInTheDocument();
  });
});
