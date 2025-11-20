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
import { getRuleMigrationRuleMock } from '../../../../../common/siem_migrations/model/__mocks__';

describe('StatusBadge', () => {
  it('renders "Installed" when elastic_rule id exists', () => {
    const rule = getRuleMigrationRuleMock({
      elastic_rule: { id: '123', title: 'test' },
    });
    const { getByText } = render(<StatusBadge migrationRule={rule} />);
    expect(getByText('Installed')).toBeInTheDocument();
  });

  it('renders "Failed" when status is FAILED', () => {
    const rule = getRuleMigrationRuleMock({
      elastic_rule: undefined,
      status: SiemMigrationStatus.FAILED,
    });
    const { getByText } = render(<StatusBadge migrationRule={rule} />);
    expect(getByText('Error')).toBeInTheDocument();
  });

  it('shows tooltip with comment on failed translation', async () => {
    const errorMessage = 'Something went wrong';
    const rule = getRuleMigrationRuleMock({
      elastic_rule: undefined,
      status: SiemMigrationStatus.FAILED,
      comments: [
        {
          created_at: '2025-10-04T12:00:00Z',
          created_by: 'test',
          message: errorMessage,
        },
      ],
    });
    const { getByText, findByText } = render(<StatusBadge migrationRule={rule} />);

    fireEvent.mouseOver(getByText('Error'));

    const tooltip = await findByText(errorMessage);
    expect(tooltip).toBeInTheDocument();
  });

  it('renders translation result when not installed or failed', () => {
    const rule = getRuleMigrationRuleMock({
      translation_result: 'full',
      status: SiemMigrationStatus.COMPLETED,
    });
    const { getByText } = render(<StatusBadge migrationRule={rule} />);
    expect(getByText('Translated')).toBeInTheDocument();
  });

  it('renders partial translation result when not installed or failed', () => {
    const rule = getRuleMigrationRuleMock({
      translation_result: 'partial',
      status: SiemMigrationStatus.COMPLETED,
    });
    const { getByText } = render(<StatusBadge migrationRule={rule} />);
    expect(getByText('Partially translated')).toBeInTheDocument();
  });

  it('renders untranslatable result when not installed or failed', () => {
    const rule = getRuleMigrationRuleMock({
      translation_result: 'untranslatable',
      status: SiemMigrationStatus.COMPLETED,
    });
    const { getByText } = render(<StatusBadge migrationRule={rule} />);
    expect(getByText('Not translated')).toBeInTheDocument();
  });

  it('shows tooltip with correct message for installed status', async () => {
    const rule = getRuleMigrationRuleMock({
      elastic_rule: { id: '123', title: 'test' },
    });
    const { getByText } = render(<StatusBadge migrationRule={rule} />);

    fireEvent.mouseOver(getByText('Installed'));

    await waitFor(() => {
      expect(getByText('Installed')).toBeInTheDocument();
    });
  });

  it('shows tooltip with correct message for full translation', async () => {
    const rule = getRuleMigrationRuleMock({
      translation_result: 'full',
      status: SiemMigrationStatus.COMPLETED,
    });
    const { getByText } = render(<StatusBadge migrationRule={rule} />);

    fireEvent.mouseOver(getByText('Translated'));

    await waitFor(() => {
      expect(getByText('Translated')).toBeInTheDocument();
    });
  });

  it('shows tooltip with correct message for partial translation', async () => {
    const rule = getRuleMigrationRuleMock({
      translation_result: 'partial',
      status: SiemMigrationStatus.COMPLETED,
    });
    const { getByText } = render(<StatusBadge migrationRule={rule} />);

    fireEvent.mouseOver(getByText('Partially translated'));

    await waitFor(() => {
      expect(getByText('Partially translated')).toBeInTheDocument();
    });
  });

  it('shows tooltip with correct message for untranslatable status', async () => {
    const rule = getRuleMigrationRuleMock({
      translation_result: 'untranslatable',
      status: SiemMigrationStatus.COMPLETED,
    });
    const { getByText } = render(<StatusBadge migrationRule={rule} />);

    fireEvent.mouseOver(getByText('Not translated'));

    await waitFor(() => {
      expect(getByText('Not translated')).toBeInTheDocument();
    });
  });
});
