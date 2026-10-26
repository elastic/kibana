/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiLink, EuiText, EuiToolTip } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { FormattedMessage } from '@kbn/i18n-react';

const Link = ({ children, url }: { children: React.ReactNode; url: string }) => (
  <EuiLink
    href={url}
    target="_blank"
    rel="noopener nofollow noreferrer"
    data-test-subj="externalLink"
  >
    {children}
  </EuiLink>
);

export const ReadDocumentation = ({ url }: { url: string }) => {
  return (
    <EuiText color="subdued" size="s">
      <FormattedMessage
        id="securitySolutionPackages.cloudSecurityPosture.cloudSetup.aws.cloudFormationSetupNote"
        defaultMessage="Read the {documentation} for more details"
        values={{
          documentation: (
            <Link url={url}>
              {i18n.translate(
                'securitySolutionPackages.cloudSecurityPosture.cloudSetup.aws.documentationLinkText',
                {
                  defaultMessage: 'documentation',
                }
              )}
            </Link>
          ),
        }}
      />
    </EuiText>
  );
};

export const TechnicalPreviewText = () => {
  const technicalPreviewLabel = i18n.translate(
    'securitySolutionPackages.cloudSecurityPosture.cloudSetup.technicalPreviewTextLabel',
    {
      defaultMessage: 'Technical preview',
    }
  );
  const technicalPreviewTip = i18n.translate(
    'securitySolutionPackages.cloudSecurityPosture.cloudSetup.technicalPreviewTextTooltip',
    {
      defaultMessage:
        'This functionality is in technical preview and may be changed in a future release. Please help us by reporting any bugs.',
    }
  );

  return (
    <EuiToolTip content={technicalPreviewTip} title={technicalPreviewLabel}>
      <span tabIndex={0}>{technicalPreviewLabel}</span>
    </EuiToolTip>
  );
};
