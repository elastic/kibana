/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiLink, EuiSpacer, EuiText, EuiCodeBlock } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';

export const GoogleCloudShellCredentialsGuide = (props: {
  commandText: string;
  isOrganization?: boolean;
}) => {
  const GOOGLE_CLOUD_SHELL_EXTERNAL_DOC_URL = 'https://cloud.google.com/shell/docs';
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

  return (
    <>
      <EuiSpacer size="xs" />
      <EuiText size="s" color="subdued">
        <FormattedMessage
          id="securitySolutionPackages.cloudSecurityPosture.cloudSetup.gcp.cloudshell.guide.description"
          defaultMessage="The Google Cloud Shell Command below will generate a Service Account Credentials JSON key to set up access for assessing your GCP environment's security posture. Learn more about {learnMore}."
          values={{
            learnMore: (
              <Link url={GOOGLE_CLOUD_SHELL_EXTERNAL_DOC_URL}>
                <FormattedMessage
                  id="securitySolutionPackages.cloudSecurityPosture.cloudSetup.gcp.cloudshell.guide.learnMoreLinkText"
                  defaultMessage="Google Cloud Shell"
                />
              </Link>
            ),
          }}
        />
        <EuiSpacer size="l" />
        <EuiText size="s" color="subdued">
          <ol>
            <li>
              <FormattedMessage
                id="securitySolutionPackages.cloudSecurityPosture.cloudSetup.gcp.cloudshell.guide.steps.launch"
                defaultMessage="Log into your {googleCloudConsole}"
                values={{
                  googleCloudConsole: <strong>{'Google Cloud Console'}</strong>,
                }}
              />
            </li>
            <EuiSpacer size="xs" />
            <li>
              <>
                {props?.isOrganization ? (
                  <FormattedMessage
                    id="securitySolutionPackages.cloudSecurityPosture.cloudSetup.gcp.cloudshell.guide.steps.copyWithOrgId"
                    defaultMessage="Replace <PROJECT_ID> and <ORG_ID_VALUE> in the following command with your project ID and organization ID then copy the command"
                    ignoreTag
                  />
                ) : (
                  <FormattedMessage
                    id="securitySolutionPackages.cloudSecurityPosture.cloudSetup.gcp.cloudshell.guide.steps.copyWithProjectId"
                    defaultMessage="Replace <PROJECT_ID> in the following command with your project ID then copy the command"
                    ignoreTag
                  />
                )}
                <EuiSpacer size="m" />
                <EuiCodeBlock language="bash" isCopyable contentEditable="true">
                  {props.commandText}
                </EuiCodeBlock>
              </>
            </li>
            <EuiSpacer size="xs" />
            <li>
              <FormattedMessage
                id="securitySolutionPackages.cloudSecurityPosture.cloudSetup.gcp.cloudshell.guide.steps.cloudShellButton"
                defaultMessage="Click the {cloudShellButton} button below and login into your account"
                values={{
                  cloudShellButton: <strong>{'Launch Google Cloud Shell'}</strong>,
                }}
                ignoreTag
              />
            </li>
            <EuiSpacer size="xs" />
            <li>
              <FormattedMessage
                id="securitySolutionPackages.cloudSecurityPosture.cloudSetup.gcp.cloudshell.guide.steps.confirmation"
                defaultMessage="Check {trustRepo} and click {confirmButton}"
                values={{
                  confirmButton: <strong>{'Confirm'}</strong>,
                  trustRepo: <em>{'Trust Repo'}</em>,
                }}
                ignoreTag
              />
            </li>
            <EuiSpacer size="xs" />
            <li>
              <FormattedMessage
                id="securitySolutionPackages.cloudSecurityPosture.cloudSetup.gcp.cloudshell.guide.steps.runCloudShellScript"
                defaultMessage="Paste and run command in the {googleCloudShell} terminal"
                values={{
                  googleCloudShell: <strong>{'Google Cloud Shell'}</strong>,
                }}
                ignoreTag
              />
            </li>
            <EuiSpacer size="xs" />
            <li>
              <FormattedMessage
                id="securitySolutionPackages.cloudSecurityPosture.cloudSetup.gcp.cloudshell.guide.steps.copyJsonServiceKey"
                defaultMessage="Run {catCommand} to view the service account key. Copy and paste Credentials JSON below"
                values={{
                  catCommand: <code>{'cat KEY_FILE.json'}</code>,
                }}
                ignoreTag
              />
            </li>
          </ol>
        </EuiText>
      </EuiText>
    </>
  );
};
