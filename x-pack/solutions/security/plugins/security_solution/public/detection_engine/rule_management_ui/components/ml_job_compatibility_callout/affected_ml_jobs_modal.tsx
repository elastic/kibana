/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiButtonEmpty,
  EuiCode,
  EuiModal,
  EuiModalBody,
  EuiModalFooter,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiText,
} from '@elastic/eui';
import * as i18n from './translations';

interface AffectedMlJobsModalProps {
  jobIds: string[];
  onClose: () => void;
}

/**
 * Informational modal listing every affected (legacy) installed ML job ID. Used by the ML
 * compatibility callout when there are too many affected jobs to show inline.
 */
export const AffectedMlJobsModal = ({ jobIds, onClose }: AffectedMlJobsModalProps) => (
  <EuiModal
    onClose={onClose}
    data-test-subj="mlJobCompatibilityAffectedJobsModal"
    aria-label={i18n.AFFECTED_JOBS_MODAL_TITLE}
  >
    <EuiModalHeader>
      <EuiModalHeaderTitle>{i18n.AFFECTED_JOBS_MODAL_TITLE}</EuiModalHeaderTitle>
    </EuiModalHeader>

    <EuiModalBody>
      <EuiText size="s">
        <ul data-test-subj="mlJobCompatibilityAffectedJobsModalList">
          {jobIds.map((jobId) => (
            <li key={jobId}>
              <EuiCode>{jobId}</EuiCode>
            </li>
          ))}
        </ul>
      </EuiText>
    </EuiModalBody>

    <EuiModalFooter>
      <EuiButtonEmpty onClick={onClose} data-test-subj="mlJobCompatibilityAffectedJobsModalClose">
        {i18n.CLOSE_MODAL}
      </EuiButtonEmpty>
    </EuiModalFooter>
  </EuiModal>
);
