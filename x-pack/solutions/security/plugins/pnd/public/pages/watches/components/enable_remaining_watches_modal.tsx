/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiModal,
  EuiModalBody,
  EuiModalFooter,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiText,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { SYSTEM_SECURITY_WATCH_CATALOG } from '@kbn/pnd-common';
import * as i18n from '../settings_translations';

const catalogName = (watchId: string): string =>
  SYSTEM_SECURITY_WATCH_CATALOG.find(({ id }) => id === watchId)?.name ?? watchId;

export const EnableRemainingWatchesModal: React.FC<{
  isEnabling: boolean;
  onCancel: () => void;
  onConfirm: () => void;
  remainingWatchIds: readonly string[];
}> = ({ isEnabling, onCancel, onConfirm, remainingWatchIds }) => {
  const titleId = useGeneratedHtmlId();

  return (
    <EuiModal
      aria-labelledby={titleId}
      data-test-subj="pndEnableRemainingWatchesModal"
      onClose={onCancel}
    >
      <EuiModalHeader>
        <EuiModalHeaderTitle id={titleId}>{i18n.ENABLE_REMAINING_TITLE}</EuiModalHeaderTitle>
      </EuiModalHeader>
      <EuiModalBody>
        <EuiText size="s">
          <p>{i18n.ENABLE_REMAINING_BODY}</p>
          <ul>
            {remainingWatchIds.map((watchId) => (
              <li key={watchId}>{catalogName(watchId)}</li>
            ))}
          </ul>
        </EuiText>
      </EuiModalBody>
      <EuiModalFooter>
        <EuiButtonEmpty data-test-subj="pndEnableRemainingWatchesCancel" onClick={onCancel}>
          {i18n.ENABLE_REMAINING_CANCEL}
        </EuiButtonEmpty>
        <EuiButton
          data-test-subj="pndEnableRemainingWatchesConfirm"
          fill
          isDisabled={isEnabling}
          isLoading={isEnabling}
          onClick={onConfirm}
        >
          {i18n.ENABLE_REMAINING_CONFIRM}
        </EuiButton>
      </EuiModalFooter>
    </EuiModal>
  );
};
