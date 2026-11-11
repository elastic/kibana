/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { EuiProvider } from '@elastic/eui';
import { useKibanaServices } from '../../../hooks/use_kibana_services';
import { createUiSettingsMock } from '../../../test_utils/ui_settings_mock';
import type { ApplicationsSummary } from '../utils/summarize_applications';
import { ApplicationsSummaryPanel } from './applications_summary_panel';

const SUMMARY: ApplicationsSummary = {
  applications: 5,
  sessions: 6702,
  pageLoads: 1533,
  errorsPerPageLoad: 0.5,
  failedHttpRatio: 0.125,
  poorCoreWebVitals: 2,
};

const renderPanel = (summary = SUMMARY) =>
  render(<ApplicationsSummaryPanel summary={summary} isLoading={false} />, {
    wrapper: EuiProvider,
  });

const stat = (id: string) => screen.getByTestId(`digitalExperienceSummary-${id}`);

jest.mock('../../../hooks/use_kibana_services');

beforeEach(() => {
  jest.mocked(useKibanaServices).mockReturnValue({
    uiSettings: createUiSettingsMock(),
  } as unknown as ReturnType<typeof useKibanaServices>);
});

describe('ApplicationsSummaryPanel', () => {
  it('shows the totals', () => {
    renderPanel();

    expect(stat('applications')).toHaveTextContent('5');
    expect(stat('sessions')).toHaveTextContent('6,702');
    expect(stat('pageLoads')).toHaveTextContent('1,533');
    expect(stat('errorsPerPageLoad')).toHaveTextContent('0.50');
    expect(stat('failedHttp')).toHaveTextContent('12.5%');
    expect(stat('poorCoreWebVitals')).toHaveTextContent('2');
  });

  it('shows a dash for the sessions without a total, and where they come from on hover', async () => {
    renderPanel({ ...SUMMARY, sessions: null });

    expect(stat('sessions')).toHaveTextContent('—');
    fireEvent.mouseOver(screen.getByText('Sessions'));
    expect(await screen.findByText(/Counted from the session summaries/)).toBeInTheDocument();
  });

  it('shows a dash for the rates without page loads or requests', () => {
    renderPanel({ ...SUMMARY, errorsPerPageLoad: null, failedHttpRatio: null });

    expect(stat('errorsPerPageLoad')).toHaveTextContent('—');
    expect(stat('failedHttp')).toHaveTextContent('—');
  });
});
