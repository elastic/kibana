/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import { MigrationSourceDropdown } from './migration_source_dropdown';
import * as i18n from './translations';
import { MigrationSource } from '../../../common/types';
import { MIGRATION_VENDOR_DISPLAY_NAME } from '../../../common/constants';
import { mocked } from 'jest-mock';
import { useIsExperimentalFeatureEnabled } from '../../../../common/hooks/use_experimental_features';

jest.mock('../../../../common/hooks/use_experimental_features', () => ({
  useIsExperimentalFeatureEnabled: jest.fn(),
}));

describe('MigrationSourceDropdown', () => {
  const mockSetMigrationSource = jest.fn();

  const defaultProps = {
    migrationSource: MigrationSource.SPLUNK,
    setMigrationSource: mockSetMigrationSource,
    disabled: false,
    migrationSourceOptions: [
      {
        value: MigrationSource.SPLUNK,
        inputDisplay: <span>{MIGRATION_VENDOR_DISPLAY_NAME[MigrationSource.SPLUNK]}</span>,
      },
      {
        value: MigrationSource.QRADAR,
        inputDisplay: <span>{MIGRATION_VENDOR_DISPLAY_NAME[MigrationSource.QRADAR]}</span>,
      },
    ],
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mocked(useIsExperimentalFeatureEnabled).mockReturnValue(true);
  });

  it('renders with initial value', () => {
    render(<MigrationSourceDropdown {...defaultProps} />);

    const select = screen.getByTestId('migrationSourceDropdown');
    expect(select.textContent).toContain(MIGRATION_VENDOR_DISPLAY_NAME[MigrationSource.SPLUNK]);
  });

  it('disables the dropdown when disabled equals true', () => {
    render(<MigrationSourceDropdown {...defaultProps} disabled={true} />);

    const select = screen.getByTestId('migrationSourceDropdown');
    expect(select).toBeDisabled();
  });

  it('shows helper text when disabled', () => {
    render(<MigrationSourceDropdown {...defaultProps} disabled={true} />);
    expect(screen.getByText(i18n.MIGRATION_SOURCE_DROPDOWN_HELPER_TEXT)).toBeInTheDocument();
  });

  it('does not show helper text when feature flag is disabled', () => {
    mocked(useIsExperimentalFeatureEnabled).mockReturnValue(false);

    render(<MigrationSourceDropdown {...defaultProps} disabled={false} />);
    expect(screen.queryByText(i18n.MIGRATION_SOURCE_DROPDOWN_HELPER_TEXT)).not.toBeInTheDocument();
  });
});
