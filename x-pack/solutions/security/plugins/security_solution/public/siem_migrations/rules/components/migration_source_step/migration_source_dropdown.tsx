/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useCallback } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiForm, EuiFormRow, EuiSuperSelect } from '@elastic/eui';
import * as i18n from './translations';
import type { MigrationSourceDropdownProps } from './use_migration_source_step';
import type { MigrationSource } from '../../../common/types';

export const MigrationSourceDropdown = React.memo<MigrationSourceDropdownProps>(
  ({ migrationSource, setMigrationSource, disabled, migrationSourceOptions }) => {
    const handleMigrationSourceChange = useCallback(
      (selected: MigrationSource) => {
        setMigrationSource(selected);
      },
      [setMigrationSource]
    );

    return (
      <EuiFlexGroup direction="column" gutterSize="s" alignItems="stretch">
        <EuiFlexItem grow={true}>
          <EuiForm>
            <EuiFormRow
              label={i18n.MIGRATION_SOURCE_DROPDOWN_TITLE}
              fullWidth
              helpText={disabled ? i18n.MIGRATION_SOURCE_DROPDOWN_HELPER_TEXT : undefined}
            >
              <EuiSuperSelect
                options={migrationSourceOptions}
                valueOfSelected={migrationSource}
                onChange={handleMigrationSourceChange}
                autoFocus
                data-test-subj="migrationSourceDropdown"
                disabled={disabled}
              />
            </EuiFormRow>
          </EuiForm>
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }
);

MigrationSourceDropdown.displayName = 'MigrationSourceDropdown';
