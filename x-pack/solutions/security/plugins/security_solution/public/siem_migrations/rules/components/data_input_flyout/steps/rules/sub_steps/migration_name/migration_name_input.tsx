/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { EuiFieldText, EuiFlexGroup, EuiFlexItem, EuiFormRow, EuiForm } from '@elastic/eui';
import * as i18n from './translations';

export interface MigrationNameInputProps {
  migrationName: string;
  setMigrationName: (migrationName: string) => void;
  subStep: number;
  defaultMigrationName: string;
}

export const MigrationNameInput = React.memo<MigrationNameInputProps>(
  ({ migrationName, setMigrationName, subStep, defaultMigrationName }) => {
    const [name, setName] = useState<string>(defaultMigrationName);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
      if (inputRef.current) {
        inputRef.current.focus();
      }
    }, []);

    const handleNameChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
      setName(e.target.value);
    }, []);

    const handleNameSave = useCallback(() => {
      if (name.length > 0) {
        setMigrationName(name);
      }
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
          <EuiForm isInvalid={isInvalid} error={errors}>
            <EuiFormRow isInvalid={isInvalid} fullWidth>
              <EuiFieldText
                placeholder={i18n.MIGRATION_NAME_INPUT_DESCRIPTION}
                value={name}
                onChange={handleNameChange}
                isInvalid={isInvalid}
                onBlur={onBlur}
                onKeyDown={onEnter}
                fullWidth
                inputRef={inputRef}
              />
            </EuiFormRow>
          </EuiForm>
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }
);

MigrationNameInput.displayName = 'MigrationNameInput';
