/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react';
import { StatusBadge } from '.';
import { SiemMigrationStatus } from '../../../../../common/siem_migrations/constants';
import { getDashboardMigrationDashboardMock } from '../../../../../common/siem_migrations/model/__mocks__';

describe('StatusBadge', () => {
  it('renders "Installed" when elastic_dashboard id exists', () => {
    const dashboard = getDashboardMigrationDashboardMock({
      elastic_dashboard: { id: '123', title: 'test' },
    });
    const { getByText } = render(<StatusBadge dashboard={dashboard} />);
    expect(getByText('Installed')).toBeInTheDocument();
  });

  it('renders "Error" when status is FAILED', () => {
    const dashboard = getDashboardMigrationDashboardMock({
      elastic_dashboard: undefined,
      status: SiemMigrationStatus.FAILED,
    });
    const { getByText } = render(<StatusBadge dashboard={dashboard} />);
    expect(getByText('Error')).toBeInTheDocument();
  });

  it('shows tooltip with comment on failed translation', async () => {
    const errorMessage = 'Something went wrong';
    const dashboard = getDashboardMigrationDashboardMock({
      elastic_dashboard: undefined,
      status: SiemMigrationStatus.FAILED,
      comments: [
        {
          created_at: '2025-10-04T12:00:00Z',
          created_by: 'test',
          message: errorMessage,
        },
      ],
    });
    const { getByTestId } = render(<StatusBadge dashboard={dashboard} />);

    fireEvent.mouseOver(getByTestId('translation-result'));

    await waitFor(() => {
      expect(getByTestId('failedStatusTooltip')).toBeInTheDocument();
      expect(getByTestId('failedStatusTooltip')).toHaveTextContent(errorMessage);
    });
  });

  it('renders translation result when not installed or failed', () => {
    const dashboard = getDashboardMigrationDashboardMock({
      translation_result: 'full',
      status: SiemMigrationStatus.COMPLETED,
    });
    const { getByText } = render(<StatusBadge dashboard={dashboard} />);
    expect(getByText('Translated')).toBeInTheDocument();
  });

  it('renders partial translation result when not installed or failed', () => {
    const dashboard = getDashboardMigrationDashboardMock({
      translation_result: 'partial',
      status: SiemMigrationStatus.COMPLETED,
    });
    const { getByText } = render(<StatusBadge dashboard={dashboard} />);
    expect(getByText('Partially translated')).toBeInTheDocument();
  });

  it('renders untranslatable result when not installed or failed', () => {
    const dashboard = getDashboardMigrationDashboardMock({
      translation_result: 'untranslatable',
      status: SiemMigrationStatus.COMPLETED,
    });
    const { getByText } = render(<StatusBadge dashboard={dashboard} />);
    expect(getByText('Not translated')).toBeInTheDocument();
  });

  it('shows tooltip with correct message for installed status', async () => {
    const dashboard = getDashboardMigrationDashboardMock({
      elastic_dashboard: { id: '123', title: 'test' },
    });
    const { getByTestId } = render(<StatusBadge dashboard={dashboard} />);

    fireEvent.mouseOver(getByTestId('translation-result'));

    await waitFor(() => {
      expect(getByTestId('installedStatusTooltip')).toBeInTheDocument();
      expect(getByTestId('installedStatusTooltip')).toHaveTextContent('Installed');
    });
  });

  it('shows tooltip with correct message for full translation', async () => {
    const dashboard = getDashboardMigrationDashboardMock({
      translation_result: 'full',
      status: SiemMigrationStatus.COMPLETED,
    });
    const { getByTestId } = render(<StatusBadge dashboard={dashboard} />);

    fireEvent.mouseOver(getByTestId('translation-result'));

    await waitFor(() => {
      expect(getByTestId('translationStatusTooltip')).toBeInTheDocument();
      expect(getByTestId('translationStatusTooltip')).toHaveTextContent('Translated');
    });
  });

  it('shows tooltip with correct message for partial translation', async () => {
    const dashboard = getDashboardMigrationDashboardMock({
      translation_result: 'partial',
      status: SiemMigrationStatus.COMPLETED,
    });
    const { getByTestId } = render(<StatusBadge dashboard={dashboard} />);

    fireEvent.mouseOver(getByTestId('translation-result'));

    await waitFor(() => {
      expect(getByTestId('translationStatusTooltip')).toBeInTheDocument();
      expect(getByTestId('translationStatusTooltip')).toHaveTextContent('Partially translated');
    });
  });

  it('shows tooltip with correct message for untranslatable status', async () => {
    const dashboard = getDashboardMigrationDashboardMock({
      translation_result: 'untranslatable',
      status: SiemMigrationStatus.COMPLETED,
    });
    const { getByTestId } = render(<StatusBadge dashboard={dashboard} />);

    fireEvent.mouseOver(getByTestId('translation-result'));

    await waitFor(() => {
      expect(getByTestId('translationStatusTooltip')).toBeInTheDocument();
      expect(getByTestId('translationStatusTooltip')).toHaveTextContent('Not translated');
    });
  });
});
