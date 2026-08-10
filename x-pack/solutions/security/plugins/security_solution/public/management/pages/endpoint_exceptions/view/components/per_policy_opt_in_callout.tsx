/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButton, EuiCallOut, EuiFlexGroup, EuiLink, EuiSpacer } from '@elastic/eui';
import React, { memo } from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { useKibana } from '../../../../../common/lib/kibana';

export interface EndpointExceptionsPerPolicyOptInCalloutProps {
  onDismiss: () => void;
  onClickUpdateDetails: () => void;
  canOptIn: boolean;
}

export const EndpointExceptionsPerPolicyOptInCallout: React.FC<EndpointExceptionsPerPolicyOptInCalloutProps> =
  memo(({ onDismiss, onClickUpdateDetails, canOptIn }) => {
    const { docLinks } = useKibana().services;

    return (
      <EuiCallOut
        title={i18n.translate(
          'xpack.securitySolution.endpointExceptions.perPolicyOptInCalloutTitle',
          {
            defaultMessage: 'Endpoint Exceptions are now managed here',
          }
        )}
        color="primary"
        iconType="info"
        onDismiss={onDismiss}
        data-test-subj="endpointExceptionsPerPolicyOptInCallout"
      >
        <FormattedMessage
          id="xpack.securitySolution.endpointExceptions.perPolicyOptInCalloutDescription"
          defaultMessage="Endpoint exceptions can now be applied on a per-policy basis. Update existing Endpoint Exceptions to the policy-based model."
        />

        <EuiSpacer size="m" />

        {canOptIn ? (
          <EuiFlexGroup>
            <EuiButton
              color="primary"
              fill
              size="s"
              onClick={onClickUpdateDetails}
              data-test-subj="updateDetailsEndpointExceptionsPerPolicyOptInButton"
            >
              {i18n.translate(
                'xpack.securitySolution.endpointExceptions.perPolicyOptInCalloutCta',
                {
                  defaultMessage: 'Update details',
                }
              )}
            </EuiButton>

            <EuiButton
              color="primary"
              size="s"
              data-test-subj="learnMoreEndpointExceptionsPerPolicyOptInButton"
            >
              <EuiLink href={docLinks.links.securitySolution.endpointExceptions} target="_blank">
                {i18n.translate(
                  'xpack.securitySolution.endpointExceptions.perPolicyOptInCalloutLearnMore',
                  {
                    defaultMessage: 'Learn more',
                  }
                )}
              </EuiLink>
            </EuiButton>
          </EuiFlexGroup>
        ) : (
          <FormattedMessage
            id="xpack.securitySolution.endpointExceptions.perPolicyOptInCalloutNoPermission"
            defaultMessage="Contact your administrator to update details."
          />
        )}
      </EuiCallOut>
    );
  });

EndpointExceptionsPerPolicyOptInCallout.displayName = 'EndpointExceptionsPerPolicyOptInCallout';
