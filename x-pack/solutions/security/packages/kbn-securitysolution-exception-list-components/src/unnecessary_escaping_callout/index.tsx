/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';

import { EuiCallOut, EuiLink, EuiLoadingSpinner } from '@elastic/eui';
import { useKibana } from '@kbn/kibana-react-plugin/public';

export const UnnecessaryEscapingCallout = () => {
  const { docLinks } = useKibana().services;

  if (!docLinks) {
    return <EuiLoadingSpinner />;
  }

  return (
    <EuiCallOut
      title={i18n.translate('exceptionList-components.unnecessaryEscapingCallout.title', {
        defaultMessage: 'Please review your entries',
      })}
      iconType="warning"
      color="warning"
      size="s"
      data-test-subj="unnecessaryEscapingCallout"
    >
      <p>
        <FormattedMessage
          id="exceptionList-components.unnecessaryEscapingCallout.body"
          defaultMessage='Endpoint artifacts do not require escaping when using "\", "*" or "?" characters. {link}'
          values={{
            link: (
              <EuiLink
                target="_blank"
                href={docLinks.links.securitySolution.endpointArtifactsNoEscaping}
              >
                <FormattedMessage
                  id="exceptionList-components.unnecessaryEscapingCallout.link"
                  defaultMessage="Learn more about endpoint artifact value syntax."
                />
              </EuiLink>
            ),
          }}
        />
      </p>
    </EuiCallOut>
  );
};
