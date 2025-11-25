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
import type { DashboardMigrationTranslationStats } from '../../../../../../common/siem_migrations/model/dashboard_migration.gen';
import {
  MigrationTranslationResult,
  SiemMigrationStatus,
} from '../../../../../../common/siem_migrations/constants';
import { useKibana } from '../../../../../common/lib/kibana';
import type { SiemMigrationsService } from '../../../../service';
import { getDashboardMigrationDashboardMock } from '../../../../../../common/siem_migrations/model/__mocks__';

jest.mock('../../../../../common/lib/kibana');
const useKibanaMock = useKibana as jest.MockedFunction<typeof useKibana>;

const mockSiemMigrationsService = {
  dashboards: {
    getMissingCapabilities: jest.fn(),
  },
} as unknown as jest.MockedObjectDeep<SiemMigrationsService>;

describe('BulkActions', () => {
  beforeEach(() => {
    mockSiemMigrationsService.dashboards.getMissingCapabilities.mockReturnValue([]);
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
    const mockTranslationStats: DashboardMigrationTranslationStats = {
      id: 'migration-1',
      dashboards: {
        total: 13,
        success: {
          total: 11,
          result: {
            full: 0,
            partial: 0,
            untranslatable: 11,
          },
          installable: 0,
        },
        failed: 2,
      },
    };

    const { getByTestId } = render(
      <TestProviders>
        <BulkActions
          selectedDashboards={[]}
          translationStats={mockTranslationStats}
          isTableLoading={false}
        />
      </TestProviders>
    );

    expect(getByTestId('migrationsBulkActions')).toBeInTheDocument();
  });

  it('renders the reprocess failed button', () => {
    const mockTranslationStats: DashboardMigrationTranslationStats = {
      id: 'migration-1',
      dashboards: {
        total: 13,
        success: {
          total: 11,
          result: {
            full: 0,
            partial: 0,
            untranslatable: 11,
          },
          installable: 0,
        },
        failed: 2,
      },
    };

    const { getByTestId } = render(
      <TestProviders>
        <BulkActions
          selectedDashboards={[]}
          translationStats={mockTranslationStats}
          isTableLoading={false}
        />
      </TestProviders>
    );

    expect(getByTestId('reprocessFailedItemsButton')).toBeInTheDocument();
  });

  it('calls the reprocess failed dashboards handler when the button is clicked', () => {
    const mockTranslationStats: DashboardMigrationTranslationStats = {
      id: 'migration-1',
      dashboards: {
        total: 13,
        success: {
          total: 11,
          result: {
            full: 0,
            partial: 0,
            untranslatable: 11,
          },
          installable: 0,
        },
        failed: 2,
      },
    };
    const reprocessFailedDashboards = jest.fn();
    const { getByTestId } = render(
      <TestProviders>
        <BulkActions
          selectedDashboards={[]}
          translationStats={mockTranslationStats}
          isTableLoading={false}
          reprocessFailedDashboards={reprocessFailedDashboards}
        />
      </TestProviders>
    );

    fireEvent.click(getByTestId('reprocessFailedItemsButton'));
    expect(reprocessFailedDashboards).toHaveBeenCalled();
  });

  it('shows the reprocess selected button when a failed dashboard is selected', () => {
    const mockTranslationStats: DashboardMigrationTranslationStats = {
      id: 'migration-1',
      dashboards: {
        total: 13,
        success: {
          total: 11,
          result: {
            full: 0,
            partial: 0,
            untranslatable: 11,
          },
          installable: 0,
        },
        failed: 2,
      },
    };
    const selectedDashboards = [
      getDashboardMigrationDashboardMock({
        id: '1',
        status: SiemMigrationStatus.FAILED,
        translation_result: MigrationTranslationResult.UNTRANSLATABLE,
      }),
    ];
    const { getByText } = render(
      <TestProviders>
        <BulkActions
          selectedDashboards={selectedDashboards}
          translationStats={mockTranslationStats}
          isTableLoading={false}
        />
      </TestProviders>
    );

    expect(getByText('Reprocess selected failed (1)')).toBeInTheDocument();
  });

  it('renders the install failed button', () => {
    const mockTranslationStats: DashboardMigrationTranslationStats = {
      id: 'migration-1',
      dashboards: {
        total: 13,
        success: {
          total: 11,
          result: {
            full: 3,
            partial: 1,
            untranslatable: 7,
          },
          installable: 3,
        },
        failed: 2,
      },
    };

    const { getByTestId } = render(
      <TestProviders>
        <BulkActions
          selectedDashboards={[]}
          translationStats={mockTranslationStats}
          isTableLoading={false}
        />
      </TestProviders>
    );

    expect(getByTestId('installTranslatedItemsButton')).toBeInTheDocument();
  });

  it('calls the install translated dashboards handler when the button is clicked', () => {
    const mockTranslationStats: DashboardMigrationTranslationStats = {
      id: 'migration-1',
      dashboards: {
        total: 13,
        success: {
          total: 11,
          result: {
            full: 3,
            partial: 1,
            untranslatable: 7,
          },
          installable: 3,
        },
        failed: 2,
      },
    };
    const installTranslatedDashboards = jest.fn();
    const { getByTestId } = render(
      <TestProviders>
        <BulkActions
          selectedDashboards={[]}
          translationStats={mockTranslationStats}
          isTableLoading={false}
          installTranslatedDashboards={installTranslatedDashboards}
        />
      </TestProviders>
    );

    fireEvent.click(getByTestId('installTranslatedItemsButton'));
    expect(installTranslatedDashboards).toHaveBeenCalled();
  });

  it('renders the install selected button', () => {
    const mockTranslationStats: DashboardMigrationTranslationStats = {
      id: 'migration-1',
      dashboards: {
        total: 13,
        success: {
          total: 11,
          result: {
            full: 3,
            partial: 1,
            untranslatable: 7,
          },
          installable: 3,
        },
        failed: 2,
      },
    };
    const selectedDashboards = [
      getDashboardMigrationDashboardMock({
        id: '1',
        status: SiemMigrationStatus.COMPLETED,
        translation_result: MigrationTranslationResult.FULL,
      }),
    ];
    const { getByTestId } = render(
      <TestProviders>
        <BulkActions
          selectedDashboards={selectedDashboards}
          translationStats={mockTranslationStats}
          isTableLoading={false}
        />
      </TestProviders>
    );

    expect(getByTestId('installSelectedItemsButton')).toBeInTheDocument();
  });

  it('calls the install selected dashboards handler when the button is clicked', () => {
    const mockTranslationStats: DashboardMigrationTranslationStats = {
      id: 'migration-1',
      dashboards: {
        total: 13,
        success: {
          total: 11,
          result: {
            full: 3,
            partial: 1,
            untranslatable: 7,
          },
          installable: 3,
        },
        failed: 2,
      },
    };
    const selectedDashboards = [
      getDashboardMigrationDashboardMock({
        id: '1',
        status: SiemMigrationStatus.COMPLETED,
        translation_result: MigrationTranslationResult.FULL,
      }),
    ];
    const installSelectedDashboards = jest.fn();
    const { getByTestId } = render(
      <TestProviders>
        <BulkActions
          selectedDashboards={selectedDashboards}
          translationStats={mockTranslationStats}
          isTableLoading={false}
          installSelectedDashboards={installSelectedDashboards}
        />
      </TestProviders>
    );

    fireEvent.click(getByTestId('installSelectedItemsButton'));
    expect(installSelectedDashboards).toHaveBeenCalled();
  });
});
