/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ComponentProps } from 'react';
import React from 'react';
import { TestProviders } from '../../../../../../../common/mock';
import * as useLatestStatsModule from '../../../../../../../siem_migrations/dashboards/service/hooks/use_latest_stats';
import StartDashboardMigrationCard from './start_migration_card';
import * as useUpsellingComponentModule from '../../../../../../../common/hooks/use_upselling';
import { OnboardingCardId } from '../../../../../../constants';
import { render, screen } from '@testing-library/react';
import * as useGetMigrationTranslationStatsModule from '../../../../../../../siem_migrations/dashboards/logic/use_get_migration_translation_stats';
import * as useGetMissingResourcesModule from '../../../../../../../siem_migrations/common/hooks/use_get_missing_resources';

const useLatestStatsSpy = jest.spyOn(useLatestStatsModule, 'useLatestStats');

const useGetMigrationTranslationStatsSpy = jest.spyOn(
  useGetMigrationTranslationStatsModule,
  'useGetMigrationTranslationStats'
);

const useGetMissingResourcesMock = jest.spyOn(
  useGetMissingResourcesModule,
  'useGetMissingResources'
);

const useUpsellingComponentSpy = jest.spyOn(useUpsellingComponentModule, 'useUpsellingComponent');

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
    dashboards: {
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

type TestComponentProps = ComponentProps<typeof StartDashboardMigrationCard>;
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

const renderTestComponent = (props: Partial<TestComponentProps> = {}) => {
  const finalProps: TestComponentProps = {
    ...defaultProps,
    ...props,
  };

  return render(
    <TestProviders>
      <StartDashboardMigrationCard {...finalProps} />
    </TestProviders>
  );
};

describe('StartDashboardMigrationCard', () => {
  beforeEach(() => {
    useLatestStatsSpy.mockReturnValue(mockedLatestStats);
    useUpsellingComponentSpy.mockReturnValue(null);
    useGetMigrationTranslationStatsSpy.mockReturnValue(mockTranslationStats);
    useGetMissingResourcesMock.mockReturnValue(mockMissingResources);
  });
  afterEach(() => {
    jest.clearAllMocks();
  });
  it('should render upsell correctly when available', () => {
    useUpsellingComponentSpy.mockReturnValue(MockUpsellingComponent);

    renderTestComponent();

    expect(screen.getByTestId('mockUpsellSection')).toBeVisible();
    expect(screen.getByTestId('startDashboardMigrationUploadDashboardsButton')).toBeVisible();
    expect(screen.getByTestId('startDashboardMigrationUploadDashboardsButton')).toBeDisabled();
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

    expect(screen.getByTestId('startDashboardMigrationsCardBody')).toBeVisible();
    expect(screen.getByTestId('startDashboardMigrationsCardBody')).not.toBeEmptyDOMElement();
  });
});
