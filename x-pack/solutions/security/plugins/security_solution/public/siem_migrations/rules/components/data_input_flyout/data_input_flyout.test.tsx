/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react';
import { EuiButton } from '@elastic/eui';

import { MigrationDataInputFlyout } from './data_input_flyout';
import { TestProviders } from '../../../../common/mock/test_providers';
import { SiemMigrationTaskStatus } from '../../../../../common/siem_migrations/constants';
import { getRuleMigrationStatsMock } from '../../__mocks__/migration_rule_stats';
import { useStartRulesMigrationModal } from '../../hooks/use_start_rules_migration_modal';

const mockOnClose = jest.fn();
const mockStartMigration = jest.fn();
const mockShowModal = jest.fn();

jest.mock('@elastic/eui', () => {
  const actual = jest.requireActual('@elastic/eui');
  return {
    ...actual,
    useGeneratedHtmlId: jest.fn(() => 'generated-id'),
  };
});

jest.mock('../../../../common/lib/kibana/kibana_react', () => ({
  useKibana: () => ({
    services: {
      siemMigrations: {
        rules: {
          api: {
            getMissingResources: jest.fn(),
          },
        },
      },
      notifications: {
        toasts: {
          addError: jest.fn(),
          addSuccess: jest.fn(),
          addWarning: jest.fn(),
          addInfo: jest.fn(),
          remove: jest.fn(),
        },
      },
      triggersActionsUi: {
        actionTypeRegistry: {
          get: jest.fn().mockReturnValue('Mock Action Type'),
        },
      },
    },
  }),
}));

jest.mock('../../../../common/components/user_profiles/use_get_current_user_profile', () => ({
  useGetCurrentUserProfile: () => ({
    data: { user: { full_name: 'Test User', username: 'testuser' } },
  }),
}));

jest.mock('../../../common/hooks/use_get_missing_resources', () => {
  const actual = jest.requireActual('../../../common/hooks/use_get_missing_resources');
  return {
    ...actual,
    useGetMissingResources: () => ({
      isLoading: false,
      error: null,
      getMissingResources: jest.fn(),
    }),
  };
});

jest.mock('../../logic/use_start_migration', () => {
  const actual = jest.requireActual('../../logic/use_start_migration');
  return {
    ...actual,
    useStartMigration: () => ({
      isLoading: false,
      error: null,
      startMigration: mockStartMigration,
    }),
  };
});

jest.mock('../../hooks/use_start_rules_migration_modal');
const useStartRulesMigrationModalMock = useStartRulesMigrationModal as jest.MockedFunction<
  typeof useStartRulesMigrationModal
>;

