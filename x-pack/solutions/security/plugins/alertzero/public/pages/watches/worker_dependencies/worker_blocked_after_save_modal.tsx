/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiButton,
  EuiModal,
  EuiModalBody,
  EuiModalFooter,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiText,
  useGeneratedHtmlId,
} from '@elastic/eui';
import {
  WorkerWarningContent,
  type WorkerWarningReason,
} from '../components/worker_warning_content';
import * as i18n from './translations';

interface WorkerBlockedAfterSaveModalProps {
  workerName: string;
  reasons: WorkerWarningReason[];
  onAcknowledge: () => void;
}

/** Acknowledge-only: the save has already gone through; this only says why nothing will happen. */
export const WorkerBlockedAfterSaveModal: React.FC<WorkerBlockedAfterSaveModalProps> = ({
  workerName,
  reasons,
  onAcknowledge,
}) => {
  const titleId = useGeneratedHtmlId({ prefix: 'alertZeroWorkerBlockedAfterSave' });
  return (
    <EuiModal
      onClose={onAcknowledge}
      maxWidth={480}
      aria-labelledby={titleId}
      data-test-subj="alertZeroWorkerBlockedAfterSaveModal"
    >
      <EuiModalHeader>
        <EuiModalHeaderTitle id={titleId}>
          {i18n.blockedAfterSaveTitle(workerName)}
        </EuiModalHeaderTitle>
      </EuiModalHeader>
      <EuiModalBody>
        <EuiText size="s">
          <WorkerWarningContent reasons={reasons} />
        </EuiText>
      </EuiModalBody>
      <EuiModalFooter>
        <EuiButton
          fill
          onClick={onAcknowledge}
          data-test-subj="alertZeroWorkerBlockedAfterSaveAcknowledge"
        >
          {i18n.BLOCKED_AFTER_SAVE_ACKNOWLEDGE}
        </EuiButton>
      </EuiModalFooter>
    </EuiModal>
  );
};
