/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, fireEvent, act } from '@testing-library/react';
import { RuleMigrationsUploadMissingPanel } from './upload_missing_panel';
import { TestProviders } from '../../../../common/mock/test_providers';
import { getRuleMigrationStatsMock } from '../../__mocks__/migration_rule_stats';
import { useMigrationDataInputContext } from '../../../common/components/migration_data_input_flyout_context';
import { useGetMissingResources } from '../../../common/hooks/use_get_missing_resources';
import { useGetMigrationTranslationStats } from '../../logic/use_get_migration_translation_stats';
import type { SiemMigrationResourceBase } from '../../../../../common/siem_migrations/model/common.gen';

jest.mock('../../../common/hooks/use_get_missing_resources');
jest.mock('../../logic/use_get_migration_translation_stats');
jest.mock('../../../common/components/migration_data_input_flyout_context', () => ({
  useMigrationDataInputContext: jest.fn(),
}));

const mockUseGetMissingResources = useGetMissingResources as jest.Mock;
const mockUseGetMigrationTranslationStats = useGetMigrationTranslationStats as jest.Mock;
const mockUseMigrationDataInputContext = useMigrationDataInputContext as jest.Mock;

const missingResourcesMock: SiemMigrationResourceBase[] = [{ name: 'missing-1', type: 'macro' }];

describe('RuleMigrationsUploadMissingPanel', () => {
  let openFlyout: jest.Mock;
  const getMissingResources = jest.fn();
  const migrationStats = getRuleMigrationStatsMock({ id: 'test-id' });

  beforeEach(() => {
    openFlyout = jest.fn();
    mockUseGetMigrationTranslationStats.mockReturnValue({
      data: {
        rules: {
          failed: 1,
          success: {
            result: {
              partial: 1,
              untranslatable: 1,
              success: 1,
            },
          },
        },
      },
      isLoading: false,
    });
    mockUseMigrationDataInputContext.mockReturnValue({
      openFlyout,
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders null when there are no missing resources', () => {
    mockUseGetMissingResources.mockReturnValue({
      getMissingResources,
      isLoading: false,
    });
    const { container } = render(
      <TestProviders>
        <RuleMigrationsUploadMissingPanel migrationStats={migrationStats} />
      </TestProviders>
    );

    expect(container.firstChild).toBeNull();
  });

  it('renders null when loading', () => {
    mockUseGetMissingResources.mockReturnValue({
      getMissingResources,
      isLoading: true,
    });
    const { container } = render(
      <TestProviders>
        <RuleMigrationsUploadMissingPanel migrationStats={migrationStats} />
      </TestProviders>
    );

    expect(container.firstChild).toBeNull();
  });

  it('renders the panel when there are missing resources', () => {
    let setMissingResourcesCallback: (resources: SiemMigrationResourceBase[]) => void = jest.fn();
    mockUseGetMissingResources.mockImplementation((_entity, setMissingResources) => {
      setMissingResourcesCallback = setMissingResources;
      return {
        getMissingResources,
        isLoading: false,
      };
    });

    const { getByTestId } = render(
      <TestProviders>
        <RuleMigrationsUploadMissingPanel migrationStats={migrationStats} />
      </TestProviders>
    );

    act(() => {
      setMissingResourcesCallback(missingResourcesMock);
    });

    // Panel
    expect(getByTestId('uploadMissingPanel')).toBeInTheDocument();
    // Title
    expect(getByTestId('uploadMissingPanelTitle')).toBeInTheDocument();
    expect(getByTestId('uploadMissingPanelTitle')).toHaveTextContent(
      'Upload missing macros and lookup lists.'
    );
    // Description
    expect(getByTestId('uploadMissingPanelDescription')).toBeInTheDocument();
    expect(getByTestId('uploadMissingPanelDescription')).toHaveTextContent(
      'Click Upload to continue translating 3 rules'
    );
    // Upload button
    expect(getByTestId('uploadMissingPanelButton')).toBeInTheDocument();
    expect(getByTestId('uploadMissingPanelButton')).toHaveTextContent('Upload');
  });

  it('opens the flyout on button click', () => {
    let setMissingResourcesCallback: (resources: SiemMigrationResourceBase[]) => void = jest.fn();
    mockUseGetMissingResources.mockImplementation((_entity, setMissingResources) => {
      setMissingResourcesCallback = setMissingResources;
      return {
        getMissingResources,
        isLoading: false,
      };
    });

    const { getByTestId } = render(
      <TestProviders>
        <RuleMigrationsUploadMissingPanel migrationStats={migrationStats} />
      </TestProviders>
    );

    act(() => {
      setMissingResourcesCallback(missingResourcesMock);
    });

    fireEvent.click(getByTestId('uploadMissingPanelButton'));
    expect(openFlyout).toHaveBeenCalledWith(migrationStats);
  });
});
