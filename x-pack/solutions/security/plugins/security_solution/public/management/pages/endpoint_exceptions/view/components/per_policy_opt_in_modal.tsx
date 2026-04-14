/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButton,
  EuiButtonEmpty,
  EuiModal,
  EuiModalBody,
  EuiModalFooter,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';
import React, { memo } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';

export interface EndpointExceptionsPerPolicyOptInModalProps {
  onDismiss: () => void;
  onConfirm: () => void;
  isLoading: boolean;
}

export const EndpointExceptionsPerPolicyOptInModal: React.FC<EndpointExceptionsPerPolicyOptInModalProps> =
  memo(({ onDismiss, onConfirm, isLoading }) => {
    return (
      <EuiModal
        aria-label="Endpoint Exceptions Per Policy Opt-In"
        onClose={onDismiss}
        data-test-subj="endpointExceptionsPerPolicyOptInModal"
      >
        <EuiModalHeader>
          <EuiModalHeaderTitle>
            <FormattedMessage
              id="xpack.securitySolution.endpointExceptions.perPolicyOptInModal.title"
              defaultMessage="Update to policy-based endpoint exceptions"
            />
          </EuiModalHeaderTitle>
        </EuiModalHeader>

        <EuiModalBody>
          <EuiText>
            <p>
              <FormattedMessage
                id="xpack.securitySolution.endpointExceptions.perPolicyOptInModal.callout"
                defaultMessage="Endpoint exceptions are now managed from this page and can be applied per policy."
              />
            </p>

            <div>
              <FormattedMessage
                id="xpack.securitySolution.endpointExceptions.perPolicyOptInModal.ifYouDontUpdate.description"
                defaultMessage="If you don't update to this change:"
              />

              <ul>
                <li>
                  <FormattedMessage
                    id="xpack.securitySolution.endpointExceptions.perPolicyOptInModal.ifYouDontUpdate.noPolicyBasedExceptions"
                    defaultMessage="Endpoint exceptions will continue to apply globally"
                  />
                </li>
                <li>
                  <FormattedMessage
                    id="xpack.securitySolution.endpointExceptions.perPolicyOptInModal.ifYouDontUpdate.noBehaviorChanges"
                    defaultMessage="No behavior changes will occur"
                  />
                </li>
              </ul>
            </div>

            <EuiSpacer size="m" />

            <div>
              <FormattedMessage
                id="xpack.securitySolution.endpointExceptions.perPolicyOptInModal.ifYouUpdate.description"
                defaultMessage="If you update to policy-based endpoint exceptions:"
              />

              <ul>
                <li>
                  <FormattedMessage
                    id="xpack.securitySolution.endpointExceptions.perPolicyOptInModal.ifYouUpdate.createAndAssignExceptions"
                    defaultMessage="You can create and assign endpoint exceptions to specific policies"
                  />
                </li>
                <li>
                  <FormattedMessage
                    id="xpack.securitySolution.endpointExceptions.perPolicyOptInModal.ifYouUpdate.exceptionsNoLongerEvaluatedByDetectionRules"
                    defaultMessage="Endpoint exceptions will no longer be evaluated by detection rules"
                  />
                </li>
                <li>
                  <FormattedMessage
                    id="xpack.securitySolution.endpointExceptions.perPolicyOptInModal.ifYouUpdate.oneWayChange"
                    defaultMessage="This change is one-way and can't be reversed"
                  />
                </li>
              </ul>
            </div>
          </EuiText>
        </EuiModalBody>

        <EuiModalFooter>
          <EuiButtonEmpty
            onClick={onDismiss}
            disabled={isLoading}
            data-test-subj="cancelEndpointExceptionsPerPolicyOptInButton"
          >
            <FormattedMessage
              id="xpack.securitySolution.endpointExceptions.perPolicyOptInModal.cancelButtonLabel"
              defaultMessage="Cancel"
            />
          </EuiButtonEmpty>

          <EuiButton
            onClick={onConfirm}
            color="primary"
            fill
            isLoading={isLoading}
            data-test-subj="confirmEndpointExceptionsPerPolicyOptInButton"
          >
            <FormattedMessage
              id="xpack.securitySolution.endpointExceptions.perPolicyOptInModal.updateButtonLabel"
              defaultMessage="Confirm and update"
            />
          </EuiButton>
        </EuiModalFooter>
      </EuiModal>
    );
  });

EndpointExceptionsPerPolicyOptInModal.displayName = 'EndpointExceptionsPerPolicyOptInModal';
