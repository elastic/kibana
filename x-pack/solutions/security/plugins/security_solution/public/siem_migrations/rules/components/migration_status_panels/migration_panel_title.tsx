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
  useGeneratedHtmlId,
} from '@elastic/eui';
import { SiemMigrationTaskStatus } from '../../../../../common/siem_migrations/constants';
import { useIsOpenState } from '../../../../common/hooks/use_is_open_state';
import { PanelText } from '../../../../common/components/panel_text';
import { useUpdateMigration } from '../../logic/use_update_migration';
import type { RuleMigrationStats } from '../../types';
import * as i18n from './translations';
import { useDeleteMigration } from '../../logic/use_delete_migration';

interface MigrationPanelTitleProps {
  migrationStats: RuleMigrationStats;
}
export const MigrationPanelTitle = React.memo<MigrationPanelTitleProps>(({ migrationStats }) => {
  const { euiTheme } = useEuiTheme();
  const [name, setName] = useState<string>(migrationStats.name);
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const {
    isOpen: isPopoverOpen,
    close: closePopover,
    toggle: togglePopover,
  } = useIsOpenState(false);
  const {
    isOpen: isDeleteModalOpen,
    open: openDeleteModal,
    close: closeDeleteModal,
  } = useIsOpenState(false);

  const confirmModalTitleId = useGeneratedHtmlId();

  const onRenameError = useCallback(() => {
    setName(migrationStats.name); // revert to original name on error. Error toast will be shown by the useUpdateMigration hook
  }, [migrationStats.name]);

  const { mutate: deleteMigration, isLoading: isDeletingMigration } = useDeleteMigration(
    migrationStats.id
  );
  const { mutate: updateMigration, isLoading: isUpdatingMigrationName } = useUpdateMigration(
    migrationStats.id,
    { onError: onRenameError }
  );

  const cancelEdit = useCallback(() => {
    setIsEditing(false);
  }, []);

  const saveName = useCallback(
    (value: string) => {
      setName(value);
      updateMigration({ name: value });
      setIsEditing(false);
    },
    [updateMigration]
  );

  const confirmDeleteMigration = useCallback(() => {
    deleteMigration();
    closeDeleteModal();
  }, [deleteMigration, closeDeleteModal]);

  const isDeletable = useMemo(
    () => migrationStats.status !== SiemMigrationTaskStatus.RUNNING,
    [migrationStats.status]
  );

  const showRename = useCallback(() => {
    closePopover();
    setIsEditing(true);
  }, [closePopover]);

  const showDelete = useCallback(() => {
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
            <PanelText size="s" semiBold data-test-subj="migrationPanelTitleName">
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
                  isLoading={isUpdatingMigrationName || isDeletingMigration}
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
                  onClick={showRename}
                  data-test-subj="renameMigrationItem"
                >
                  {i18n.RENAME_MIGRATION_TEXT}
                </EuiContextMenuItem>
                <EuiContextMenuItem
                  icon="trash"
                  onClick={showDelete}
                  disabled={!isDeletable}
                  css={{ color: isDeletable ? euiTheme.colors.danger : undefined }}
                  data-test-subj="deleteMigrationItem"
                >
                  <EuiToolTip content={isDeletable ? undefined : i18n.NOT_DELETABLE_MIGRATION_TEXT}>
                    <span>{i18n.DELETE_BUTTON_TEXT}</span>
                  </EuiToolTip>
                </EuiContextMenuItem>
              </EuiContextMenuPanel>
            </EuiPopover>
            {isDeleteModalOpen && (
              <EuiConfirmModal
                aria-labelledby={confirmModalTitleId}
                title={i18n.DELETE_MIGRATION_TITLE}
                titleProps={{ id: confirmModalTitleId }}
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
MigrationPanelTitle.displayName = 'MigrationPanelTitle';
