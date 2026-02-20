/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React, { memo, useCallback, useMemo, useState } from 'react';

import {
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPopover,
  EuiToolTip,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { getEmptyTagValue } from '../../../common/components/empty_value';
import { ASSIGNEES_PANEL_WIDTH } from '../../../common/components/assignees/constants';
import type { AssigneesApplyPanelProps } from '../../../common/components/assignees/assignees_apply_panel';
import { AssigneesApplyPanel } from '../../../common/components/assignees/assignees_apply_panel';
import { UsersAvatarsPanel } from '../../../common/components/user_profiles/users_avatars_panel';
import { useAttackDetailsAssignees } from '../hooks/use_attack_details_assignees';
import { HEADER_ASSIGNEES_ADD_BUTTON_TEST_ID } from '../constants/test_ids';

const UpdateAssigneesButton: FC<{
  isDisabled: boolean;
  toolTipMessage: string;
  togglePopover: () => void;
}> = memo(({ togglePopover, isDisabled, toolTipMessage }) => (
  <EuiToolTip position="bottom" content={toolTipMessage}>
    <EuiButtonIcon
      aria-label="Update assignees"
      data-test-subj={HEADER_ASSIGNEES_ADD_BUTTON_TEST_ID}
      iconType="plusInCircle"
      onClick={togglePopover}
      isDisabled={isDisabled}
    />
  </EuiToolTip>
));
UpdateAssigneesButton.displayName = 'UpdateAssigneesButton';

/**
 * Assignees block for the Attack details flyout header.
 * Matches the look of document_details assignees (avatars + popover with AssigneesApplyPanel).
 */
export const Assignees = memo(() => {
  const {
    assignedUserIds,
    assignedUsers,
    onApplyAssignees,
    hasPermission,
    isPlatinumPlus,
    upsellingMessage,
    isLoading,
  } = useAttackDetailsAssignees();

  const [isPopoverOpen, setIsPopoverOpen] = useState(false);

  const togglePopover = useCallback(() => {
    setIsPopoverOpen((value) => !value);
  }, []);

  const handleApplyAssignees = useCallback<AssigneesApplyPanelProps['onApply']>(
    async (assignees) => {
      setIsPopoverOpen(false);
      await onApplyAssignees(assignees);
    },
    [onApplyAssignees]
  );

  const searchInputId = useGeneratedHtmlId({
    prefix: 'attackDetailsAssigneesSearchInput',
  });

  const showAssignees = hasPermission && isPlatinumPlus;

  const toolTipMessage =
    upsellingMessage ??
    i18n.translate('xpack.securitySolution.attackDetailsFlyout.header.assignees.popoverTooltip', {
      defaultMessage: 'Assign attack',
    });

  const updateAssigneesPopover = useMemo(
    () => (
      <EuiPopover
        panelPaddingSize="none"
        initialFocus={`[id="${searchInputId}"]`}
        button={
          <UpdateAssigneesButton
            togglePopover={togglePopover}
            isDisabled={!hasPermission || !isPlatinumPlus || isLoading}
            toolTipMessage={toolTipMessage}
          />
        }
        isOpen={isPopoverOpen}
        panelStyle={{
          minWidth: ASSIGNEES_PANEL_WIDTH,
        }}
        closePopover={togglePopover}
      >
        <AssigneesApplyPanel
          searchInputId={searchInputId}
          assignedUserIds={assignedUserIds}
          onApply={handleApplyAssignees}
        />
      </EuiPopover>
    ),
    [
      assignedUserIds,
      handleApplyAssignees,
      hasPermission,
      isPlatinumPlus,
      isLoading,
      isPopoverOpen,
      searchInputId,
      togglePopover,
      toolTipMessage,
    ]
  );

  if (!showAssignees) {
    return <div data-test-subj="attackDetailsFlyoutHeaderAssigneesEmpty">{getEmptyTagValue()}</div>;
  }

  return (
    <EuiFlexGroup
      gutterSize="none"
      responsive={false}
      data-test-subj="attackDetailsFlyoutHeaderAssignees"
    >
      {assignedUsers && assignedUsers.length > 0 && (
        <EuiFlexItem grow={false}>
          <UsersAvatarsPanel userProfiles={assignedUsers} maxVisibleAvatars={2} />
        </EuiFlexItem>
      )}
      <EuiFlexItem grow={false}>{updateAssigneesPopover}</EuiFlexItem>
    </EuiFlexGroup>
  );
});

Assignees.displayName = 'Assignees';
