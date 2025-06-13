/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useCallback, useMemo } from 'react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiInlineEditText,
  EuiButtonIcon,
  EuiConfirmModal,
} from '@elastic/eui';
import * as i18n from './translations';
import type { MigrationReadyPanelProps } from './migration_ready_panel';
import type { RuleMigrationResourceBase } from '../../../../../common/siem_migrations/model/rule_migration.gen';
import { SiemMigrationTaskStatus } from '../../../../../common/siem_migrations/constants';
import { useUpdateMigrationName } from '../../logic/use_update_migration_name';
import { useDeleteMigration } from '../../logic/use_delete_migration';

type MigrationNameProps = MigrationReadyPanelProps & {
  isLoading?: boolean;
  missingResources?: RuleMigrationResourceBase[];
  refreshStats?: () => void;
};

const MigrationName = React.memo<MigrationNameProps>(({ migrationStats, refreshStats }) => {
  const [inlineEditValue, setInlineEditValue] = useState<string>(
    migrationStats.name ?? i18n.RULE_MIGRATION_TITLE(migrationStats.number)
  );
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  const { mutate: updateMigrationName, isLoading: isUpdatingMigrationName } =
    useUpdateMigrationName();
  const { mutate: deleteMigration, isLoading: isDeletingMigration } = useDeleteMigration(
    migrationStats.id,
    refreshStats
  );
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

  const handleDeleteMigration = useCallback(() => {
    deleteMigration({ migration_id: migrationStats.id });
    setIsDeleteModalOpen(false);
  }, [deleteMigration, migrationStats.id]);

  const isDeletable = useMemo(() => {
    return (
      migrationStats.status === SiemMigrationTaskStatus.FINISHED ||
      migrationStats.status === SiemMigrationTaskStatus.ABORTED ||
      migrationStats.status === SiemMigrationTaskStatus.STOPPED
    );
  }, [migrationStats.status]);

  const openDeleteModal = useCallback(() => {
    setIsDeleteModalOpen(true);
  }, []);

  const closeDeleteModal = useCallback(() => {
    setIsDeleteModalOpen(false);
  }, []);

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
          <EuiFlexItem grow={false}>
            {isDeletable && (
              <EuiButtonIcon
                iconType="trash"
                aria-label="Delete"
                color="danger"
                onClick={openDeleteModal}
                isLoading={isDeletingMigration}
              />
            )}
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
      {isDeleteModalOpen && (
        <EuiConfirmModal
          title={i18n.DELETE_MIGRATION_TITLE}
          onCancel={closeDeleteModal}
          onConfirm={handleDeleteMigration}
          confirmButtonText="Delete"
          cancelButtonText="Cancel"
          buttonColor="danger"
          isLoading={isDeletingMigration}
        >
          <p>{i18n.DELETE_MIGRATION_DESCRIPTION}</p>
        </EuiConfirmModal>
      )}
    </>
  );
});

MigrationName.displayName = 'MigrationName';

export { MigrationName };
