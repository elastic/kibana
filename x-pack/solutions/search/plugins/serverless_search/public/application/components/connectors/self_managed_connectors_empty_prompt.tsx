/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiIcon,
  EuiLink,
  EuiButton,
  EuiBadge,
  EuiText,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { ConnectorIcon } from '@kbn/search-shared-ui';
import { SearchEmptyPrompt, DecorativeHorizontalStepper } from '@kbn/search-shared-ui';
import { docLinks } from '../../../../common/doc_links';
import { useKibanaServices } from '../../hooks/use_kibana';
import { useConnectorTypes } from '../../hooks/api/use_connector_types';
import { useCreateConnector } from '../../hooks/api/use_create_connector';
import { useAssetBasePath } from '../../hooks/use_asset_base_path';
import { useConnectors } from '../../hooks/api/use_connectors';
import { ELASTIC_MANAGED_CONNECTOR_PATH, BASE_CONNECTORS_PATH } from '../../constants';
import { BACK_LABEL } from '../../../../common/i18n_string';

export const SelfManagedConnectorsEmptyPrompt: React.FC = () => {
  const connectorTypes = useConnectorTypes();
  const connectorExamples = connectorTypes.filter((connector) =>
    ['Gmail', 'Sharepoint Online', 'Jira Cloud', 'Dropbox'].includes(connector.name)
  );
  const { createConnector, isLoading } = useCreateConnector();
  const { data } = useConnectors();
  const assetBasePath = useAssetBasePath();
  const connectorsIcon = assetBasePath + '/connectors.svg';
  const {
    application: { navigateToUrl },
  } = useKibanaServices();

  return (
    <SearchEmptyPrompt
      icon={connectorsIcon}
      title={i18n.translate('xpack.serverlessSearch.elasticManagedConnectorEmpty.title', {
        defaultMessage: 'Elastic managed connectors',
      })}
      description={i18n.translate(
        'xpack.serverlessSearch.elasticManagedConnectorEmpty.description',
        {
          defaultMessage:
            "We're actively developing Elastic managed connectors, that won't require any self-managed infrastructure. You'll be able to handle all configuration in the UI. This will simplify syncing your data into a serverless Elasticsearch project. This new workflow will have two steps:",
        }
      )}
      body={
        <EuiFlexGroup
          alignItems="stretch"
          justifyContent="center"
          direction="column"
          gutterSize="s"
        >
          <EuiFlexItem>
            <EuiPanel color="subdued">
              <EuiFlexItem grow={false}>
                <DecorativeHorizontalStepper stepCount={3} />
              </EuiFlexItem>
              <EuiFlexGroup>
                <EuiFlexItem>
                  <EuiFlexGroup justifyContent="flexStart" alignItems="center" direction="column">
                    <EuiFlexItem grow={false}>
                      <EuiFlexGroup
                        justifyContent="center"
                        alignItems="center"
                        direction="row"
                        gutterSize="s"
                      >
                        {connectorExamples.map((connector, index) => (
                          <React.Fragment key={connector.serviceType}>
                            {index === Math.floor(connectorExamples.length / 2) && (
                              <EuiFlexItem grow={false}>
                                <EuiIcon color="primary" size="l" type="documents" />
                              </EuiFlexItem>
                            )}
                            <EuiFlexItem grow={false}>
                              <ConnectorIcon
                                name={connector.name}
                                serviceType={connector.serviceType}
                                iconPath={connector.iconPath}
                                showTooltip
                              />
                            </EuiFlexItem>
                          </React.Fragment>
                        ))}
                      </EuiFlexGroup>
                    </EuiFlexItem>
                    <EuiFlexItem grow={false}>
                      <EuiText>
                        <p>
                          {i18n.translate(
                            'xpack.serverlessSearch.connectorsEmpty.guideOneDescription',
                            {
                              defaultMessage:
                                "Choose from over 30 third-party data sources you'd like to sync",
                            }
                          )}
                        </p>
                      </EuiText>
                    </EuiFlexItem>
                  </EuiFlexGroup>
                </EuiFlexItem>
                <EuiFlexItem>
                  <EuiFlexGroup justifyContent="flexStart" alignItems="center" direction="column">
                    <EuiFlexGroup
                      gutterSize="s"
                      direction="row"
                      alignItems="center"
                      justifyContent="center"
                    >
                      <EuiFlexItem grow={false}>
                        <EuiIcon color="primary" size="l" type={connectorsIcon} />
                      </EuiFlexItem>
                      <EuiFlexItem>
                        <EuiIcon size="m" type="sortRight" />
                      </EuiFlexItem>
                      <EuiFlexItem>
                        <EuiIcon color="primary" size="l" type="launch" />
                      </EuiFlexItem>
                    </EuiFlexGroup>
                    <EuiFlexItem>
                      <EuiText>
                        <p>
                          <FormattedMessage
                            id="xpack.serverlessSearch.connectorsEmpty.guideTwoDescription"
                            defaultMessage="Deploy connector code on your own infrastructure by running from {source}, or using {docker}"
                            values={{
                              source: (
                                <EuiLink
                                  target="_blank"
                                  data-test-subj="serverlessSearchEmptyConnectorsPromptSourceLink"
                                  href={docLinks.connectorsRunFromSource}
                                >
                                  {i18n.translate(
                                    'xpack.serverlessSearch.connectorsEmpty.sourceLabel',
                                    { defaultMessage: 'source' }
                                  )}
                                </EuiLink>
                              ),
                              docker: (
                                <EuiLink
                                  target="_blank"
                                  data-test-subj="serverlessSearchEmptyConnectorsPromptDockerLink"
                                  href={docLinks.connectorsRunWithDocker}
                                >
                                  {i18n.translate(
                                    'xpack.serverlessSearch.connectorsEmpty.dockerLabel',
                                    { defaultMessage: 'Docker' }
                                  )}
                                </EuiLink>
                              ),
                            }}
                          />
                        </p>
                      </EuiText>
                    </EuiFlexItem>
                  </EuiFlexGroup>
                </EuiFlexItem>
                <EuiFlexItem>
                  <EuiFlexGroup justifyContent="flexStart" alignItems="center" direction="column">
                    <EuiFlexItem grow={false}>
                      <EuiFlexGroup
                        gutterSize="s"
                        direction="row"
                        alignItems="center"
                        justifyContent="center"
                      >
                        <EuiFlexItem>
                          <EuiIcon color="primary" size="l" type="documents" />
                        </EuiFlexItem>
                        <EuiFlexItem>
                          <EuiIcon size="m" type="sortRight" />
                        </EuiFlexItem>
                        <EuiFlexItem>
                          <EuiIcon color="primary" size="l" type={connectorsIcon} />
                        </EuiFlexItem>
                        <EuiFlexItem>
                          <EuiIcon size="m" type="sortRight" />
                        </EuiFlexItem>
                        <EuiFlexItem>
                          <EuiIcon color="primary" size="l" type="logoElastic" />
                        </EuiFlexItem>
                      </EuiFlexGroup>
                    </EuiFlexItem>
                    <EuiFlexItem>
                      <EuiText>
                        <p>
                          {i18n.translate(
                            'xpack.serverlessSearch.connectorsEmpty.guideThreeDescription',
                            {
                              defaultMessage:
                                'Enter access and connection details for your data source and run your first sync',
                            }
                          )}
                        </p>
                      </EuiText>
                    </EuiFlexItem>
                  </EuiFlexGroup>
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiPanel>
          </EuiFlexItem>
        </EuiFlexGroup>
      }
      actions={
        <EuiFlexGroup direction="row" gutterSize="m">
          <EuiFlexItem>
            <EuiButton
              data-test-subj="serverlessSearchEmptyConnectorsPromptCreateConnectorButton"
              disabled={!data?.canManageConnectors}
              fill
              iconType="plusInCircle"
              onClick={() => createConnector()}
              isLoading={isLoading}
            >
              {i18n.translate('xpack.serverlessSearch.connectorsEmpty.selfManagedButton', {
                defaultMessage: 'Self-managed connector',
              })}
            </EuiButton>
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiFlexGroup direction="column" gutterSize="s" alignItems="center">
              <EuiFlexItem>
                <EuiButton
                  data-test-subj="serverlessSearchEmptyConnectorsPromptCreateElasticManagedConnectorButton"
                  isLoading={isLoading}
                  onClick={() =>
                    navigateToUrl(`${BASE_CONNECTORS_PATH}/${ELASTIC_MANAGED_CONNECTOR_PATH}`)
                  }
                >
                  {i18n.translate('xpack.serverlessSearch.connectorsEmpty.elasticManagedButton', {
                    defaultMessage: 'Elastic managed connector',
                  })}
                </EuiButton>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiBadge color="accent">{BACK_LABEL}</EuiBadge>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
        </EuiFlexGroup>
      }
    />
  );
};
