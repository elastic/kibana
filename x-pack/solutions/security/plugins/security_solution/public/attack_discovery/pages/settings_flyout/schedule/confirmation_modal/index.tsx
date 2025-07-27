/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButton,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiModal,
  EuiModalBody,
  EuiModalFooter,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiSpacer,
} from '@elastic/eui';
import { css } from '@emotion/react';
import React from 'react';

import * as i18n from './translations';

interface Props {
  onCancel: () => void;
  onDiscard: () => void;
}

const ConfirmationModalComponent: React.FC<Props> = ({ onCancel, onDiscard }) => (
  <EuiModal
    css={css`
      max-width: 454px;
    `}
    data-test-subj="confirmationModal"
    onClose={onCancel}
  >
    <EuiModalHeader>
      <EuiModalHeaderTitle data-test-subj="title">
        {i18n.DISCARD_UNSAVED_CHANGES}
      </EuiModalHeaderTitle>
    </EuiModalHeader>

    <EuiModalBody data-test-subj="body">
      {i18n.YOU_MADE_CHANGES}
      <EuiSpacer size="m" />
      {i18n.ARE_YOU_SURE}
    </EuiModalBody>

    <EuiModalFooter>
      <EuiFlexGroup gutterSize="s" justifyContent="flexEnd">
        <EuiFlexItem grow={false}>
          <EuiButtonEmpty data-test-subj="cancel" onClick={onCancel}>
            {i18n.CANCEL}
          </EuiButtonEmpty>
        </EuiFlexItem>

        <EuiFlexItem grow={false}>
          <EuiButton color="danger" data-test-subj="discardChanges" fill onClick={onDiscard}>
            {i18n.DISCARD_CHANGES}
          </EuiButton>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiModalFooter>
  </EuiModal>
);

ConfirmationModalComponent.displayName = 'ConfirmationModal';

export const ConfirmationModal = React.memo(ConfirmationModalComponent);
