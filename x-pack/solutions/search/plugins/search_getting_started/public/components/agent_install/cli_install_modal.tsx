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

const GithubSVG = () => {
  const { euiTheme } = useEuiTheme();
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill={euiTheme.colors.textParagraph} xmlns="http://www.w3.org/2000/svg">
      <g clip-path="url(#clip0_58_27005)">
        <path d="M8 0C3.58203 0 0 3.67167 0 8.2002C0 11.8238 2.292 14.8969 5.47119 15.981C5.87109 16.0561 6.01709 15.8028 6.01709 15.5866C6.01709 15.3914 6.00977 14.7447 6.00586 14.0601C3.78125 14.5555 3.31103 13.0931 3.31103 13.0931C2.94678 12.1461 2.42284 11.8939 2.42284 11.8939C1.6958 11.3854 2.478 11.3954 2.478 11.3954C3.28122 11.4524 3.70409 12.2402 3.70409 12.2402C4.41797 13.4935 5.57714 13.1311 6.03222 12.9209C6.10494 12.3924 6.31197 12.03 6.54003 11.8258C4.76416 11.6186 2.896 10.9149 2.896 7.77276C2.896 6.87686 3.20802 6.14615 3.71875 5.57207C3.6372 5.36386 3.36181 4.52952 3.79784 3.4009C3.79784 3.4009 4.46875 3.18068 5.99803 4.24175C6.63572 4.05907 7.31981 3.96898 7.99998 3.96597C8.67967 3.96898 9.36423 4.06006 10.0029 4.24274C11.5293 3.18068 12.2012 3.4019 12.2012 3.4019C12.6387 4.53152 12.3633 5.36485 12.2812 5.57207C12.7939 6.14615 13.1035 6.87688 13.1035 7.77276C13.1035 10.9229 11.2324 11.6166 9.4502 11.8198C9.7383 12.0741 9.99317 12.5726 9.99317 13.3373C9.99317 14.4334 9.98242 15.3173 9.98242 15.5876C9.98242 15.8058 10.1279 16.0611 10.5332 15.981C13.71 14.8949 16 11.8218 16 8.2002C16 3.67167 12.418 0 8 0Z" />
      </g>
      <defs>
        <clipPath id="clip0_58_27005">
          <rect width="16" height="16" fill="white" />
        </clipPath>
      </defs>
    </svg>
  )
};

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
    {description ? (
      <>
        <EuiSpacer size="xs" />
        <EuiText size="s" color="subdued">
          <p>{description}</p>
        </EuiText>
      </>
    ) : null}
    <EuiSpacer size="s" />
    <EuiPanel color="subdued" paddingSize="none">
      <EuiCodeBlock transparentBackground language="bash" isCopyable paddingSize="m" fontSize="m" data-test-subj={codeTestSubj}>
        {command}
      </EuiCodeBlock>
    </EuiPanel>
    {caption ? (
      <>
        <EuiSpacer size="s" />
        <EuiText size="xs" color="subdued">
          <p>{caption}</p>
        </EuiText>
      </>
    ) : null}
  </>
);

export const CliInstallModal: React.FC<CliInstallModalProps> = ({ onClose }) => {
  const modalTitleId = useGeneratedHtmlId({ prefix: 'cliInstallModal' });
  const elasticsearchUrl = useElasticsearchUrl();
  const connectCommand = buildCliConnectCommand(elasticsearchUrl);

  return (
    <EuiModal onClose={onClose} aria-labelledby={modalTitleId} maxWidth={640}>
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
                iconType={GithubSVG}
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
