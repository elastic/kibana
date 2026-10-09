/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiModal, EuiModalBody, EuiModalHeader, EuiModalHeaderTitle } from '@elastic/eui';
import React, { memo, useCallback, useId } from 'react';
import type { SelectTimelineModalProps } from '@kbn/cases-plugin/public';
import { SelectTimelineModalBody } from './select_timeline_modal_body';
import * as i18n from './translations';

export const SelectTimelineModal: React.FC<SelectTimelineModalProps> = memo(
  ({ onSelect, onClose }) => {
    const modalTitleId = useId();
    const handleTimelineChange = useCallback(
      (title: string, savedObjectId: string | null) => {
        if (!savedObjectId) return;
        onSelect({ savedObjectId, title });
      },
      [onSelect]
    );
    return (
      <EuiModal
        onClose={onClose}
        aria-labelledby={modalTitleId}
        data-test-subj="select-timeline-modal"
      >
        <EuiModalHeader>
          <EuiModalHeaderTitle id={modalTitleId}>
            {i18n.SELECT_TIMELINE_MODAL_TITLE}
          </EuiModalHeaderTitle>
        </EuiModalHeader>
        <EuiModalBody>
          <SelectTimelineModalBody onTimelineChange={handleTimelineChange} onClose={onClose} />
        </EuiModalBody>
      </EuiModal>
    );
  }
);

SelectTimelineModal.displayName = 'SelectTimelineModal';
