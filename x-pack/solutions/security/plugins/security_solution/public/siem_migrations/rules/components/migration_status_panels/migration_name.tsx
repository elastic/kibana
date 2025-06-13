/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useCallback } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiInlineEditText } from '@elastic/eui';
import * as i18n from './translations';
import type { MigrationReadyPanelProps } from './migration_ready_panel';
import type { RuleMigrationResourceBase } from '../../../../../common/siem_migrations/model/rule_migration.gen';
import { useUpdateMigrationName } from '../../logic/use_update_migration_name';
type MigrationNameProps = MigrationReadyPanelProps & {
  isLoading?: boolean;
  missingResources?: RuleMigrationResourceBase[];
};

const MigrationName = React.memo<MigrationNameProps>(({ migrationStats }) => {
  const [inlineEditValue, setInlineEditValue] = useState<string>(
    migrationStats.name ?? i18n.RULE_MIGRATION_TITLE(migrationStats.number)
  );

  const { mutate: updateMigrationName, isLoading: isUpdatingMigrationName } =
    useUpdateMigrationName();
  const handleInlineEditChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    setInlineEditValue(event.target.value);
  }, []);

  const handleEditCancel = useCallback(() => {
    setInlineEditValue('');
  }, []);

  const handleUpdateMigrationName = useCallback(
    (value: string) => {
      updateMigrationName({ migrationId: migrationStats.id, name: value });
    },
    [updateMigrationName, migrationStats.id]
  );

  return (
    <>
      <EuiFlexItem grow={false}>
        <EuiFlexGroup direction="row" alignItems="center" gutterSize="xs">
          <EuiFlexItem grow={false}>
            <EuiInlineEditText
              value={inlineEditValue}
              size="s"
              inputAriaLabel="Migration name"
              onChange={handleInlineEditChange}
              onCancel={handleEditCancel}
              onSave={handleUpdateMigrationName}
              isLoading={isUpdatingMigrationName}
            />
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
    </>
  );
});

MigrationName.displayName = 'MigrationName';

export { MigrationName };
