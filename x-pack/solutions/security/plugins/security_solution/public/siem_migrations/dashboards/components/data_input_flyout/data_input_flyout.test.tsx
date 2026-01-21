/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react';
import { EuiButton } from '@elastic/eui';

import { DashboardMigrationDataInputFlyout } from './data_input_flyout';
import { TestProviders } from '../../../../common/mock/test_providers';
import { SiemMigrationTaskStatus } from '../../../../../common/siem_migrations/constants';
import { getDashboardMigrationStatsMock } from '../../__mocks__';
import { useStartDashboardsMigrationModal } from '../../hooks/use_start_dashboard_migration_modal';

const mockCloseFlyout = jest.fn();
const mockGetMissingResourcesDashboard = jest.fn();
const mockAddError = jest.fn();
const mockAddSuccess = jest.fn();
const mockStartMigration = jest.fn();
const mockOnClose = jest.fn();
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
        dashboards: {
          api: {
            getDashboardMigrationMissingResources: mockGetMissingResourcesDashboard,
          },
        },
      },
      notifications: {
        toasts: {
          addError: mockAddError,
          addSuccess: mockAddSuccess,
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

jest.mock('../../../common/components/migration_data_input_flyout_context', () => {
  const actual = jest.requireActual(
    '../../../common/components/migration_data_input_flyout_context'
  );
  return {
    ...actual,
    useMigrationDataInputContext: () => ({
      closeFlyout: mockCloseFlyout,
    }),
  };
});

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

jest.mock('../../hooks/use_start_dashboard_migration_modal');
const useStartDashboardsMigrationModalMock =
  useStartDashboardsMigrationModal as jest.MockedFunction<typeof useStartDashboardsMigrationModal>;

describe('DashboardMigrationDataInputFlyout', () => {
  beforeEach(() => {
    useStartDashboardsMigrationModalMock.mockImplementation(({ onStartMigrationWithSettings }) => {
      return {
        modal: (
          <>
            {'Test Start Migration Modal'}
            <EuiButton
              data-test-subj="testModalStartMigrationButton"
              onClick={() => onStartMigrationWithSettings({ connectorId: 'Test Connector 1' })}
            />
          </>
        ),
        showModal: mockShowModal,
      } as unknown as ReturnType<typeof useStartDashboardsMigrationModal>;
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders the data input flyout', () => {
    const { getByTestId } = render(
      <TestProviders>
        <DashboardMigrationDataInputFlyout
          onClose={() => {}}
          migrationStats={undefined}
          setFlyoutMigrationStats={() => {}}
        />
      </TestProviders>
    );

    expect(getByTestId('dashboardMigrationDataInputFlyout')).toBeInTheDocument();
  });

  it('calls onClose when the close button is clicked', () => {
    const { getByTestId } = render(
      <TestProviders>
        <DashboardMigrationDataInputFlyout
          onClose={mockOnClose}
          migrationStats={undefined}
          setFlyoutMigrationStats={() => {}}
        />
      </TestProviders>
    );

    fireEvent.click(getByTestId('dataFlyoutCloseButton'));
    expect(mockOnClose).toHaveBeenCalled();
  });

  it('displays "Translate" when it is not a retry', () => {
    const { getByTestId } = render(
      <TestProviders>
        <DashboardMigrationDataInputFlyout
          onClose={() => {}}
          migrationStats={getDashboardMigrationStatsMock({
            id: '1',
            status: SiemMigrationTaskStatus.READY,
          })}
          setFlyoutMigrationStats={() => {}}
        />
      </TestProviders>
    );

    expect(getByTestId('startMigrationButton')).toBeInTheDocument();
    expect(getByTestId('startMigrationButton')).toHaveTextContent('Translate');
  });

  it('displays "Retry translation" when it is a retry', () => {
    const { getByTestId } = render(
      <TestProviders>
        <DashboardMigrationDataInputFlyout
          onClose={() => {}}
          migrationStats={getDashboardMigrationStatsMock({
            id: '1',
            status: SiemMigrationTaskStatus.FINISHED,
          })}
          setFlyoutMigrationStats={() => {}}
        />
      </TestProviders>
    );

    expect(getByTestId('startMigrationButton')).toBeInTheDocument();
    expect(getByTestId('startMigrationButton')).toHaveTextContent('Retry translation');
  });

  it('calls `useStartDashboardsMigrationModal` with correct parameters for a new migration', () => {
    const migrationStats = getDashboardMigrationStatsMock({
      id: 'test-id',
      status: SiemMigrationTaskStatus.READY,
    });
    render(
      <TestProviders>
        <DashboardMigrationDataInputFlyout
          onClose={() => {}}
          migrationStats={migrationStats}
          setFlyoutMigrationStats={() => {}}
        />
      </TestProviders>
    );

    expect(useStartDashboardsMigrationModalMock).toHaveBeenCalledWith({
      migrationStats,
      onStartMigrationWithSettings: expect.anything(),
      type: 'start',
    });
  });

  it('shows modal on startMigrationButton click', async () => {
    const { getByTestId, getByText } = render(
      <TestProviders>
        <DashboardMigrationDataInputFlyout
          onClose={() => {}}
          migrationStats={getDashboardMigrationStatsMock({
            id: 'test-id',
            status: SiemMigrationTaskStatus.READY,
          })}
          setFlyoutMigrationStats={() => {}}
        />
      </TestProviders>
    );

    fireEvent.click(getByTestId('startMigrationButton'));

    await waitFor(() => {
      expect(getByText('Test Start Migration Modal')).toBeInTheDocument();
    });
  });

  it('calls `useStartDashboardsMigrationModal` with correct parameters for a retry', () => {
    const migrationStats = getDashboardMigrationStatsMock({
      id: 'test-id-retry',
      status: SiemMigrationTaskStatus.FINISHED,
    });
    render(
      <TestProviders>
        <DashboardMigrationDataInputFlyout
          onClose={() => {}}
          migrationStats={migrationStats}
          setFlyoutMigrationStats={() => {}}
        />
      </TestProviders>
    );

    expect(useStartDashboardsMigrationModalMock).toHaveBeenCalledWith({
      migrationStats,
      onStartMigrationWithSettings: expect.anything(),
      type: 'retry',
    });
  });

  it('calls `startMigration` with correct parameters for a new migration', () => {
    const migrationStats = getDashboardMigrationStatsMock({
      id: 'test-id-retry',
      status: SiemMigrationTaskStatus.READY,
    });
    const { getByTestId } = render(
      <TestProviders>
        <DashboardMigrationDataInputFlyout
          onClose={() => {}}
          migrationStats={migrationStats}
          setFlyoutMigrationStats={() => {}}
        />
      </TestProviders>
    );

    // Show modal
    fireEvent.click(getByTestId('startMigrationButton'));
    // Start migration
    fireEvent.click(getByTestId('testModalStartMigrationButton'));

    expect(mockStartMigration).toHaveBeenCalledWith(migrationStats, undefined, {
      connectorId: 'Test Connector 1',
    });
  });

  it('calls `startMigration` with correct parameters for a retry', () => {
    const migrationStats = getDashboardMigrationStatsMock({
      id: 'test-id-retry',
      status: SiemMigrationTaskStatus.FINISHED,
    });
    const { getByTestId } = render(
      <TestProviders>
        <DashboardMigrationDataInputFlyout
          onClose={() => {}}
          migrationStats={migrationStats}
          setFlyoutMigrationStats={() => {}}
        />
      </TestProviders>
    );

    // Show modal
    fireEvent.click(getByTestId('startMigrationButton'));
    // Start migration
    fireEvent.click(getByTestId('testModalStartMigrationButton'));

    expect(mockStartMigration).toHaveBeenCalledWith(migrationStats, 'not_fully_translated', {
      connectorId: 'Test Connector 1',
    });
  });
});
