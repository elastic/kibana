/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useCallback, useMemo } from 'react';
import {
  EuiButtonIcon,
  EuiConfirmModal,
  EuiContextMenuItem,
  EuiContextMenuPanel,
  EuiFlexGroup,
  EuiFlexItem,
  EuiInlineEditText,
  EuiPopover,
  EuiToolTip,
  useEuiTheme,
} from '@elastic/eui';
import { SiemMigrationTaskStatus } from '../../../../../common/siem_migrations/constants';
import { useIsVisible } from '../../../../common/hooks/use_visibility';
import { PanelText } from '../../../../common/components/panel_text';
import type { MigrationReadyPanelProps } from './migration_ready_panel';
import { useUpdateMigrationName } from '../../logic/use_update_migration_name';
import * as i18n from './translations';
import { useDeleteMigration } from '../../logic/use_delete_migration';

export const MigrationName = React.memo<MigrationReadyPanelProps>(({ migrationStats }) => {
  const { euiTheme } = useEuiTheme();
  const [name, setName] = useState<string>(migrationStats.name);
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const {
    isVisible: isPopoverOpen,
    close: closePopover,
    toggle: togglePopover,
  } = useIsVisible(false);
  const {
    isVisible: isDeleteModalOpen,
    open: openDeleteModal,
    close: closeDeleteModal,
  } = useIsVisible(false);

  const onRenameError = useCallback(() => {
    setName(migrationStats.name); // revert to original name on error. Error toast will be shown by the mutation hook
  }, [migrationStats.name]);

  const { mutate: renameMigration, isLoading: isRenamingMigration } = useUpdateMigrationName({
    onError: onRenameError,
  });
  const { mutate: deleteMigration, isLoading: isDeletingMigration } = useDeleteMigration();

  const cancelEdit = useCallback(() => {
    setIsEditing(false);
  }, []);

  const saveName = useCallback(
    (value: string) => {
      setName(value);
      renameMigration({ migrationId: migrationStats.id, name: value });
      setIsEditing(false);
    },
    [renameMigration, migrationStats.id]
  );

  const confirmDeleteMigration = useCallback(() => {
    deleteMigration(migrationStats.id);
    closeDeleteModal();
  }, [migrationStats.id, deleteMigration, closeDeleteModal]);

  const isDeletable = useMemo(
    () => migrationStats.status !== SiemMigrationTaskStatus.RUNNING,
    [migrationStats.status]
  );

  const onRenameButtonClick = useCallback(() => {
    closePopover();
    setIsEditing(true);
  }, [closePopover]);

  const onDeleteButtonClick = useCallback(() => {
    closePopover();
    openDeleteModal();
  }, [closePopover, openDeleteModal]);

  const stopPropagation = useCallback((e: React.MouseEvent) => {
    e.stopPropagation(); // prevent click events from bubbling up and toggle the collapsible panel
  }, []);

  return (
    <EuiFlexGroup direction="row" alignItems="center" gutterSize="xs">
      {isEditing ? (
        <EuiFlexItem grow={false} onClick={stopPropagation}>
          <EuiInlineEditText
            defaultValue={name}
            size="s"
            inputAriaLabel="Migration name"
            onCancel={cancelEdit}
            onSave={saveName}
            startWithEditOpen
          />
        </EuiFlexItem>
      ) : (
        <>
          <EuiFlexItem grow={false}>
            <PanelText size="s" semiBold>
              <p>{name}</p>
            </PanelText>
          </EuiFlexItem>
          <EuiFlexItem grow={false} onClick={stopPropagation}>
            <EuiPopover
              button={
                <EuiButtonIcon
                  iconType="boxesVertical"
                  onClick={togglePopover}
                  aria-label={i18n.OPEN_MIGRATION_OPTIONS_BUTTON}
                  data-test-subj="openMigrationOptionsButton"
                  isLoading={isRenamingMigration || isDeletingMigration}
                />
              }
              isOpen={isPopoverOpen}
              closePopover={closePopover}
              panelPaddingSize="none"
              anchorPosition="downCenter"
            >
              <EuiContextMenuPanel size="s">
                <EuiContextMenuItem
                  icon="pencil"
                  onClick={onRenameButtonClick}
                  data-test-subj="renameMigrationItem"
                >
                  {i18n.RENAME_MIGRATION_TEXT}
                </EuiContextMenuItem>
                <EuiContextMenuItem
                  icon="trash"
                  onClick={onDeleteButtonClick}
                  disabled={!isDeletable}
                  css={{ color: isDeletable ? euiTheme.colors.danger : undefined }}
                  data-test-subj="deleteMigrationItem"
                >
                  <EuiToolTip content={isDeletable ? undefined : i18n.NOT_DELETABLE_MIGRATION_TEXT}>
                    <span>{i18n.DELETE_MIGRATION_TEXT}</span>
                  </EuiToolTip>
                </EuiContextMenuItem>
              </EuiContextMenuPanel>
            </EuiPopover>
            {isDeleteModalOpen && (
              <EuiConfirmModal
                title={i18n.DELETE_MIGRATION_TITLE}
                onCancel={closeDeleteModal}
                onConfirm={confirmDeleteMigration}
                confirmButtonText={i18n.DELETE_MIGRATION_TEXT}
                cancelButtonText={i18n.CANCEL_DELETE_MIGRATION_TEXT}
                buttonColor="danger"
                isLoading={isDeletingMigration}
              >
                <p>{i18n.DELETE_MIGRATION_DESCRIPTION}</p>
              </EuiConfirmModal>
            )}
          </EuiFlexItem>
        </>
      )}
    </EuiFlexGroup>
  );
});
MigrationName.displayName = 'MigrationName';
