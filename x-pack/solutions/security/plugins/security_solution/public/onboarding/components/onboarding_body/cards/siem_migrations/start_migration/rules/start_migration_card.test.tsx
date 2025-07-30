/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ComponentProps } from 'react';
import React from 'react';
import { act, render, screen, waitFor } from '@testing-library/react';
import * as useLatestStatsModule from '../../../../../../../siem_migrations/rules/service/hooks/use_latest_stats';
import StartMigrationCard from './start_migration_card';
import * as useUpsellingComponentModule from '../../../../../../../common/hooks/use_upselling';
import { TestProviders } from '../../../../../../../common/mock';
import { SiemMigrationTaskStatus } from '../../../../../../../../common/siem_migrations/constants';
import type { RuleMigrationStats } from '../../../../../../../siem_migrations/rules/types';
import { OnboardingCardId } from '../../../../../../constants';
import * as useGetMigrationTranslationStatsModule from '../../../../../../../siem_migrations/rules/logic/use_get_migration_translation_stats';
import * as useGetMissingResourcesModule from '../../../../../../../siem_migrations/rules/service/hooks/use_get_missing_resources';

const useLatestStatsSpy = jest.spyOn(useLatestStatsModule, 'useLatestStats');

const useUpsellingComponentMock = jest.spyOn(useUpsellingComponentModule, 'useUpsellingComponent');

const useGetMigrationTranslationStatsSpy = jest.spyOn(
  useGetMigrationTranslationStatsModule,
  'useGetMigrationTranslationStats'
);

const useGetMissingResourcesMock = jest.spyOn(
  useGetMissingResourcesModule,
  'useGetMissingResources'
);

const MockUpsellingComponent = () => {
  return <div data-test-subj="mockUpsellSection">{`Start Migrations Upselling Component`}</div>;
};

const mockedLatestStats = {
  data: [],
  isLoading: false,
  refreshStats: jest.fn(),
};

const mockTranslationStats = {
  isLoading: false,
  data: {
    id: '1',
    rules: {
      total: 1,
      failed: 0,
      success: {
        result: {
          full: 1,
          partial: 0,
          failed: 0,
        },
      },
    },
  },
} as unknown as ReturnType<
  typeof useGetMigrationTranslationStatsModule.useGetMigrationTranslationStats
>;

const mockMissingResources = {
  getMissingResources: jest.fn(() => []),
  isLoading: false,
} as unknown as ReturnType<typeof useGetMissingResourcesModule.useGetMissingResources>;

type TestComponentProps = ComponentProps<typeof StartMigrationCard>;

const defaultProps: TestComponentProps = {
  setComplete: jest.fn(),
  isCardComplete: jest.fn(
    (cardId: OnboardingCardId) => cardId === OnboardingCardId.siemMigrationsAiConnectors
  ),
  setExpandedCardId: jest.fn(),
  checkComplete: jest.fn(),
  isCardAvailable: () => true,
  checkCompleteMetadata: {
    missingCapabilities: [],
  },
};

const renderTestComponent = (props: Partial<ComponentProps<typeof StartMigrationCard>> = {}) => {
  const finalProps: TestComponentProps = {
    ...defaultProps,
    ...props,
  };

  return render(
    <TestProviders>
      <StartMigrationCard {...finalProps} />
    </TestProviders>
  );
};

describe('StartMigrationsBody', () => {
  beforeEach(() => {
    useLatestStatsSpy.mockReturnValue(mockedLatestStats);
    useUpsellingComponentMock.mockReturnValue(null);
    useGetMigrationTranslationStatsSpy.mockReturnValue(mockTranslationStats);
    useGetMissingResourcesMock.mockReturnValue(mockMissingResources);
  });
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should render upsell correctly when available', () => {
    useUpsellingComponentMock.mockReturnValue(MockUpsellingComponent);

    renderTestComponent();

    expect(screen.getByTestId('mockUpsellSection')).toBeVisible();
    expect(screen.getByTestId('startMigrationUploadRulesButton')).toBeVisible();
    expect(screen.getByTestId('startMigrationUploadRulesButton')).toBeDisabled();
  });

  it('should render missing Privileges Callout when there are missing capabilities but NO Upsell', () => {
    renderTestComponent({
      checkCompleteMetadata: {
        missingCapabilities: ['missingPrivileges'],
      },
    });

    expect(screen.getByTestId('missingPrivilegesGroup')).toBeVisible();
  });

  it('should render component correctly when no upsell and no missing capabilities', () => {
    renderTestComponent();

    expect(screen.getByTestId('StartMigrationsCardBody')).toBeVisible();
    expect(screen.getByTestId('StartMigrationsCardBody')).not.toBeEmptyDOMElement();
  });

  it('should mark card as complete when migration is finished', async () => {
    useLatestStatsSpy.mockReturnValue({
      ...mockedLatestStats,
      data: [
        {
          id: '1',
          status: SiemMigrationTaskStatus.FINISHED,
        } as unknown as RuleMigrationStats,
      ],
    });

    await act(async () => {
      renderTestComponent();
    });

    await waitFor(() => {
      expect(defaultProps.setComplete).toHaveBeenCalledWith(true);
    });
  });

  it('should render loader when migration handler is loading', async () => {
    const latestStatus = {
      ...mockedLatestStats,
      isLoading: true,
      data: [
        {
          id: '1',
          status: SiemMigrationTaskStatus.RUNNING,
          rules: {
            total: 1,
            pending: 1,
            processing: 1,
            completed: 0,
            failed: 0,
          },
        } as unknown as RuleMigrationStats,
      ],
    };

    useLatestStatsSpy.mockReturnValue(latestStatus);

    renderTestComponent();

    expect(screen.getByTestId('centeredLoadingSpinner')).toBeVisible();
  });

  it('should render progress bar when migration is running', async () => {
    const latestStats = {
      ...mockedLatestStats,
      isLoading: false,
      data: [
        {
          id: '1',
          status: SiemMigrationTaskStatus.RUNNING,
          rules: {
            total: 1,
            pending: 1,
            processing: 1,
            completed: 0,
            failed: 0,
          },
        } as unknown as RuleMigrationStats,
      ],
    };
    useLatestStatsSpy.mockReturnValue(latestStats);

    await act(async () => {
      renderTestComponent();
    });

    await waitFor(() => {
      expect(screen.getByTestId('migrationProgressPanel')).toBeVisible();
    });
  });

  it('should render result panel when migration is finished', async () => {
    const latestStats = {
      ...mockedLatestStats,
      isLoading: false,
      data: [
        {
          id: '1',
          status: SiemMigrationTaskStatus.FINISHED,
          rules: {
            total: 1,
            pending: 0,
            processing: 0,
            completed: 1,
            failed: 0,
          },
        } as unknown as RuleMigrationStats,
      ],
    };

    useLatestStatsSpy.mockReturnValue(latestStats);

    await act(async () => {
      renderTestComponent();
    });

    expect(screen.getByTestId('ruleMigrationPanelGroup')).toBeVisible();
  });
});
