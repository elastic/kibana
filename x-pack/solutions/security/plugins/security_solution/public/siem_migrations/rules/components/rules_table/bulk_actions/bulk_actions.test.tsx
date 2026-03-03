/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react';
import { BulkActions } from './bulk_actions';
import { TestProviders } from '../../../../../common/mock/test_providers';
import {
  MigrationTranslationResult,
  SiemMigrationStatus,
} from '../../../../../../common/siem_migrations/constants';
import { useKibana } from '../../../../../common/lib/kibana';
import type { SiemMigrationsService } from '../../../../service';
import { getRuleMigrationRuleMock } from '../../../../../../common/siem_migrations/model/__mocks__';
import { getRuleMigrationTranslationStatsMock } from '../../../__mocks__';

jest.mock('../../../../../common/lib/kibana');
const useKibanaMock = useKibana as jest.MockedFunction<typeof useKibana>;

const mockSiemMigrationsService = {
  rules: {
    getMissingCapabilities: jest.fn(),
  },
} as unknown as jest.MockedObjectDeep<SiemMigrationsService>;

describe('BulkActions', () => {
  beforeEach(() => {
    mockSiemMigrationsService.rules.getMissingCapabilities.mockReturnValue([]);
    useKibanaMock.mockReturnValue({
      services: {
        siemMigrations: mockSiemMigrationsService,
      },
    } as unknown as ReturnType<typeof useKibana>);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders the bulk actions component', () => {
    const mockTranslationStats = getRuleMigrationTranslationStatsMock({
      rules: {
        total: 13,
        success: {
          total: 11,
          result: {
            full: 0,
            partial: 0,
            untranslatable: 11,
          },
          installable: 0,
          missing_index: 0,
          prebuilt: 0,
        },
        failed: 2,
      },
    });

    const { getByTestId } = render(
      <TestProviders>
        <BulkActions
          selectedRules={[]}
          translationStats={mockTranslationStats}
          isTableLoading={false}
          setMissingIndexPatternFlyoutOpen={jest.fn()}
        />
      </TestProviders>
    );

    expect(getByTestId('migrationsBulkActions')).toBeInTheDocument();
  });

  it('renders the reprocess failed button', () => {
    const mockTranslationStats = getRuleMigrationTranslationStatsMock({
      rules: {
        total: 13,
        success: {
          total: 11,
          result: {
            full: 0,
            partial: 0,
            untranslatable: 11,
          },
          installable: 0,
          missing_index: 0,
          prebuilt: 0,
        },
        failed: 2,
      },
    });

    const { getByTestId } = render(
      <TestProviders>
        <BulkActions
          selectedRules={[]}
          translationStats={mockTranslationStats}
          isTableLoading={false}
          setMissingIndexPatternFlyoutOpen={jest.fn()}
        />
      </TestProviders>
    );

    expect(getByTestId('reprocessFailedItemsButton')).toBeInTheDocument();
  });

  it('calls the reprocess failed rules handler when the button is clicked', () => {
    const mockTranslationStats = getRuleMigrationTranslationStatsMock({
      rules: {
        total: 13,
        success: {
          total: 11,
          result: {
            full: 0,
            partial: 0,
            untranslatable: 11,
          },
          installable: 0,
          missing_index: 0,
          prebuilt: 0,
        },
        failed: 2,
      },
    });
    const reprocessFailedRules = jest.fn();
    const { getByTestId } = render(
      <TestProviders>
        <BulkActions
          selectedRules={[]}
          translationStats={mockTranslationStats}
          isTableLoading={false}
          reprocessFailedRules={reprocessFailedRules}
          setMissingIndexPatternFlyoutOpen={jest.fn()}
        />
      </TestProviders>
    );

    fireEvent.click(getByTestId('reprocessFailedItemsButton'));
    expect(reprocessFailedRules).toHaveBeenCalled();
  });

  it('shows the reprocess selected button when a failed rule is selected', () => {
    const mockTranslationStats = getRuleMigrationTranslationStatsMock({
      rules: {
        total: 13,
        success: {
          total: 11,
          result: {
            full: 0,
            partial: 0,
            untranslatable: 11,
          },
          installable: 0,
          missing_index: 0,
          prebuilt: 0,
        },
        failed: 2,
      },
    });
    const selectedRules = [
      getRuleMigrationRuleMock({
        id: '1',
        status: SiemMigrationStatus.FAILED,
        translation_result: MigrationTranslationResult.UNTRANSLATABLE,
      }),
    ];
    const { getByText } = render(
      <TestProviders>
        <BulkActions
          selectedRules={selectedRules}
          translationStats={mockTranslationStats}
          isTableLoading={false}
          setMissingIndexPatternFlyoutOpen={jest.fn()}
        />
      </TestProviders>
    );

    expect(getByText('Reprocess selected failed (1)')).toBeInTheDocument();
  });

  it('renders the install button', () => {
    const mockTranslationStats = getRuleMigrationTranslationStatsMock({
      rules: {
        total: 13,
        success: {
          total: 11,
          result: {
            full: 3,
            partial: 1,
            untranslatable: 7,
          },
          installable: 3,
          missing_index: 0,
          prebuilt: 0,
        },
        failed: 2,
      },
    });

    const { getByTestId } = render(
      <TestProviders>
        <BulkActions
          selectedRules={[]}
          translationStats={mockTranslationStats}
          isTableLoading={false}
          setMissingIndexPatternFlyoutOpen={jest.fn()}
        />
      </TestProviders>
    );

    expect(getByTestId('installTranslatedItemsButton')).toBeInTheDocument();
  });

  it('calls the install translated rules handler when the button is clicked', () => {
    const mockTranslationStats = getRuleMigrationTranslationStatsMock({
      rules: {
        total: 13,
        success: {
          total: 11,
          result: {
            full: 3,
            partial: 1,
            untranslatable: 7,
          },
          installable: 3,
          missing_index: 0,
          prebuilt: 0,
        },
        failed: 2,
      },
    });
    const installTranslatedRule = jest.fn();
    const { getByTestId } = render(
      <TestProviders>
        <BulkActions
          selectedRules={[]}
          translationStats={mockTranslationStats}
          isTableLoading={false}
          installTranslatedRule={installTranslatedRule}
          setMissingIndexPatternFlyoutOpen={jest.fn()}
        />
      </TestProviders>
    );

    fireEvent.click(getByTestId('installTranslatedItemsButton'));
    expect(installTranslatedRule).toHaveBeenCalled();
  });

  it('renders the install selected button', () => {
    const mockTranslationStats = getRuleMigrationTranslationStatsMock({
      rules: {
        total: 13,
        success: {
          total: 11,
          result: {
            full: 3,
            partial: 1,
            untranslatable: 7,
          },
          installable: 3,
          missing_index: 0,
          prebuilt: 0,
        },
        failed: 2,
      },
    });
    const selectedRules = [
      getRuleMigrationRuleMock({
        id: '1',
        status: SiemMigrationStatus.COMPLETED,
        translation_result: MigrationTranslationResult.FULL,
      }),
    ];
    const { getByTestId } = render(
      <TestProviders>
        <BulkActions
          selectedRules={selectedRules}
          translationStats={mockTranslationStats}
          isTableLoading={false}
          setMissingIndexPatternFlyoutOpen={jest.fn()}
        />
      </TestProviders>
    );

    expect(getByTestId('installSelectedItemsButton')).toBeInTheDocument();
  });

  it('calls the install selected rules handler when the button is clicked', () => {
    const mockTranslationStats = getRuleMigrationTranslationStatsMock({
      rules: {
        total: 13,
        success: {
          total: 11,
          result: {
            full: 3,
            partial: 1,
            untranslatable: 7,
          },
          installable: 3,
          missing_index: 0,
          prebuilt: 0,
        },
        failed: 2,
      },
    });
    const selectedRules = [
      getRuleMigrationRuleMock({
        id: '1',
        status: SiemMigrationStatus.COMPLETED,
        translation_result: MigrationTranslationResult.FULL,
      }),
    ];
    const installSelectedRule = jest.fn();
    const { getByTestId } = render(
      <TestProviders>
        <BulkActions
          selectedRules={selectedRules}
          translationStats={mockTranslationStats}
          isTableLoading={false}
          installSelectedRule={installSelectedRule}
          setMissingIndexPatternFlyoutOpen={jest.fn()}
        />
      </TestProviders>
    );

    fireEvent.click(getByTestId('installSelectedItemsButton'));
    expect(installSelectedRule).toHaveBeenCalled();
  });
});
