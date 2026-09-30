/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiConfirmModal } from '@elastic/eui';
import type { WorkerDisableConfirmation } from './worker_dependencies';
import * as i18n from './translations';

interface WorkerDisableConfirmModalProps {
  confirmation: WorkerDisableConfirmation;
  onConfirm: () => void;
  onCancel: () => void;
}

/** Asked before a Worker that an enabled Worker depends on is turned off in the draft. */
export const WorkerDisableConfirmModal: React.FC<WorkerDisableConfirmModalProps> = ({
  confirmation,
  onConfirm,
  onCancel,
}) => (
  <EuiConfirmModal
    title={confirmation.title}
    aria-label={confirmation.title}
    onCancel={onCancel}
    onConfirm={onConfirm}
    cancelButtonText={i18n.DISABLE_DIALOG_CANCEL}
    confirmButtonText={i18n.DISABLE_DIALOG_CONFIRM}
    buttonColor="warning"
    defaultFocusedButton="cancel"
    data-test-subj="alertZeroWorkerDisableConfirmModal"
  >
    {confirmation.paragraphs.map((paragraph) => (
      <p key={paragraph.id}>{paragraph.message}</p>
    ))}
  </EuiConfirmModal>
);
