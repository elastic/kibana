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
  EuiContextMenu,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPopover,
  EuiPopoverTitle,
  EuiToolTip,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { getEmptyTagValue } from '../../../common/components/empty_value';
import { UsersAvatarsPanel } from '../../../common/components/user_profiles/users_avatars_panel';
import { useBulkGetUserProfiles } from '../../../common/components/user_profiles/use_bulk_get_user_profiles';
import { useLicense } from '../../../common/hooks/use_license';
import { useUpsellingMessage } from '../../../common/hooks/use_upselling';
import { useAttackAssigneesContextMenuItems } from '../../../detections/hooks/attacks/bulk_actions/context_menu_items/use_attack_assignees_context_menu_items';
import { useAttacksPrivileges } from '../../../detections/hooks/attacks/bulk_actions/use_attacks_privileges';
import { useInvalidateFindAttackDiscoveries } from '../../../attack_discovery/pages/use_find_attack_discoveries';
import { useAttackDetailsContext } from '../context';
import { useHeaderData } from '../hooks/use_header_data';
import { HEADER_ASSIGNEES_ADD_BUTTON_TEST_ID } from '../constants/test_ids';

const AssigneesButton: FC<{
  isDisabled: boolean;
  toolTipMessage: string;
  onClick: () => void;
}> = memo(({ onClick, isDisabled, toolTipMessage }) => (
  <EuiToolTip position="bottom" content={toolTipMessage}>
    <EuiButtonIcon
      aria-label={i18n.translate(
        'xpack.securitySolution.attackDetailsFlyout.header.assignees.ariaLabel',
        { defaultMessage: 'Update assignees' }
      )}
      data-test-subj={HEADER_ASSIGNEES_ADD_BUTTON_TEST_ID}
      iconType="plusInCircle"
      onClick={onClick}
      isDisabled={isDisabled}
    />
  </EuiToolTip>
));
AssigneesButton.displayName = 'AssigneesButton';

/**
 * Assignees block for the Attack details flyout header.
 * Follows the same pattern as status_popover_button: useAttackDetailsContext + useHeaderData
 * + useAttackAssigneesContextMenuItems, with EuiPopover + EuiContextMenu.
 */
export const Assignees = memo(() => {
  const { attackId, refetch } = useAttackDetailsContext();
  const { alertIds, assignees } = useHeaderData();
  const invalidateFindAttackDiscoveries = useInvalidateFindAttackDiscoveries();
  const { hasIndexWrite, hasAttackIndexWrite, loading: privilegesLoading } = useAttacksPrivileges();
  const isPlatinumPlus = useLicense().isPlatinumPlus();
  const upsellingMessage = useUpsellingMessage('alert_assignments');

  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const togglePopover = useCallback(() => setIsPopoverOpen((prev) => !prev), []);
  const closePopover = useCallback(() => setIsPopoverOpen(false), []);

  const attacksWithAssignees = useMemo(
    () => [{ attackId, relatedAlertIds: alertIds, assignees }],
    [attackId, alertIds, assignees]
  );

  const onSuccess = useCallback(() => {
    refetch();
    invalidateFindAttackDiscoveries();
  }, [refetch, invalidateFindAttackDiscoveries]);

  const { items, panels } = useAttackAssigneesContextMenuItems({
    attacksWithAssignees,
    closePopover,
    onSuccess,
  });

  const uids = useMemo(() => new Set(assignees), [assignees]);
  const { data: assignedUsers } = useBulkGetUserProfiles({ uids });

  const hasPermission =
    Boolean(hasIndexWrite) && Boolean(hasAttackIndexWrite) && isPlatinumPlus && !privilegesLoading;

  const toolTipMessage =
    upsellingMessage ??
    i18n.translate('xpack.securitySolution.attackDetailsFlyout.header.assignees.popoverTooltip', {
      defaultMessage: 'Assign attack',
    });

  const button = useMemo(
    () => (
      <AssigneesButton onClick={togglePopover} isDisabled={false} toolTipMessage={toolTipMessage} />
    ),
    [togglePopover, toolTipMessage]
  );

  if (!hasPermission) {
    return (
      <div data-test-subj="attack-details-flyout-header-assignees-empty">{getEmptyTagValue()}</div>
    );
  }

  return (
    <EuiFlexGroup
      gutterSize="none"
      responsive={false}
      data-test-subj="attack-details-flyout-header-assignees"
    >
      {assignedUsers && assignedUsers.length > 0 && (
        <EuiFlexItem grow={false}>
          <UsersAvatarsPanel userProfiles={assignedUsers} maxVisibleAvatars={2} />
        </EuiFlexItem>
      )}
      <EuiFlexItem grow={false}>
        <EuiPopover
          button={button}
          isOpen={isPopoverOpen}
          closePopover={closePopover}
          panelPaddingSize="none"
          data-test-subj="attack-details-flyout-header-assignees-popover"
        >
          <EuiPopoverTitle paddingSize="m">
            {i18n.translate(
              'xpack.securitySolution.attackDetailsFlyout.header.assignees.popoverTitle',
              {
                defaultMessage: 'Manage assignees',
              }
            )}
          </EuiPopoverTitle>
          <EuiContextMenu
            panels={[
              {
                id: 0,
                items,
              },
              ...panels,
            ]}
            initialPanelId={0}
            data-test-subj="attack-details-flyout-header-assignees-context-menu"
          />
        </EuiPopover>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
});

Assignees.displayName = 'Assignees';
