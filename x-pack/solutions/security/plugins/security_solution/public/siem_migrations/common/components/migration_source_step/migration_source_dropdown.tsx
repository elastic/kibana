/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useCallback, useState } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiForm, EuiFormRow, EuiSuperSelect } from '@elastic/eui';
import * as i18n from './translations';
import type { MigrationSource } from '../../types';
import { MIGRATIONSOURCE_OPTIONS } from './migration_source_options';

export interface MigrationSourceDropdownProps {
  migrationSource: MigrationSource;
  setMigrationSource: (migrationSource: MigrationSource) => void;
}

export const MigrationSourceDropdown = React.memo<MigrationSourceDropdownProps>(
  ({ migrationSource, setMigrationSource }) => {
    const [value, setValue] = useState<MigrationSource>(migrationSource);
    const [isTouched, setIsTouched] = useState(false);

    const checkAndSetMigrationSource = useCallback(
      (selected: MigrationSource) => {
        if (selected.length > 0) {
          setMigrationSource(selected);
        }
      },
      [setMigrationSource]
    );

    const handleMigrationSourceChange = useCallback(
      (selected: MigrationSource) => {
        setValue(selected);
        checkAndSetMigrationSource(selected);
      },
      [checkAndSetMigrationSource]
    );

    const onBlur = useCallback(() => {
      setMigrationSource(value);
    }, [setMigrationSource, value]);
    return (
      <EuiFlexGroup direction="column" gutterSize="s" alignItems="stretch">
        <EuiFlexItem grow={true}>
          <EuiForm>
            <EuiFormRow
              onClick={() => {
                setIsTouched(true);
              }}
              label={i18n.MIGRATION_SOURCE_DROPDOWN_TITLE}
              fullWidth
            >
              <EuiSuperSelect
                options={MIGRATIONSOURCE_OPTIONS}
                isInvalid={isTouched && value == null}
                valueOfSelected={value}
                onChange={handleMigrationSourceChange}
                onBlur={onBlur}
                autoFocus
                data-test-subj="migrationSourceDropdown"
              />
            </EuiFormRow>
          </EuiForm>
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }
);

MigrationSourceDropdown.displayName = 'MigrationSourceDropdown';
