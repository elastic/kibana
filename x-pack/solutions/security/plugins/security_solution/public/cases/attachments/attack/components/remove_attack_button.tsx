/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useState } from 'react';
import { EuiButtonIcon, EuiToolTip } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { REMOVE_ATTACK_BUTTON_TEST_ID } from '../../../../../common/cases/attachments/attack/test_ids';
import { APP_ID } from '../../../../../common/constants';
import { useKibana } from '../../../../common/lib/kibana';
import { useRemovableAlertAttachments } from '../hooks/use_removable_alert_attachments';
import type { CaseAttachment } from '../utils';
import { RemoveAttackModal } from './remove_attack_modal';

const REMOVE_ATTACK_TOOLTIP = i18n.translate(
  'xpack.securitySolution.attackDiscovery.cases.remove.buttonLabel',
  { defaultMessage: 'Remove attack from case' }
);

/** What the confirmed removal should delete, beyond the attack attachment itself. */
export interface RemoveAttackConfirmation {
  /**
   * Saved object ids of the alert attachments to remove alongside the attack. Empty unless the
   * user opted in, so the caller can always pass these straight to a bulk delete.
   */
  alertAttachmentIds: string[];
}

export interface RemoveAttackButtonProps {
  /** Id used to build the button's `data-test-subj` and DOM id — the attachment saved object id. */
  id: string;
  /** The attack document `_id`, saved as the attachment id. */
  attackId: string;
  /** The attack title, shown in the confirmation prompt. */
  attackTitle: string;
  /** The case's attachments, used to resolve which alerts the attack may take with it. */
  comments: readonly CaseAttachment[];
  /** Called once the user confirms. Nothing is removed until this runs. */
  onConfirm: (confirmation: RemoveAttackConfirmation) => void;
  /** Disables the button, e.g. while a removal is already in flight. */
  isDisabled?: boolean;
}

/**
 * Removes a `security.attack` attachment from a case, after confirming and offering to take the
 * attack's related alerts with it.
 *
 * The removal itself is the caller's — this component only collects the decision.
 */
export const RemoveAttackButton = ({
  id,
  attackId,
  attackTitle,
  comments,
  onConfirm,
  isDisabled = false,
}: RemoveAttackButtonProps) => {
  const { cases } = useKibana().services;
  const [isModalOpen, setIsModalOpen] = useState(false);

  const openModal = useCallback(() => setIsModalOpen(true), []);
  const closeModal = useCallback(() => setIsModalOpen(false), []);

  const canDelete = cases.helpers.canUseCases([APP_ID]).delete;

  if (!canDelete) {
    return null;
  }

  return (
    <>
      <EuiToolTip content={REMOVE_ATTACK_TOOLTIP} disableScreenReaderOutput position="top">
        <EuiButtonIcon
          aria-label={REMOVE_ATTACK_TOOLTIP}
          color="danger"
          data-test-subj={`${REMOVE_ATTACK_BUTTON_TEST_ID}-${id}`}
          iconType="trash"
          id={`${id}-remove-attack`}
          isDisabled={isDisabled}
          onClick={openModal}
        />
      </EuiToolTip>
      {/* Mounted only while open so resolving the removable alerts costs a request per removal,
          not per rendered row. */}
      {isModalOpen ? (
        <ConnectedRemoveAttackModal
          attackId={attackId}
          attackTitle={attackTitle}
          comments={comments}
          onCancel={closeModal}
          onConfirm={onConfirm}
        />
      ) : null}
    </>
  );
};

RemoveAttackButton.displayName = 'RemoveAttackButton';

/** Resolves the attack's removable alerts and feeds the confirmation prompt. */
const ConnectedRemoveAttackModal = ({
  attackId,
  attackTitle,
  comments,
  onCancel,
  onConfirm,
}: {
  attackId: string;
  attackTitle: string;
  comments: readonly CaseAttachment[];
  onCancel: () => void;
  onConfirm: (confirmation: RemoveAttackConfirmation) => void;
}) => {
  const { attachmentIds, alertIds, isResolvable, isLoading } = useRemovableAlertAttachments({
    comments,
    attackId,
  });

  const onModalConfirm = useCallback(
    ({ removeRelatedAlerts }: { removeRelatedAlerts: boolean }) => {
      onCancel();
      onConfirm({ alertAttachmentIds: removeRelatedAlerts ? attachmentIds : [] });
    },
    [attachmentIds, onCancel, onConfirm]
  );

  return (
    <RemoveAttackModal
      // The count names alert documents, not attachments: an alert attachment can carry several.
      alertCount={alertIds.length}
      attackTitle={attackTitle}
      isLoading={isLoading}
      isResolvable={isResolvable}
      onCancel={onCancel}
      onConfirm={onModalConfirm}
    />
  );
};

ConnectedRemoveAttackModal.displayName = 'ConnectedRemoveAttackModal';
