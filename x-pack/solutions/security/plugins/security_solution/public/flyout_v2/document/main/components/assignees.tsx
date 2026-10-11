/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { noop } from 'lodash';
import type { FC } from 'react';
import React, { memo, useCallback, useEffect, useMemo, useState } from 'react';
import {
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPopover,
  EuiToolTip,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { type DataTableRecord, getFieldValue } from '@kbn/discover-utils';
import { isNonLocalIndexName } from '@kbn/es-query';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import { ALERT_WORKFLOW_ASSIGNEE_IDS } from '@kbn/rule-data-utils';
import { ASSIGNEES_PANEL_WIDTH } from '../../../../common/components/assignees/constants';
import type { AssigneesApplyPanelProps } from '../../../../common/components/assignees/assignees_apply_panel';
import { AssigneesApplyPanel } from '../../../../common/components/assignees/assignees_apply_panel';
import { getEmptyTagValue } from '../../../../common/components/empty_value';
import { useLicense } from '../../../../common/hooks/use_license';
import { useUpsellingMessage } from '../../../../common/hooks/use_upselling';
import { useBulkGetUserProfiles } from '../../../../common/components/user_profiles/use_bulk_get_user_profiles';
import { UsersAvatarsPanel } from '../../../../common/components/user_profiles/users_avatars_panel';
import { useSetAlertAssignees } from '../../../../common/components/toolbar/bulk_actions/use_set_alert_assignees';
import { useAlertsPrivileges } from '../../../../detections/containers/detection_engine/alerts/use_alerts_privileges';
import { useFlyoutTelemetry } from '../../../shared/hooks/use_flyout_telemetry';
import { FLYOUT_ACTION, FLYOUT_HEADER_ITEM, FLYOUT_TYPE } from '../../../../common/lib/telemetry';
import { FlyoutHeaderBlock } from '../../../shared/components/flyout_header_block';
import {
  ASSIGNEES_ADD_BUTTON_TEST_ID,
  ASSIGNEES_EMPTY_TEST_ID,
  ASSIGNEES_TEST_ID,
  ASSIGNEES_TITLE_TEST_ID,
} from './test_ids';

/**
 * Assignee changes that have been applied successfully but are not yet visible in the document the
 * flyout refetches, scoped to the document they were applied to.
 */
interface PendingAssigneeChanges {
  documentKey: string;
  add: string[];
  remove: string[];
}

type AssigneeChanges = Pick<PendingAssigneeChanges, 'add' | 'remove'>;

const NO_PENDING_CHANGES: PendingAssigneeChanges = { documentKey: '', add: [], remove: [] };

/**
 * Folds a newly applied change into the changes still waiting to show up in the document, so that
 * several Applies inside one index-refresh window are all preserved. A change that reverses a
 * waiting one cancels it out rather than stacking on top of it.
 */
const mergePendingChanges = (
  pending: PendingAssigneeChanges,
  documentKey: string,
  { add, remove }: AssigneeChanges
): PendingAssigneeChanges => ({
  documentKey,
  add: [...pending.add.filter((uid) => !remove.includes(uid) && !add.includes(uid)), ...add],
  remove: [
    ...pending.remove.filter((uid) => !add.includes(uid) && !remove.includes(uid)),
    ...remove,
  ],
});

/** Overlays the changes still waiting to show up in the document on the assignees it reports. */
const applyPendingChanges = (assigneeIds: string[], { add, remove }: AssigneeChanges): string[] => {
  const remaining = assigneeIds.filter((uid) => !remove.includes(uid));

  return [...remaining, ...add.filter((uid) => !remaining.includes(uid))];
};

const UpdateAssigneesButton: FC<{
  isDisabled: boolean;
  toolTipMessage: string;
  togglePopover: () => void;
}> = memo(({ togglePopover, isDisabled, toolTipMessage }) => (
  <EuiToolTip position="bottom" content={toolTipMessage}>
    <EuiButtonIcon
      aria-label="Update assignees"
      data-test-subj={ASSIGNEES_ADD_BUTTON_TEST_ID}
      iconType={'plusCircle'}
      onClick={togglePopover}
      isDisabled={isDisabled}
    />
  </EuiToolTip>
));
UpdateAssigneesButton.displayName = 'UpdateAssigneesButton';

export interface AssigneesProps {
  /**
   * Document to display assignees for.
   */
  hit: DataTableRecord;
  /**
   * Callback fired after the assignees update succeeds.
   * Used by the legacy flyout to refetch its context-backed data.
   */
  onAlertUpdated: () => void;
  /**
   * Boolean to indicate whether to show assignees.
   */
  showAssignees?: boolean;
}

/**
 * Renders the assignees section in the document flyout header.
 */
export const Assignees = memo(({ hit, onAlertUpdated, showAssignees = true }: AssigneesProps) => {
  const eventId = useMemo(() => hit.raw._id ?? '', [hit]);
  const indexName = useMemo(
    () => hit.raw._index ?? (getFieldValue(hit, '_index') as string) ?? '',
    [hit]
  );
  const isRemoteDocument = useMemo(() => isNonLocalIndexName(indexName), [indexName]);
  // `_id` alone is not unique across clusters, so the index takes part in the document's identity.
  const documentKey = `${eventId}|${indexName}`;
  const documentAssignedUserIds = useMemo(() => {
    const value = hit.flattened[ALERT_WORKFLOW_ASSIGNEE_IDS] as string[] | string | null;

    if (Array.isArray(value)) {
      return value;
    }

    return value ? [value] : [];
  }, [hit]);

  const isPlatinumPlus = useLicense().isPlatinumPlus();
  const upsellingMessage = useUpsellingMessage('alert_assignments');
  const { hasAlertsUpdate } = useAlertsPrivileges();
  const setAlertAssignees = useSetAlertAssignees();
  const { reportActionClicked, reportHeaderItemClicked } = useFlyoutTelemetry();

  // A successful Apply refetches the document, but the alerts index is only searchable again after
  // its next refresh, so a refetch can still report the pre-Apply assignees (see #285324: on
  // serverless that lag made the just-added avatar disappear from the header). Mirroring the
  // document into state and re-syncing it lets such a refetch roll the Apply back, so instead the
  // changes we applied are overlaid on whatever the document reports, and dropped once it reflects
  // them. Assignee changes made elsewhere therefore show up on the next refetch, and a refetch
  // that has not caught up cannot undo ours. The overlay is scoped to `documentKey` so it can
  // never leak onto another document rendered by this same component instance.
  const [pendingChanges, setPendingChanges] = useState(NO_PENDING_CHANGES);
  const activePendingChanges =
    pendingChanges.documentKey === documentKey ? pendingChanges : NO_PENDING_CHANGES;

  const assignedUserIds = useMemo(
    () => applyPendingChanges(documentAssignedUserIds, activePendingChanges),
    [documentAssignedUserIds, activePendingChanges]
  );

  useEffect(() => {
    const { add, remove } = activePendingChanges;
    if (add.length === 0 && remove.length === 0) {
      return;
    }

    // Keep trusting the document once it reports every change we made, otherwise a later external
    // change to one of those same users would be overlaid away by a stale Apply forever.
    const isReflectedByDocument =
      add.every((uid) => documentAssignedUserIds.includes(uid)) &&
      remove.every((uid) => !documentAssignedUserIds.includes(uid));

    if (isReflectedByDocument) {
      setPendingChanges(NO_PENDING_CHANGES);
    }
  }, [activePendingChanges, documentAssignedUserIds]);

  const uids = useMemo(() => new Set(assignedUserIds), [assignedUserIds]);
  const { data: assignedUsers } = useBulkGetUserProfiles({ uids });

  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const searchInputId = useGeneratedHtmlId({ prefix: 'searchInput' });

  const togglePopover = useCallback(() => {
    setIsPopoverOpen((value) => !value);
  }, []);

  const handleButtonClick = useCallback(() => {
    reportHeaderItemClicked({
      flyoutType: FLYOUT_TYPE.DOCUMENT,
      item: FLYOUT_HEADER_ITEM.ASSIGNEES,
    });
    togglePopover();
  }, [reportHeaderItemClicked, togglePopover]);

  const handleApplyAssignees = useCallback<AssigneesApplyPanelProps['onApply']>(
    async (assignees) => {
      setIsPopoverOpen(false);

      if (!setAlertAssignees || !eventId) {
        return;
      }

      reportActionClicked({
        flyoutType: FLYOUT_TYPE.DOCUMENT,
        action: FLYOUT_ACTION.ADD_ASSIGNEES,
      });

      const onSuccess = () => {
        setPendingChanges((current) =>
          mergePendingChanges(
            current.documentKey === documentKey ? current : NO_PENDING_CHANGES,
            documentKey,
            assignees
          )
        );

        onAlertUpdated?.();
      };

      await setAlertAssignees(assignees, [eventId], onSuccess, noop);
    },
    [documentKey, eventId, onAlertUpdated, reportActionClicked, setAlertAssignees]
  );

  const isUpdateDisabled = useMemo(
    () => !eventId || !hasAlertsUpdate || !isPlatinumPlus || isRemoteDocument,
    [eventId, hasAlertsUpdate, isPlatinumPlus, isRemoteDocument]
  );

  const updateAssigneesPopover = useMemo(
    () => (
      <EuiPopover
        aria-label={i18n.translate(
          'xpack.securitySolution.flyout.document.header.assignees.updatePopoverAriaLabel',
          {
            defaultMessage: 'Update assignees',
          }
        )}
        panelPaddingSize="none"
        initialFocus={`[id="${searchInputId}"]`}
        button={
          <UpdateAssigneesButton
            togglePopover={handleButtonClick}
            isDisabled={isUpdateDisabled}
            toolTipMessage={
              upsellingMessage ??
              i18n.translate(
                'xpack.securitySolution.flyout.document.header.assignees.popoverTooltip',
                {
                  defaultMessage: 'Assign alert',
                }
              )
            }
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
      handleButtonClick,
      isPopoverOpen,
      isUpdateDisabled,
      searchInputId,
      togglePopover,
      upsellingMessage,
    ]
  );

  return (
    <FlyoutHeaderBlock
      hasBorder
      title={
        <FormattedMessage
          id="xpack.securitySolution.flyout.document.header.assignedTitle"
          defaultMessage="Assignees"
        />
      }
      data-test-subj={ASSIGNEES_TITLE_TEST_ID}
    >
      {!showAssignees ? (
        <div data-test-subj={ASSIGNEES_EMPTY_TEST_ID}>{getEmptyTagValue()}</div>
      ) : (
        <EuiFlexGroup gutterSize="none" responsive={false} data-test-subj={ASSIGNEES_TEST_ID}>
          {assignedUsers && (
            <EuiFlexItem grow={false}>
              <UsersAvatarsPanel userProfiles={assignedUsers} maxVisibleAvatars={2} />
            </EuiFlexItem>
          )}
          <EuiFlexItem grow={false}>{updateAssigneesPopover}</EuiFlexItem>
        </EuiFlexGroup>
      )}
    </FlyoutHeaderBlock>
  );
});

Assignees.displayName = 'Assignees';
