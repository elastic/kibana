/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { EuiProvider } from '@elastic/eui';
import { I18nProvider } from '@kbn/i18n-react';
import {
  SCHEDULED_REPORTS_CREATE_ENDPOINT,
  SCHEDULED_REPORT_UPDATE_ENDPOINT,
  type ScheduledReport,
} from '../../../../common/types/scheduled_reports';
import { useApiClient } from '../../../hooks/use_api_client';
import { useKibanaServices } from '../../../hooks/use_kibana_services';
import { ScheduleReportFlyout, type ScheduleReportFlyoutProps } from './schedule_report_flyout';
import { useEmailConnectors } from './use_email_connectors';

jest.mock('../../../hooks/use_api_client');
jest.mock('../../../hooks/use_kibana_services');
jest.mock('./use_email_connectors');

const fetchMock = jest.fn();
const addSuccess = jest.fn();
const refreshConnectors = jest.fn();

const EXISTING_REPORT: ScheduledReport = {
  id: 'system-digital-experience-scorecard-report-1',
  reportType: 'scorecard',
  serviceName: 'shop',
  name: 'Monday checkout scorecard',
  environment: 'production',
  lookbackDays: 7,
  schedule: {
    frequency: 'WEEKLY',
    weekday: 'MO',
    hour: 9,
    minute: 0,
    timeZone: 'UTC',
  },
  connectorId: 'email-1',
  connectorName: 'SMTP Primary',
  recipients: ['team@example.com'],
  enabled: true,
};

const renderFlyout = (props: Partial<ScheduleReportFlyoutProps> = {}) =>
  render(
    <I18nProvider>
      <EuiProvider>
        <ScheduleReportFlyout
          serviceName="shop"
          environments={['production', 'staging']}
          onClose={jest.fn()}
          {...props}
        />
      </EuiProvider>
    </I18nProvider>
  );

describe('ScheduleReportFlyout', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(useApiClient).mockReturnValue({ fetch: fetchMock } as never);
    jest.mocked(useKibanaServices).mockReturnValue({
      application: {
        getUrlForApp: jest.fn(
          () => '/app/management/insightsAndAlerting/triggersActions/connectors'
        ),
      },
      notifications: { toasts: { addSuccess, addError: jest.fn() } },
    } as never);
    jest.mocked(useEmailConnectors).mockReturnValue({
      available: true,
      emailConnectors: [
        { id: 'email-1', name: 'SMTP Primary' },
        { id: 'email-2', name: 'SMTP Backup' },
      ],
      isLoading: false,
      error: undefined,
      refresh: refreshConnectors,
    });
  });

  it('creates a scheduled report with selected cadence, connector, and recipients', async () => {
    const onClose = jest.fn();
    const onSaved = jest.fn();
    fetchMock.mockResolvedValue({
      ...EXISTING_REPORT,
      name: 'Weekly scorecard: shop (production)',
    });

    renderFlyout({ defaultEnvironment: 'production', onClose, onSaved });

    const recipientsBox = screen.getByTestId('digitalExperienceScheduleReportRecipients');
    const recipientInput = within(recipientsBox).getByRole('combobox');
    fireEvent.change(recipientInput, { target: { value: 'alerts@example.com' } });
    fireEvent.keyDown(recipientInput, { key: 'Enter', code: 'Enter' });

    fireEvent.click(screen.getByTestId('digitalExperienceScheduleReportSave'));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    expect(fetchMock).toHaveBeenCalledWith(SCHEDULED_REPORTS_CREATE_ENDPOINT, {
      params: {
        path: { serviceName: 'shop' },
        body: expect.objectContaining({
          reportType: 'scorecard',
          name: 'Weekly scorecard: shop (production)',
          environment: 'production',
          lookbackDays: 7,
          connectorId: 'email-1',
          recipients: ['alerts@example.com'],
          enabled: true,
          schedule: expect.objectContaining({
            frequency: 'WEEKLY',
            weekday: 'MO',
            hour: 9,
            minute: 0,
          }),
        }),
      },
    });
    expect(addSuccess).toHaveBeenCalled();
    expect(onSaved).toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
  });

  it('edits an existing scheduled report and switches frequency to monthly', async () => {
    const onClose = jest.fn();
    const onSaved = jest.fn();
    fetchMock.mockResolvedValue({ ...EXISTING_REPORT, name: 'Monthly summary' });

    renderFlyout({ report: EXISTING_REPORT, onClose, onSaved });

    fireEvent.change(screen.getByTestId('digitalExperienceScheduleReportName'), {
      target: { value: 'Monthly summary' },
    });
    fireEvent.change(screen.getByTestId('digitalExperienceScheduleReportFrequency'), {
      target: { value: 'MONTHLY' },
    });
    fireEvent.change(screen.getByTestId('digitalExperienceScheduleReportMonthday'), {
      target: { value: '15' },
    });
    fireEvent.click(screen.getByTestId('digitalExperienceScheduleReportSave'));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    expect(fetchMock).toHaveBeenCalledWith(SCHEDULED_REPORT_UPDATE_ENDPOINT, {
      params: {
        path: { serviceName: 'shop', scheduleId: EXISTING_REPORT.id },
        body: expect.objectContaining({
          reportType: 'scorecard',
          name: 'Monthly summary',
          schedule: expect.objectContaining({
            frequency: 'MONTHLY',
            monthday: 15,
            hour: 9,
            minute: 0,
            timeZone: 'UTC',
          }),
        }),
      },
    });
    expect(onSaved).toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
  });

  it('shows a warning callout and disables Save when no email connectors exist', () => {
    jest.mocked(useEmailConnectors).mockReturnValue({
      available: true,
      emailConnectors: [],
      isLoading: false,
      error: undefined,
      refresh: refreshConnectors,
    });

    renderFlyout();

    expect(screen.getByTestId('digitalExperienceScheduleReportNoConnectors')).toBeInTheDocument();
    expect(screen.getByTestId('digitalExperienceScheduleReportSave')).toBeDisabled();
  });

  it('keeps the flyout open and shows an error callout when saving fails', async () => {
    const onClose = jest.fn();
    fetchMock.mockRejectedValue(new Error('Connector invalid'));

    renderFlyout({ report: EXISTING_REPORT, onClose });
    fireEvent.click(screen.getByTestId('digitalExperienceScheduleReportSave'));

    await waitFor(() =>
      expect(screen.getByTestId('digitalExperienceScheduleReportError')).toHaveTextContent(
        'Connector invalid'
      )
    );
    expect(onClose).not.toHaveBeenCalled();
  });

  it('validates empty recipients before calling the API', () => {
    renderFlyout();

    fireEvent.click(screen.getByTestId('digitalExperienceScheduleReportSave'));

    expect(fetchMock).not.toHaveBeenCalled();
    expect(screen.getByText('Add at least one recipient email address.')).toBeInTheDocument();
  });
});
