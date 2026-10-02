/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiCallOut, EuiSpacer } from '@elastic/eui';
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
        text={
          <>
            <FormattedMessage
              id="xpack.securitySolution.endpointExceptions.perPolicyOptInCalloutDescription"
              defaultMessage="Endpoint exceptions can now be applied on a per-policy basis. Update existing Endpoint Exceptions to the policy-based model."
            />
            {!canOptIn && (
              <>
                <EuiSpacer size="m" />
                <FormattedMessage
                  id="xpack.securitySolution.endpointExceptions.perPolicyOptInCalloutNoPermission"
                  defaultMessage="Contact your administrator to update details."
                />
              </>
            )}
          </>
        }
        actionProps={
          canOptIn
            ? {
                primary: {
                  onClick: onClickUpdateDetails,
                  'data-test-subj': 'updateDetailsEndpointExceptionsPerPolicyOptInButton',
                  children: i18n.translate(
                    'xpack.securitySolution.endpointExceptions.perPolicyOptInCalloutCta',
                    {
                      defaultMessage: 'Update details',
                    }
                  ),
                },
                secondary: {
                  href: docLinks.links.securitySolution.endpointExceptions,
                  target: '_blank',
                  iconType: 'external',
                  iconSide: 'right',
                  'data-test-subj': 'learnMoreEndpointExceptionsPerPolicyOptInButton',
                  children: i18n.translate(
                    'xpack.securitySolution.endpointExceptions.perPolicyOptInCalloutLearnMore',
                    {
                      defaultMessage: 'Learn more',
                    }
                  ),
                },
              }
            : undefined
        }
      />
    );
  });

EndpointExceptionsPerPolicyOptInCallout.displayName = 'EndpointExceptionsPerPolicyOptInCallout';
