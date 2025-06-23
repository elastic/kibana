/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useCallback, useMemo } from 'react';
import {
  EuiButtonIcon,
  EuiContextMenuItem,
  EuiContextMenuPanel,
  EuiFlexGroup,
  EuiFlexItem,
  EuiInlineEditText,
  EuiPopover,
} from '@elastic/eui';
import { useIsOpenState } from '../../../../common/hooks/use_is_open_state';
import { PanelText } from '../../../../common/components/panel_text';
import { useUpdateMigration } from '../../logic/use_update_migration';
import type { RuleMigrationStats } from '../../types';
import * as i18n from './translations';

interface MigrationPanelTitleProps {
  migrationStats: RuleMigrationStats;
}
export const MigrationPanelTitle = React.memo<MigrationPanelTitleProps>(({ migrationStats }) => {
  const [name, setName] = useState<string>(migrationStats.name);
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const {
    isOpen: isPopoverOpen,
    close: closePopover,
    toggle: togglePopover,
  } = useIsOpenState(false);

  const onRenameError = useCallback(() => {
    setName(migrationStats.name); // revert to original name on error. Error toast will be shown by the useUpdateMigration hook
  }, [migrationStats.name]);

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

  const items = useMemo(
    () => [
      <EuiContextMenuItem
        key="rename"
        onClick={() => {
          closePopover();
          setIsEditing(true);
        }}
        icon="pencil"
        data-test-subj="renameMigrationItem"
      >
        {i18n.RENAME_MIGRATION_BUTTON}
      </EuiContextMenuItem>,
    ],
    [closePopover, setIsEditing]
  );

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
                  isLoading={isUpdatingMigrationName}
                />
              }
              isOpen={isPopoverOpen}
              closePopover={closePopover}
              panelPaddingSize="none"
              anchorPosition="downCenter"
            >
              <EuiContextMenuPanel size="s" items={items} />
            </EuiPopover>
          </EuiFlexItem>
        </>
      )}
    </EuiFlexGroup>
  );
});
MigrationPanelTitle.displayName = 'MigrationPanelTitle';
