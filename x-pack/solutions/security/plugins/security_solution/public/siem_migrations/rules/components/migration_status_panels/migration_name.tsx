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
import { useIsVisible } from '../../../../common/hooks/use_visibility';
import { PanelText } from '../../../../common/components/panel_text';
import type { MigrationReadyPanelProps } from './migration_ready_panel';
import { useUpdateMigrationName } from '../../logic/use_update_migration_name';
import * as i18n from './translations';

export const MigrationName = React.memo<MigrationReadyPanelProps>(({ migrationStats }) => {
  const [name, setName] = useState<string>(migrationStats.name);
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const {
    isVisible: isPopoverOpen,
    close: closePopover,
    toggle: togglePopover,
  } = useIsVisible(false);

  const onRenameError = useCallback(() => {
    setName(migrationStats.name); // revert to original name on error. Error toast will be shown by the mutation hook
  }, [migrationStats.name]);

  const { mutate: updateMigrationName, isLoading: isUpdatingMigrationName } =
    useUpdateMigrationName({ onError: onRenameError });

  const cancelEdit = useCallback(() => {
    setIsEditing(false);
  }, []);

  const saveName = useCallback(
    (value: string) => {
      setName(value);
      updateMigrationName({ migrationId: migrationStats.id, name: value });
      setIsEditing(false);
    },
    [updateMigrationName, migrationStats.id]
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
MigrationName.displayName = 'MigrationName';
