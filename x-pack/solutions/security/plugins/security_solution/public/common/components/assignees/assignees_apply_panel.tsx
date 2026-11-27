/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React, { memo, useCallback, useMemo, useState } from 'react';

import { EuiButton } from '@elastic/eui';
import type { AlertAssignees } from '../../../../common/api/detection_engine';
import * as i18n from './translations';
import type { AssigneesIdsSelection } from './types';
import { removeNoAssigneesSelection } from './utils';
import { ASSIGNEES_APPLY_BUTTON_TEST_ID, ASSIGNEES_APPLY_PANEL_TEST_ID } from './test_ids';
import { AssigneesSelectable } from './assignees_selectable';

export interface AssigneesApplyPanelProps {
  /**
   * Identifier of search field.
   */
  searchInputId?: string;

  /**
   * The array of ids of the users assigned to the alert
   */
  assignedUserIds: string[];

  /** Ids of users assigned to only some of the selected alerts. */
  mixedUserIds?: string[];

  /**
   * A callback function that will be called on apply button click
   */
  onApply: (updatedAssignees: AlertAssignees) => void;
}

/**
 * The popover to allow selection of users from a list
 */
export const AssigneesApplyPanel: FC<AssigneesApplyPanelProps> = memo(
  ({ searchInputId, assignedUserIds, mixedUserIds, onApply }) => {
    /**
     * We use `selectedUserIds` to keep track of currently selected user ids,
     * whereas `assignedUserIds` holds actually assigned user ids.
     */
    const [selectedUserIds, setSelectedUserIds] =
      useState<AssigneesIdsSelection[]>(assignedUserIds);
    const [selectedMixedUserIds, setSelectedMixedUserIds] = useState<string[]>(mixedUserIds ?? []);

    const assigneesToUpdate = useMemo<AlertAssignees>(() => {
      const updatedIds = removeNoAssigneesSelection(selectedUserIds);
      const assigneesToAddArray = updatedIds.filter((uid) => !assignedUserIds.includes(uid));
      const assigneesToRemoveArray = [...assignedUserIds, ...(mixedUserIds ?? [])].filter(
        (uid) => !updatedIds.includes(uid) && !selectedMixedUserIds.includes(uid)
      );
      return {
        add: assigneesToAddArray,
        remove: assigneesToRemoveArray,
      };
    }, [assignedUserIds, mixedUserIds, selectedMixedUserIds, selectedUserIds]);

    const isDirty = useMemo(
      () => assigneesToUpdate.add.length || assigneesToUpdate.remove.length,
      [assigneesToUpdate]
    );

    const handleSelectionChange = useCallback(
      (userIds: AssigneesIdsSelection[], remainingMixedUserIds?: string[]) => {
        setSelectedUserIds(userIds);
        if (remainingMixedUserIds) {
          setSelectedMixedUserIds(remainingMixedUserIds);
        }
      },
      []
    );

    const handleApplyButtonClick = useCallback(async () => {
      onApply(assigneesToUpdate);
    }, [assigneesToUpdate, onApply]);

    return (
      <div data-test-subj={ASSIGNEES_APPLY_PANEL_TEST_ID}>
        <AssigneesSelectable
          searchInputId={searchInputId}
          assignedUserIds={assignedUserIds}
          mixedUserIds={mixedUserIds}
          onSelectionChange={handleSelectionChange}
        />
        <EuiButton
          data-test-subj={ASSIGNEES_APPLY_BUTTON_TEST_ID}
          fullWidth
          size="s"
          onClick={handleApplyButtonClick}
          isDisabled={!isDirty}
        >
          {i18n.ASSIGNEES_APPLY_BUTTON}
        </EuiButton>
      </div>
    );
  }
);

AssigneesApplyPanel.displayName = 'AssigneesPanel';
