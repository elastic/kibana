/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/*
 * Generic MigrationTitle component for SIEM migrations (rules & dashboards)
 * Wraps inline rename + delete actions. Preserves existing data-test-subj values used by rule panels.
 */
import React, { useState, useCallback, useMemo } from 'react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiInlineEditText,
  EuiPopover,
  EuiButtonIcon,
  EuiContextMenuPanel,
  EuiContextMenuItem,
  EuiConfirmModal,
  EuiToolTip,
  useGeneratedHtmlId,
  useEuiTheme,
  EuiBadge,
} from '@elastic/eui';
import { PanelText } from '../../../../common/components/panel_text';
import { SiemMigrationTaskStatus } from '../../../../../common/siem_migrations/constants';
import type { MigrationType } from '../../../../../common/siem_migrations/types';
import { useDeleteMigration } from '../../hooks/use_delete_migrations';
import { useUpdateSiemMigration } from '../../hooks/use_update_siem_migration';
import * as i18n from './translations';
import type { MigrationTaskStats } from '../../../../../common/siem_migrations/model/common.gen';
import { useIsOpenState } from '../../../../common/hooks/use_is_open_state';
import { MIGRATION_VENDOR_COLOR_CONFIG } from '../../utils/migration_vendor_color_config';
import { MIGRATION_VENDOR_DISPLAY_NAME } from '../../constants';

export interface MigrationPanelTitleProps {
  migrationStats: MigrationTaskStats;
  migrationType: MigrationType;
}

export const MigrationPanelTitle = React.memo(function MigrationPanelTitle({
  migrationStats,
  migrationType,
}: MigrationPanelTitleProps) {
  const { euiTheme } = useEuiTheme();
  const [name, setName] = useState(migrationStats.name);
  const [isEditing, setIsEditing] = useState(false);

  const {
    isOpen: isPopoverOpen,
    toggle: togglePopover,
    close: closePopover,
  } = useIsOpenState(false);
  const {
    isOpen: isDeleteModalOpen,
    open: openDeleteModal,
    close: closeDeleteModal,
  } = useIsOpenState(false);

  const confirmModalTitleId = useGeneratedHtmlId();

  const onRenameError = useCallback(() => {
    setName(migrationStats.name); // revert visual name; toast handled in hook
  }, [migrationStats.name]);

  const { mutate: deleteMigration, isLoading: isDeleting } = useDeleteMigration(migrationType);
  const { mutate: updateMigration, isLoading: isUpdating } = useUpdateSiemMigration(migrationType, {
    onError: onRenameError,
  });

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

  const cancelEdit = useCallback(() => setIsEditing(false), []);

  const saveName = useCallback(
    (value: string) => {
      setName(value);
      updateMigration({ migrationId: migrationStats.id, body: { name: value } });
      setIsEditing(false);
    },
    [migrationStats.id, updateMigration]
  );

  const confirmDelete = useCallback(() => {
    deleteMigration(migrationStats);
    closeDeleteModal();
  }, [deleteMigration, migrationStats, closeDeleteModal]);

  const stopPropagation = useCallback((e: React.MouseEvent) => {
    e.stopPropagation(); // prevent click events from bubbling up and toggle the collapsible panel
  }, []);

  return (
    <EuiFlexGroup
      direction="row"
      alignItems="center"
      gutterSize="xs"
      data-test-subj="migrationPanelTitle"
    >
      {migrationStats.vendor && (
        <EuiFlexItem
          grow={false}
          css={{
            marginRight: euiTheme.size.xs,
          }}
        >
          <EuiBadge
            color={MIGRATION_VENDOR_COLOR_CONFIG[migrationStats.vendor]}
            data-test-subj="migrationVendorBadge"
          >
            {MIGRATION_VENDOR_DISPLAY_NAME[migrationStats.vendor]}
          </EuiBadge>
        </EuiFlexItem>
      )}
      {isEditing ? (
        <EuiFlexItem grow={false} onClick={stopPropagation}>
          <EuiInlineEditText
            defaultValue={name}
            size="s"
            inputAriaLabel="Migration name"
            onCancel={cancelEdit}
            onSave={saveName}
            startWithEditOpen
            editModeProps={{
              inputProps: {
                autoFocus: true,
              },
            }}
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
                  isLoading={isUpdating || isDeleting}
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
                    <span tabIndex={0}>{i18n.DELETE_BUTTON_TEXT}</span>
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
                onConfirm={confirmDelete}
                confirmButtonText={i18n.DELETE_MIGRATION_TEXT}
                cancelButtonText={i18n.CANCEL_DELETE_MIGRATION_TEXT}
                buttonColor="danger"
                isLoading={isDeleting}
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
