/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useCallback, useMemo } from 'react';
import { EuiFieldText, EuiFlexGroup, EuiFlexItem, EuiFormRow, EuiForm } from '@elastic/eui';
import * as i18n from './translations';

export interface MigrationNameInputProps {
  migrationName: string;
  setMigrationName: (migrationName: string) => void;
}

export const MigrationNameInput = React.memo<MigrationNameInputProps>(
  ({ migrationName, setMigrationName }) => {
    const [name, setName] = useState<string>(migrationName);

    const handleNameChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
      setName(e.target.value);
    }, []);

    const handleNameSave = useCallback(() => {
      setMigrationName(name);
    }, [name, setMigrationName]);

    const isInvalid = name.length === 0;
    const errors = useMemo(() => {
      if (isInvalid) {
        return [i18n.MIGRATION_NAME_INPUT_ERROR];
      }
      return [];
    }, [isInvalid]);

    const onEnter = useCallback(
      (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          (e.target as HTMLInputElement).blur();
          handleNameSave();
        }
      },
      [handleNameSave]
    );

    const onBlur = useCallback(() => {
      handleNameSave();
    }, [handleNameSave]);

    return (
      <EuiFlexGroup direction="column" gutterSize="s" alignItems="stretch">
        <EuiFlexItem grow={true}>
          <EuiForm>
            <EuiFormRow isInvalid={isInvalid} error={errors} fullWidth>
              <EuiFieldText
                placeholder={i18n.MIGRATION_NAME_INPUT_DESCRIPTION}
                value={name}
                onChange={handleNameChange}
                isInvalid={isInvalid}
                onBlur={onBlur}
                onKeyDown={onEnter}
                fullWidth
                autoFocus
                data-test-subj="migrationNameInput"
              />
            </EuiFormRow>
          </EuiForm>
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }
);

MigrationNameInput.displayName = 'MigrationNameInput';
