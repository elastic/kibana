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
  EuiSpacer,
  EuiText,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';

interface RuleDeletedModalProps {
  ruleId?: string;
  onClose: () => void;
}

export const RuleDeletedModal = ({ ruleId, onClose }: RuleDeletedModalProps) => {
  const modalTitleId = useGeneratedHtmlId();

  return (
    <EuiModal onClose={onClose} data-test-subj="ruleDeletedModal" aria-labelledby={modalTitleId}>
      <EuiModalHeader>
        <EuiModalHeaderTitle id={modalTitleId}>
          {i18n.translate('xpack.observability.alertDetails.ruleDeletedModalTitle', {
            defaultMessage: 'Rule no longer available',
          })}
        </EuiModalHeaderTitle>
      </EuiModalHeader>
      <EuiModalBody>
        <EuiText>
          <p>
            {i18n.translate('xpack.observability.alertDetails.ruleDeletedModalDescription', {
              defaultMessage:
                'The rule that generated this alert has been deleted. The alert data is retained, but the rule can no longer be viewed or edited.',
            })}
          </p>
        </EuiText>
        {ruleId && (
          <>
            <EuiSpacer size="m" />
            <EuiText size="s" color="subdued">
              <strong>
                {i18n.translate('xpack.observability.alertDetails.ruleDeletedModalRuleIdLabel', {
                  defaultMessage: 'Rule ID:',
                })}
              </strong>{' '}
              {ruleId}
            </EuiText>
          </>
        )}
      </EuiModalBody>
      <EuiModalFooter>
        <EuiButton onClick={onClose} fill data-test-subj="ruleDeletedModalCloseButton">
          {i18n.translate('xpack.observability.alertDetails.ruleDeletedModalCloseButtonLabel', {
            defaultMessage: 'Close',
          })}
        </EuiButton>
      </EuiModalFooter>
    </EuiModal>
  );
};