describe('MigrationDataInputFlyout', () => {
  beforeEach(() => {
    useStartRulesMigrationModalMock.mockImplementation(({ onStartMigrationWithSettings }) => {
      return {
        modal: (
          <>
            {'Test Start Migration Modal'}
            <EuiButton
              data-test-subj="testModalStartMigrationButton"
              onClick={() =>
                onStartMigrationWithSettings({
                  connectorId: 'Test Connector 1',
                  skipPrebuiltRulesMatching: false,
                })
              }
            />
          </>
        ),
        showModal: mockShowModal,
      } as unknown as ReturnType<typeof useStartRulesMigrationModal>;
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders the data input flyout', () => {
    const { getByTestId } = render(
      <TestProviders>
        <MigrationDataInputFlyout onClose={() => {}} migrationStats={undefined} />
      </TestProviders>
    );

    expect(getByTestId('uploadRulesFlyout')).toBeInTheDocument();
  });

  it('calls onClose when the close button is clicked', () => {
    const { getByText } = render(
      <TestProviders>
        <MigrationDataInputFlyout onClose={mockOnClose} migrationStats={undefined} />
      </TestProviders>
    );

    fireEvent.click(getByText('Close'));
    expect(mockOnClose).toHaveBeenCalled();
  });

  it('displays "Translate" when it is not a retry', () => {
    const { getByTestId } = render(
      <TestProviders>
        <MigrationDataInputFlyout
          onClose={() => {}}
          migrationStats={getRuleMigrationStatsMock({
            id: '1',
            status: SiemMigrationTaskStatus.READY,
          })}
        />
      </TestProviders>
    );

    expect(getByTestId('startMigrationButton')).toBeInTheDocument();
    expect(getByTestId('startMigrationButton')).toHaveTextContent('Translate');
  });

  it('displays "Retry translation" when it is a retry', () => {
    const { getByTestId } = render(
      <TestProviders>
        <MigrationDataInputFlyout
          onClose={() => {}}
          migrationStats={getRuleMigrationStatsMock({
            id: '1',
            status: SiemMigrationTaskStatus.FINISHED,
          })}
        />
      </TestProviders>
    );

    expect(getByTestId('startMigrationButton')).toBeInTheDocument();
    expect(getByTestId('startMigrationButton')).toHaveTextContent('Retry translation');
  });

  it('calls `useStartRulesMigrationModal` with correct parameters for a new migration', () => {
    const migrationStats = getRuleMigrationStatsMock({
      id: 'test-id',
      status: SiemMigrationTaskStatus.READY,
    });
    render(
      <TestProviders>
        <MigrationDataInputFlyout onClose={() => {}} migrationStats={migrationStats} />
      </TestProviders>
    );

    expect(useStartRulesMigrationModalMock).toHaveBeenCalledWith({
      migrationStats,
      onStartMigrationWithSettings: expect.anything(),
      type: 'start',
    });
  });

  it('shows modal on startMigrationButton click', async () => {
    const { getByTestId, getByText } = render(
      <TestProviders>
        <MigrationDataInputFlyout
          onClose={() => {}}
          migrationStats={getRuleMigrationStatsMock({
            id: 'test-id',
            status: SiemMigrationTaskStatus.READY,
          })}
        />
      </TestProviders>
    );

    fireEvent.click(getByTestId('startMigrationButton'));

    await waitFor(() => {
      expect(getByText('Test Start Migration Modal')).toBeInTheDocument();
    });
  });

  it('calls `useStartRulesMigrationModal` with correct parameters for a retry', () => {
    const migrationStats = getRuleMigrationStatsMock({
      id: 'test-id-retry',
      status: SiemMigrationTaskStatus.FINISHED,
    });
    render(
      <TestProviders>
        <MigrationDataInputFlyout onClose={() => {}} migrationStats={migrationStats} />
      </TestProviders>
    );

    expect(useStartRulesMigrationModalMock).toHaveBeenCalledWith({
      migrationStats,
      onStartMigrationWithSettings: expect.anything(),
      type: 'retry',
    });
  });

  it('calls `startMigration` with correct parameters for a new migration', () => {
    const migrationStats = getRuleMigrationStatsMock({
      id: 'test-id-retry',
      status: SiemMigrationTaskStatus.READY,
    });
    const { getByTestId } = render(
      <TestProviders>
        <MigrationDataInputFlyout onClose={() => {}} migrationStats={migrationStats} />
      </TestProviders>
    );

    // Show modal
    fireEvent.click(getByTestId('startMigrationButton'));
    // Start migration
    fireEvent.click(getByTestId('testModalStartMigrationButton'));

    expect(mockStartMigration).toHaveBeenCalledWith(migrationStats, undefined, {
      connectorId: 'Test Connector 1',
      skipPrebuiltRulesMatching: false,
    });
  });

  it('calls `startMigration` with correct parameters for a retry', () => {
    const migrationStats = getRuleMigrationStatsMock({
      id: 'test-id-retry',
      status: SiemMigrationTaskStatus.FINISHED,
    });
    const { getByTestId } = render(
      <TestProviders>
        <MigrationDataInputFlyout onClose={() => {}} migrationStats={migrationStats} />
      </TestProviders>
    );

    // Show modal
    fireEvent.click(getByTestId('startMigrationButton'));
    // Start migration
    fireEvent.click(getByTestId('testModalStartMigrationButton'));

    expect(mockStartMigration).toHaveBeenCalledWith(migrationStats, 'not_fully_translated', {
      connectorId: 'Test Connector 1',
      skipPrebuiltRulesMatching: false,
    });
  });
});
