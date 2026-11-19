/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ComponentProps } from 'react';
import React from 'react';
import { render, screen } from '@testing-library/react';
import { TestProviders } from '../../../../../../../common/mock';
import * as useLatestStatsModule from '../../../../../../../siem_migrations/workflows/service/hooks/use_latest_stats';
import * as useUpsellingComponentModule from '../../../../../../../common/hooks/use_upselling';
import { SiemMigrationTaskStatus } from '../../../../../../../../common/siem_migrations/constants';
import { OnboardingCardId } from '../../../../../../constants';
import StartWorkflowMigrationCard from './start_migration_card';

const useLatestStatsSpy = jest.spyOn(useLatestStatsModule, 'useLatestStats');
const useUpsellingComponentSpy = jest.spyOn(useUpsellingComponentModule, 'useUpsellingComponent');

const MockUpsellingComponent = () => (
  <div data-test-subj="mockUpsellSection">{`Start Migrations Upselling Component`}</div>
);

const getMigration = (id: string, status: SiemMigrationTaskStatus) => ({
  id,
  name: `Migration ${id}`,
  status,
  created_at: '2024-06-01T12:00:00Z',
  last_updated_at: '2024-06-01T12:30:00Z',
  items: { total: 2, pending: 2, processing: 0, completed: 0, failed: 0 },
});

const mockLatestStats = (data: unknown[], isLoading = false) =>
  useLatestStatsSpy.mockReturnValue({
    data,
    isLoading,
    refreshStats: jest.fn(),
  } as unknown as ReturnType<typeof useLatestStatsModule.useLatestStats>);

type TestComponentProps = ComponentProps<typeof StartWorkflowMigrationCard>;
const defaultProps: TestComponentProps = {
  setComplete: jest.fn(),
  isCardComplete: jest.fn(
    (cardId: OnboardingCardId) => cardId === OnboardingCardId.siemMigrationsAiConnectors
  ),
  setExpandedCardId: jest.fn(),
  checkComplete: jest.fn(),
  isCardAvailable: () => true,
  checkCompleteMetadata: { missingCapabilities: [] },
};

const renderCard = (props: Partial<TestComponentProps> = {}) =>
  render(
    <TestProviders>
      <StartWorkflowMigrationCard {...defaultProps} {...props} />
    </TestProviders>
  );

describe('StartWorkflowMigrationCard', () => {
  beforeEach(() => {
    mockLatestStats([]);
    useUpsellingComponentSpy.mockReturnValue(null);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should show the upsell with a disabled upload button when upselling is available', () => {
    useUpsellingComponentSpy.mockReturnValue(MockUpsellingComponent);

    renderCard();

    expect(screen.getByTestId('mockUpsellSection')).toBeVisible();
    expect(screen.getByTestId('startWorkflowMigrationUploadButton')).toBeDisabled();
  });

  it('should show the missing privileges callout when capabilities are missing', () => {
    renderCard({ checkCompleteMetadata: { missingCapabilities: ['Workflows: Read'] } });

    expect(screen.getByTestId('missingPrivilegesGroup')).toBeVisible();
    expect(screen.getByText(/Workflows: Read/)).toBeVisible();
  });

  it('should not show the upload panel when capabilities are missing', () => {
    renderCard({ checkCompleteMetadata: { missingCapabilities: ['Workflows: Read'] } });

    expect(screen.queryByTestId('startWorkflowMigrationUploadButton')).not.toBeInTheDocument();
  });

  it('should show the card body with the upload panel when there is nothing missing', () => {
    renderCard();

    expect(screen.getByTestId('startWorkflowMigrationsCardBody')).toBeVisible();
    expect(screen.getByTestId('startWorkflowMigrationUploadButton')).toBeEnabled();
  });

  it('should disable the upload button when the AI connectors card is not complete', () => {
    renderCard({ isCardComplete: jest.fn(() => false) });

    expect(screen.getByTestId('startWorkflowMigrationUploadButton')).toBeDisabled();
  });

  it('should show a loading spinner while the migrations are loading', () => {
    mockLatestStats([], true);

    renderCard();

    expect(screen.queryByTestId('startWorkflowMigrationUploadButton')).not.toBeInTheDocument();
  });

  it('should show the ready panel of a migration that is ready to start', () => {
    mockLatestStats([getMigration('1', SiemMigrationTaskStatus.READY)]);

    renderCard();

    expect(screen.getByTestId('workflowMigrationReadyPanel')).toBeVisible();
  });

  it('should show the result panel of a finished migration', () => {
    mockLatestStats([getMigration('1', SiemMigrationTaskStatus.FINISHED)]);

    renderCard();

    expect(screen.getByTestId('workflowMigrationResultPanel')).toBeVisible();
  });

  it('should offer to upload more stories when there are migrations', () => {
    mockLatestStats([getMigration('1', SiemMigrationTaskStatus.READY)]);

    renderCard();

    expect(screen.getByTestId('startWorkflowMigrationUploadMoreButton')).toBeVisible();
  });
});
