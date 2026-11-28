/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { SiemMigrationStatus } from '../../../../../common/siem_migrations/constants';
import type { RuleMigrationRule } from '../../../../../common/siem_migrations/model/rule_migration.gen';
import { getRuleMigrationRuleMock } from '../../../../../common/siem_migrations/model/__mocks__';
import { createStatusColumn } from './status';

const renderStatus = (migration: RuleMigrationRule) => {
  const { render: renderCell } = createStatusColumn() as unknown as {
    render: (value: unknown, item: RuleMigrationRule) => React.ReactNode;
  };
  return render(<>{renderCell(undefined, migration)}</>);
};

describe('createStatusColumn', () => {
  it('returns the correct column definition', () => {
    const column = createStatusColumn();
    expect(column).toEqual({
      field: 'translation_result',
      name: expect.anything(),
      sortable: true,
      truncateText: true,
      width: '15%',
      render: expect.any(Function),
    });
  });

  describe('status of the rule', () => {
    it('should show an installed rule as installed', () => {
      renderStatus(getRuleMigrationRuleMock({ elastic_rule: { id: '123', title: 'test' } }));

      expect(screen.getByText('Installed')).toBeInTheDocument();
    });

    it('should show an installed rule as installed even if it failed', () => {
      renderStatus(
        getRuleMigrationRuleMock({
          elastic_rule: { id: '123', title: 'test' },
          status: SiemMigrationStatus.FAILED,
        })
      );

      expect(screen.getByText('Installed')).toBeInTheDocument();
    });

    it('should show a rule that failed as failed', () => {
      renderStatus(
        getRuleMigrationRuleMock({ elastic_rule: undefined, status: SiemMigrationStatus.FAILED })
      );

      expect(screen.getByText('Failed')).toBeInTheDocument();
    });

    it('should show the first comment when hovering a rule that failed', async () => {
      renderStatus(
        getRuleMigrationRuleMock({
          elastic_rule: undefined,
          status: SiemMigrationStatus.FAILED,
          translation_result: undefined,
          comments: [
            {
              created_at: '2025-10-04T12:00:00Z',
              created_by: 'test',
              message: 'Something went wrong',
            },
            { created_at: '2025-10-04T13:00:00Z', created_by: 'test', message: 'A later comment' },
          ],
        })
      );

      fireEvent.mouseOver(screen.getByTestId('translationStatus-failed'));

      expect(await screen.findByRole('tooltip')).toHaveTextContent('Something went wrong');
    });

    it.each([
      ['full', 'Translated'],
      ['partial', 'Partially translated'],
      ['untranslatable', 'Not translated'],
    ] as const)('should show the %s result of a rule as "%s"', (translationResult, text) => {
      renderStatus(
        getRuleMigrationRuleMock({
          elastic_rule: undefined,
          status: SiemMigrationStatus.COMPLETED,
          translation_result: translationResult,
        })
      );

      expect(screen.getByText(text)).toBeInTheDocument();
    });

    it('should use the translation result as the test subject of the status', () => {
      renderStatus(
        getRuleMigrationRuleMock({
          elastic_rule: undefined,
          status: SiemMigrationStatus.COMPLETED,
          translation_result: 'partial',
        })
      );

      expect(screen.getByTestId('translationStatus-partial')).toHaveTextContent(
        'Partially translated'
      );
    });
  });
});
