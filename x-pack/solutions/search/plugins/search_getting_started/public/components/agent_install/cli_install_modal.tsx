/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiModal,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiModalBody,
  EuiModalFooter,
  EuiButton,
  EuiButtonEmpty,
  EuiCodeBlock,
  EuiText,
  EuiSpacer,
  EuiFlexGroup,
  EuiFlexItem,
  EuiBetaBadge,
  EuiTitle,
  useGeneratedHtmlId,
  EuiPanel,
  useEuiTheme,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useElasticsearchUrl } from '../../hooks/use_elasticsearch_url';
import { buildCliConnectCommand } from './util';
import {
  CLI_INSTALL_COMMAND,
  CLI_VERIFY_COMMAND,
  CLI_REPO_URL,
  CLI_COMMAND_REFERENCE_URL,
} from './constants';

interface CliInstallModalProps {
  onClose: () => void;
}

const Step: React.FC<{
  title: string;
  description?: string;
  command: string;
  caption?: string;
  codeTestSubj: string;
}> = ({ title, description, command, caption, codeTestSubj }) => (
  <>
    <EuiTitle size="xs">
      <h4>{title}</h4>
    </EuiTitle>
    {description && (
      <>
        <EuiSpacer size="xs" />
        <EuiText size="s" color="subdued">
          <p>{description}</p>
        </EuiText>
      </>
    )}
    <EuiSpacer size="s" />
    <EuiPanel color="subdued" paddingSize="none">
      <EuiCodeBlock
        transparentBackground
        language="bash"
        isCopyable
        paddingSize="m"
        fontSize="m"
        data-test-subj={codeTestSubj}
      >
        {command}
      </EuiCodeBlock>
    </EuiPanel>
    {caption && (
      <>
        <EuiSpacer size="s" />
        <EuiText size="xs" color="subdued">
          <p>{caption}</p>
        </EuiText>
      </>
    )}
  </>
);

export const CliInstallModal: React.FC<CliInstallModalProps> = ({ onClose }) => {
  const { euiTheme } = useEuiTheme();
  const modalTitleId = useGeneratedHtmlId({ prefix: 'cliInstallModal' });
  const elasticsearchUrl = useElasticsearchUrl();
  const connectCommand = buildCliConnectCommand(elasticsearchUrl);

  return (
    <EuiModal onClose={onClose} aria-labelledby={modalTitleId} maxWidth={euiTheme.base * 40}>
      <EuiModalHeader>
        <EuiModalHeaderTitle id={modalTitleId}>
          <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
            <EuiFlexItem grow={false}>
              {i18n.translate('xpack.searchGettingStarted.cliInstallModal.title', {
                defaultMessage: 'Install Elastic CLI',
              })}
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiBetaBadge
                label={i18n.translate(
                  'xpack.searchGettingStarted.cliInstallModal.technicalPreviewBadgeLabel',
                  { defaultMessage: 'Technical preview' }
                )}
                tooltipContent={i18n.translate(
                  'xpack.searchGettingStarted.cliInstallModal.technicalPreviewBadgeDescription',
                  {
                    defaultMessage:
                      'This functionality is in technical preview and may be changed or removed completely in a future release. Elastic will work to fix any issues, but features in technical preview are not subject to the support SLA of official GA features.',
                  }
                )}
                size="m"
              />
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiModalHeaderTitle>
      </EuiModalHeader>
      <EuiModalBody>
        <EuiText size="s" color="subdued">
          <p>
            {i18n.translate('xpack.searchGettingStarted.cliInstallModal.description', {
              defaultMessage:
                'Run these commands in your terminal to install the CLI and connect to this project.',
            })}
          </p>
        </EuiText>
        <EuiSpacer size="l" />
        <Step
          title={i18n.translate('xpack.searchGettingStarted.cliInstallModal.installStepTitle', {
            defaultMessage: 'Install the CLI',
          })}
          command={CLI_INSTALL_COMMAND}
          caption={i18n.translate(
            'xpack.searchGettingStarted.cliInstallModal.nodeRequirementDescription',
            { defaultMessage: 'Requires Node 22+' }
          )}
          codeTestSubj="cliInstallModalInstallCode"
        />
        <EuiSpacer size="l" />
        <Step
          title={i18n.translate('xpack.searchGettingStarted.cliInstallModal.connectStepTitle', {
            defaultMessage: 'Connect your serverless project',
          })}
          description={i18n.translate(
            'xpack.searchGettingStarted.cliInstallModal.connectStepDescription',
            {
              defaultMessage:
                'Use your project endpoint and an API key to securely add your project to the CLI. Currently only serverless projects are supported.',
            }
          )}
          command={connectCommand}
          codeTestSubj="cliInstallModalConnectCode"
        />
        <EuiSpacer size="l" />
        <Step
          title={i18n.translate('xpack.searchGettingStarted.cliInstallModal.verifyStepTitle', {
            defaultMessage: 'Verify the connection',
          })}
          command={CLI_VERIFY_COMMAND}
          codeTestSubj="cliInstallModalVerifyCode"
        />
        <EuiSpacer size="l" />
      </EuiModalBody>
      <EuiModalFooter>
        <EuiFlexItem grow>
          <EuiFlexGroup gutterSize="m" alignItems="center" responsive={false}>
            <EuiFlexItem grow={false}>
              <EuiButtonEmpty
                color="text"
                flush="left"
                href={CLI_REPO_URL}
                target="_blank"
                iconType="logoGithub"
                data-test-subj="cliInstallModalRepoLink"
              >
                {i18n.translate('xpack.searchGettingStarted.cliInstallModal.cliRepoLinkText', {
                  defaultMessage: 'elastic/cli',
                })}
              </EuiButtonEmpty>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiButtonEmpty
                href={CLI_COMMAND_REFERENCE_URL}
                target="_blank"
                iconType="documentation"
                iconSide="left"
                flush="left"
                color="text"
                data-test-subj="cliInstallModalCommandReferenceLink"
              >
                {i18n.translate(
                  'xpack.searchGettingStarted.cliInstallModal.commandReferenceLinkText',
                  { defaultMessage: 'Command reference' }
                )}
              </EuiButtonEmpty>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
        <EuiButton onClick={onClose} data-test-subj="cliInstallModalCloseBtn">
          {i18n.translate('xpack.searchGettingStarted.cliInstallModal.closeButtonLabel', {
            defaultMessage: 'Close',
          })}
        </EuiButton>
      </EuiModalFooter>
    </EuiModal>
  );
};
