/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect } from 'react';

import dedent from 'dedent';

import {
  EuiAccordion,
  EuiAccordionProps,
  EuiButton,
  EuiCode,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiSpacer,
  EuiText,
  EuiLink,
} from '@elastic/eui';

import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { CodeBox } from '@kbn/search-api-panels';

import { useCloudDetails } from '../../../../shared/cloud_details/cloud_details';

import { ApiKey } from '../../../api/connector/generate_connector_api_key_api_logic';
import { getConnectorTemplate } from '../../search_index/connector/constants';

export interface RunFromSourceStepProps {
  apiKeyData?: ApiKey;
  connectorId?: string;
  isWaitingForConnector: boolean;
  serviceType: string;
  connectorVersion: string;
}

export const RunFromSourceStep: React.FC<RunFromSourceStepProps> = ({
  apiKeyData,
  connectorId,
  isWaitingForConnector,
  serviceType,
  connectorVersion,
}) => {
  const [isOpen, setIsOpen] = React.useState<EuiAccordionProps['forceState']>('open');
  useEffect(() => {
    if (!isWaitingForConnector) {
      setIsOpen('closed');
    }
  }, [isWaitingForConnector]);

  const { elasticsearchUrl } = useCloudDetails();

  return (
    <>
      <EuiAccordion
        id="runFromSourceAccordion"
        onToggle={() => setIsOpen(isOpen === 'closed' ? 'open' : 'closed')}
        forceState={isOpen}
        buttonContent={
          <EuiText size="m">
            <h5>
              {i18n.translate('xpack.enterpriseSearch.connectorDeployment.runFromSourceTitle', {
                defaultMessage: 'Run connector service from source',
              })}
            </h5>
          </EuiText>
        }
      >
        <EuiSpacer size="s" />
        <EuiText size="s">
          <h5>
            {i18n.translate('xpack.enterpriseSearch.connectorDeployment.p.cloneRepositoryLabel', {
              defaultMessage: 'Clone the repository',
            })}
          </h5>
          <p>
            {i18n.translate(
              'xpack.enterpriseSearch.connectorDeployment.p.addTheFollowingConfigurationLabel',
              {
                defaultMessage: 'First, you need to clone or download the repo:',
              }
            )}
          </p>
        </EuiText>
        <EuiSpacer size="s" />
        <EuiCode>git clone https://github.com/elastic/connectors</EuiCode>&nbsp;&nbsp;&nbsp;
        {i18n.translate('xpack.enterpriseSearch.connectorDeployment.orLabel', {
          defaultMessage: 'or',
        })}
        &nbsp;&nbsp;&nbsp;
        <EuiButton
          data-test-subj="enterpriseSearchConnectorDeploymentGoToSourceButton"
          iconType="logoGithub"
          href="https://github.com/elastic/connectors"
          target="_blank"
        >
          <EuiFlexGroup responsive={false} gutterSize="xs">
            <EuiFlexItem>
              {i18n.translate('xpack.enterpriseSearch.connectorDeployment.goToSourceButtonLabel', {
                defaultMessage: 'Download source',
              })}
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiIcon type="popout" />
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiButton>
        <EuiText size="s">
          <h5>
            {i18n.translate('xpack.enterpriseSearch.connectorDeployment.p.createConfigFileLabel', {
              defaultMessage: 'Create configuration file',
            })}
          </h5>
          <p>
            {i18n.translate('xpack.enterpriseSearch.connectorDeployment.p.navigateToRootLabel', {
              defaultMessage:
                'Navigate to the root of your cloned repository and create a configuration file:',
            })}
          </p>
        </EuiText>
        <EuiSpacer size="s" />
        <CodeBox
          showTopBar={false}
          languageType="bash"
          codeSnippet={`cd connectors && git checkout ${connectorVersion} && touch config.yml`}
        />
        <EuiSpacer size="s" />
        <EuiText size="s">
          <h5>
            {i18n.translate('xpack.enterpriseSearch.connectorDeployment.p.populateConfigLabel', {
              defaultMessage: 'Populate configuration file',
            })}
          </h5>
          <p>
            <FormattedMessage
              id="xpack.enterpriseSearch.connectorDeployment.p.createConfigLabel"
              defaultMessage="The previous command creates a {configYaml} file. Copy and paste the following configuration into that file:"
              values={{
                configYaml: (
                  <EuiCode>
                    {i18n.translate(
                      'xpack.enterpriseSearch.connectorDeployment.configYamlCodeBlockLabel',
                      { defaultMessage: 'config.yml' }
                    )}
                  </EuiCode>
                ),
              }}
            />
          </p>
        </EuiText>
        <EuiSpacer size="s" />
        <CodeBox
          showTopBar={false}
          languageType="yaml"
          codeSnippet={getConnectorTemplate({
            apiKeyData,
            connectorData: {
              id: connectorId ?? '',
              service_type: serviceType,
            },
            host: elasticsearchUrl,
          })}
        />
        <EuiSpacer size="s" />
        <EuiText size="s">
          <p>
            <FormattedMessage
              id="xpack.enterpriseSearch.connectorDeployment.customizeSettingsLabel"
              defaultMessage="If you want to customize settings later, refer to this {exampleFile}."
              values={{
                exampleFile: (
                  <EuiLink
                    data-test-subj="enterpriseSearchRunFromSourceStepExampleFileLink"
                    href="https://github.com/elastic/connectors/blob/main/config.yml.example"
                    target="_blank"
                    external
                  >
                    {i18n.translate(
                      'xpack.enterpriseSearch.connectorDeployment.exampleConfigFileLinkLabel',
                      { defaultMessage: 'example file' }
                    )}
                  </EuiLink>
                ),
              }}
            />
          </p>
        </EuiText>
        <EuiSpacer size="m" />
        <EuiText size="s">
          <h5>
            {i18n.translate('xpack.enterpriseSearch.connectorDeployment.p.compileAndRunTitle', {
              defaultMessage: 'Run the connector service',
            })}
          </h5>
          <p>
            {i18n.translate(
              'xpack.enterpriseSearch.connectorDeployment.p.compileAndRunInstructions',
              {
                defaultMessage: 'Finally, compile and run the connector service source code:',
              }
            )}
          </p>
        </EuiText>
        <EuiSpacer size="s" />
        <CodeBox
          showTopBar={false}
          languageType="bash"
          codeSnippet={dedent`
                              make install
                              make run
                              `}
        />
        <EuiSpacer size="s" />
      </EuiAccordion>
    </>
  );
};
