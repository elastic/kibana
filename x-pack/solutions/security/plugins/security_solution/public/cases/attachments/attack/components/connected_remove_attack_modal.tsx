/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import { useRemovableAlertAttachments } from '../hooks/use_removable_alert_attachments';
import type { CaseAttachment } from '../utils';
import { RemoveAttackModal } from './remove_attack_modal';

/** What the confirmed removal should delete, beyond the attack attachments themselves. */
export interface RemoveAttackConfirmation {
  /**
   * Saved object ids of the alert attachments to remove alongside the attacks. Empty unless the
   * user opted in, so the caller can always pass these straight to a bulk delete.
   */
  alertAttachmentIds: string[];
}

export interface ConnectedRemoveAttackModalProps {
  /**
   * Attack document ids of the attachments being removed: one for a row action, several for a
   * bulk selection.
   */
  attackIds: readonly string[];
  /** Names what is being removed in the prompt — an attack title, or a count of them. */
  attackTitle: string;
  /** The case's attachments, used to resolve which alerts the attacks may take with them. */
  comments: readonly CaseAttachment[];
  /** Closes the prompt without removing anything. */
  onCancel: () => void;
  /** Called once the user confirms. Nothing is removed until this runs. */
  onConfirm: (confirmation: RemoveAttackConfirmation) => void;
}

/**
 * Resolves the removable alerts of the attacks being removed and feeds the confirmation prompt.
 *
 * Mount this only while the prompt is open: the resolution costs a request.
 */
export const ConnectedRemoveAttackModal = ({
  attackIds,
  attackTitle,
  comments,
  onCancel,
  onConfirm,
}: ConnectedRemoveAttackModalProps) => {
  const { attachmentIds, alertIds, isResolvable, isLoading } = useRemovableAlertAttachments({
    comments,
    attackIds,
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
