/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { EuiProvider } from '@elastic/eui';
import { I18nProvider } from '@kbn/i18n-react';
import { ScheduleReportButton } from './schedule_report_button';

jest.mock('../scheduled/schedule_report_flyout', () => ({
  ScheduleReportFlyout: ({
    serviceName,
    defaultEnvironment,
    environments,
    onClose,
  }: {
    serviceName: string;
    defaultEnvironment?: string;
    environments?: string[];
    onClose: () => void;
  }) => (
    <div data-test-subj="mockFlyout">
      <span>{`${serviceName}|${defaultEnvironment ?? ''}|${(environments ?? []).join(',')}`}</span>
      <button onClick={onClose}>close</button>
    </div>
  ),
}));

describe('ScheduleReportButton', () => {
  it('opens and closes the schedule report flyout with application context', () => {
    render(
      <I18nProvider>
        <EuiProvider>
          <ScheduleReportButton
            serviceName="shop"
            environment="production"
            environments={['production', 'staging']}
          />
        </EuiProvider>
      </I18nProvider>
    );

    expect(screen.queryByTestId('mockFlyout')).not.toBeInTheDocument();

    fireEvent.click(screen.getByTestId('digitalExperienceScorecardSchedule'));
    expect(screen.getByTestId('mockFlyout')).toHaveTextContent(
      'shop|production|production,staging'
    );

    fireEvent.click(screen.getByText('close'));
    expect(screen.queryByTestId('mockFlyout')).not.toBeInTheDocument();
  });
});
