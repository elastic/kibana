/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiTitle,
  useGeneratedHtmlId,
} from '@elastic/eui';
import React from 'react';

import { InferenceForm } from './inference_form';
import * as i18n from './translations';

interface AddInferenceFlyoutWrapperProps {
  onClose: (state: boolean) => void;
}

export const AddInferenceFlyoutWrapper: React.FC<AddInferenceFlyoutWrapperProps> = ({
  onClose,
}) => {
  const inferenceCreationFlyoutId = useGeneratedHtmlId({
    prefix: 'addInferenceFlyoutId',
  });
  const closeFlyout = () => onClose(false);

  return (
    <EuiFlyout
      ownFocus
      onClose={closeFlyout}
      aria-labelledby={inferenceCreationFlyoutId}
      data-test-subj="create-inference-flyout"
    >
      <EuiFlyoutHeader hasBorder data-test-subj="create-inference-flyout-header">
        <EuiTitle size="m">
          <h2 id={inferenceCreationFlyoutId}>{i18n.CREATE_ENDPOINT_TITLE}</h2>
        </EuiTitle>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        <InferenceForm onSubmitSuccess={onClose} />
      </EuiFlyoutBody>
      <EuiFlyoutFooter>
        <EuiFlexGroup justifyContent="spaceBetween">
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty
              data-test-subj="create-inference-flyout-close-button"
              onClick={closeFlyout}
              flush="left"
            >
              {i18n.CANCEL}
            </EuiButtonEmpty>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </EuiFlyout>
  );
};
