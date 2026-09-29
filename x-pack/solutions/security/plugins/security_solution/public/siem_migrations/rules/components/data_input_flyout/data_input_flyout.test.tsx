/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';
import type { MockedFunction } from 'vitest';

import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react';
import { EuiButton } from '@elastic/eui';

import { MigrationDataInputFlyout } from './data_input_flyout';
import { TestProviders } from '../../../../common/mock/test_providers';
import { SiemMigrationTaskStatus } from '../../../../../common/siem_migrations/constants';
import { getRuleMigrationStatsMock } from '../../__mocks__/migration_rule_stats';
import { useStartRulesMigrationModal } from '../../hooks/use_start_rules_migration_modal';
import { MigrationSource } from '../../../common/types';
import type { HandleMissingResourcesIndexed } from '../../../common/types';

const mockOnClose = vi.fn();
const mockStartMigration = vi.fn();
const mockShowModal = vi.fn();

vi.mock('@elastic/eui', async () => {
  const actual = await vi.importActual('@elastic/eui');
  return {
    ...actual,
    useGeneratedHtmlId: vi.fn(() => 'generated-id'),
  };
});

vi.mock('../../../../common/lib/kibana/kibana_react', () => {
  const mocked = {
    useKibana: () => ({
      services: {
        siemMigrations: {
          rules: {
            api: {
              getMissingResources: vi.fn(),
            },
            telemetry: {
              reportSetupLookupNameCopied: vi.fn(),
            },
          },
        },
        notifications: {
          toasts: {
            addError: vi.fn(),
            addSuccess: vi.fn(),
            addWarning: vi.fn(),
            addInfo: vi.fn(),
            remove: vi.fn(),
          },
        },
        triggersActionsUi: {
          actionTypeRegistry: {
            get: vi.fn().mockReturnValue('Mock Action Type'),
          },
        },
      },
    }),
  };
  return { ...mocked, default: mocked };
});

vi.mock('../../../../common/components/user_profiles/use_get_current_user_profile', () => {
  const mocked = {
    useGetCurrentUserProfile: () => ({
      data: { user: { full_name: 'Test User', username: 'testuser' } },
    }),
  };
  return { ...mocked, default: mocked };
});

vi.mock('../../../common/hooks/use_get_missing_resources', async () => {
  const actual = await vi.importActual('../../../common/hooks/use_get_missing_resources');
  return {
    ...actual,
    useGetMissingResources: () => ({
      isLoading: false,
      error: null,
      getMissingResources: vi.fn(),
    }),
  };
});

vi.mock('../../logic/use_start_migration', async () => {
  const actual = await vi.importActual('../../logic/use_start_migration');
  return {
    ...actual,
    useStartMigration: () => ({
      isLoading: false,
      error: null,
      startMigration: mockStartMigration,
    }),
  };
});

vi.mock('../../../../common/hooks/use_experimental_features', () => {
  const mocked = {
    useIsExperimentalFeatureEnabled: vi.fn(() => true),
  };
  return { ...mocked, default: mocked };
});

const mockUseMissingResources = vi.fn();
vi.mock('../../../common/hooks/use_missing_resources', () => {
  const mocked = {
    useMissingResources: (...args: unknown[]) => mockUseMissingResources(...args),
  };
  return { ...mocked, default: mocked };
});

vi.mock('../../service/hooks/use_enhance_rules', () => {
  const mocked = {
    useEnhanceRules: () => ({ enhanceRules: vi.fn(), isLoading: false, error: null }),
  };
  return { ...mocked, default: mocked };
});

vi.mock('../../../../common/hooks/use_app_toasts', () => {
  const mocked = {
    useAppToasts: () => ({ addError: vi.fn(), addSuccess: vi.fn() }),
  };
  return { ...mocked, default: mocked };
});

vi.mock('../../hooks/use_start_rules_migration_modal');
const useStartRulesMigrationModalMock = useStartRulesMigrationModal as MockedFunction<
  typeof useStartRulesMigrationModal
>;

describe('MigrationDataInputFlyout', () => {
  beforeEach(() => {
    mockUseMissingResources.mockReturnValue({
      missingResourcesIndexed: undefined,
      onMissingResourcesFetched: vi.fn(),
      missingResourceCount: 0,
    });

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
    vi.clearAllMocks();
  });

  it('renders the data input flyout', () => {
    const { getByTestId } = render(
      <TestProviders>
        <MigrationDataInputFlyout onClose={() => {}} migrationStats={undefined} />
      </TestProviders>
    );

    expect(getByTestId('uploadRulesFlyout')).toBeInTheDocument();
  });

  it('exposes the visible title as the accessible name of the flyout title element', () => {
    const { getByRole } = render(
      <TestProviders>
        <MigrationDataInputFlyout onClose={() => {}} migrationStats={undefined} />
      </TestProviders>
    );

    // the flyout references this heading via `aria-labelledby`, so its accessible
    // name must be the visible title and not an internal identifier
    expect(getByRole('heading', { name: 'Upload SIEM rules' })).toBeInTheDocument();
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

  describe('QRadar skip reference set step', () => {
    const MISSING_LOOKUPS = { macros: [], lookups: ['ref_set_1', 'ref_set_2'] };

    beforeEach(() => {
      const react = require('react');
      mockUseMissingResources.mockImplementation(
        ({
          handleMissingResourcesIndexed,
          migrationSource,
        }: {
          handleMissingResourcesIndexed?: HandleMissingResourcesIndexed;
          migrationSource: MigrationSource;
        }) => {
          react.useEffect(() => {
            handleMissingResourcesIndexed?.({
              migrationSource,
              newMissingResourcesIndexed: MISSING_LOOKUPS,
            });
          }, [handleMissingResourcesIndexed, migrationSource]);

          return {
            missingResourcesIndexed: MISSING_LOOKUPS,
            onMissingResourcesFetched: vi.fn(),
            missingResourceCount: MISSING_LOOKUPS.lookups.length,
          };
        }
      );
    });

    const qradarMigrationStats = getRuleMigrationStatsMock({
      id: 'qradar-migration-1',
      status: SiemMigrationTaskStatus.READY,
      vendor: MigrationSource.QRADAR,
    });

    it('advances from Reference Set step to Enhancements step when skip button is clicked', async () => {
      const { getByTestId, queryByTestId } = render(
        <TestProviders>
          <MigrationDataInputFlyout onClose={vi.fn()} migrationStats={qradarMigrationStats} />
        </TestProviders>
      );

      await waitFor(() => {
        expect(getByTestId('lookupsUploadSkipButton')).toBeInTheDocument();
      });

      expect(getByTestId('referenceSetsUploadStepNumber')).toHaveTextContent('Current step is 2');
      expect(getByTestId('enhancementsStepNumber')).toHaveTextContent('3');
      expect(queryByTestId('enhancementTypeSelect')).not.toBeInTheDocument();

      fireEvent.click(getByTestId('lookupsUploadSkipButton'));

      await waitFor(() => {
        expect(getByTestId('enhancementsStepNumber')).toHaveTextContent('Current step is 3');
      });

      expect(getByTestId('enhancementTypeSelect')).toBeInTheDocument();
      expect(getByTestId('enhancementFilePicker')).toBeInTheDocument();

      expect(queryByTestId('lookupsUploadSkipButton')).not.toBeInTheDocument();
      expect(queryByTestId('referenceSetsUploadDescription')).not.toBeInTheDocument();
    });
  });
});
