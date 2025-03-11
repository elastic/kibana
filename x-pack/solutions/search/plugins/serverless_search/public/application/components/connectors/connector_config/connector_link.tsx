/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButton,
  EuiCallOut,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { ConnectorStatus } from '@kbn/search-connectors';
import React from 'react';
import { docLinks } from '../../../../../common/doc_links';
import { useAssetBasePath } from '../../../hooks/use_asset_base_path';
import { ConnectionDetails } from './connection_details_panel';

interface ConnectorLinkElasticsearchProps {
  connectorId: string;
  serviceType: string;
  status: ConnectorStatus;
}

export const ConnectorLinkElasticsearch: React.FC<ConnectorLinkElasticsearchProps> = ({
  connectorId,
  serviceType,
  status,
}) => {
  const assetBasePath = useAssetBasePath();

  return (
    <EuiFlexGroup direction="column" alignItems="center" justifyContent="center">
      <EuiFlexItem>
        <EuiTitle size="s">
          <h2>
            {i18n.translate('xpack.serverlessSearch.connectors.config.link.linkToElasticTitle', {
              defaultMessage: 'Link your connector to Elasticsearch',
            })}
          </h2>
        </EuiTitle>
      </EuiFlexItem>
      <EuiFlexItem>
        <EuiText color="subdued">
          {i18n.translate('xpack.serverlessSearch.connectors.config.linkToElasticDescription', {
            defaultMessage:
              'You need to run the connector code on your own infrastructure and link it to your Elasticsearch instance. You have two options:',
          })}
        </EuiText>
      </EuiFlexItem>
      <EuiFlexItem>
        <EuiFlexGroup direction="row" alignItems="center" justifyContent="center">
          <EuiFlexItem grow={false}>
            <span>
              <EuiButton
                data-test-subj="serverlessSearchConnectorLinkElasticsearchRunWithDockerButton"
                iconType={`${assetBasePath}/docker.svg`}
                href={docLinks.connectorsRunWithDocker}
                target="_blank"
                fill
              >
                {i18n.translate('xpack.serverlessSearch.connectors.runWithDockerLink', {
                  defaultMessage: 'Run with Docker',
                })}
              </EuiButton>
            </span>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <span>
              <EuiButton
                data-test-subj="serverlessSearchConnectorLinkElasticsearchRunFromSourceButton"
                iconType={`${assetBasePath}/github_white.svg`}
                href={docLinks.connectorsRunFromSource}
                target="_blank"
                fill
              >
                {i18n.translate('xpack.serverlessSearch.connectors.runFromSourceLink', {
                  defaultMessage: 'Run from source',
                })}
              </EuiButton>
            </span>
          </EuiFlexItem>
        </EuiFlexGroup>
        <EuiSpacer />
        {Boolean(serviceType) ? (
          <EuiFlexItem>
            <ConnectionDetails
              connectorId={connectorId}
              serviceType={serviceType}
              status={status}
            />
          </EuiFlexItem>
        ) : (
          <EuiFlexItem>
            <EuiCallOut
              title={i18n.translate('xpack.serverlessSearch.connectors.pleaseSelectServiceType', {
                defaultMessage: 'Please select a connector type.',
              })}
              color="warning"
              iconType="iInCircle"
            />
          </EuiFlexItem>
        )}
        <EuiSpacer />
        {Boolean(serviceType) &&
        (status === ConnectorStatus.CREATED || status === ConnectorStatus.NEEDS_CONFIGURATION) ? (
          <EuiFlexItem>
            <EuiCallOut
              title={i18n.translate('xpack.serverlessSearch.connectors.waitingForConnection', {
                defaultMessage: 'Waiting for connection',
              })}
              color="warning"
              iconType="iInCircle"
            />
          </EuiFlexItem>
        ) : null}
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
