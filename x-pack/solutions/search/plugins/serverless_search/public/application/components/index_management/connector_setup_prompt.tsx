/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiEmptyPrompt,
  EuiIcon,
  EuiFlexItem,
  EuiFlexGroup,
  EuiButton,
  EuiPanel,
  EuiTitle,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { Connector } from '@kbn/search-connectors';

import { useKibanaServices } from '../../hooks/use_kibana';
import { useAssetBasePath } from '../../hooks/use_asset_base_path';
import { useConnectorTypes } from '../../hooks/api/use_connector_types';

interface ConnectorSetupEmptyPromptProps {
  indexName: string;
  connector: Connector;
}

export const ConnectorSetupEmptyPrompt = ({ connector }: ConnectorSetupEmptyPromptProps) => {
  const { http } = useKibanaServices();
  const assetBasePath = useAssetBasePath();
  const connectorTypes = useConnectorTypes();

  const connectorsIconPath = assetBasePath + '/connectors.svg';
  const connectorPath = http.basePath.prepend(`/app/connectors/${connector.id}`);
  const connectorType = connectorTypes.find(
    (cType) => cType.serviceType === connector.service_type
  );
  return (
    <EuiPanel>
      <EuiEmptyPrompt
        icon={<EuiIcon size="xxl" type={connectorsIconPath} />}
        title={
          <EuiTitle size="xs">
            <h5>
              <FormattedMessage
                id="xpack.serverlessSearch.indexManagement.indexDetails.overview.emptyPrompt.connector.title"
                defaultMessage="Set up your connector"
              />
            </h5>
          </EuiTitle>
        }
        body={
          <>
            <p>
              <FormattedMessage
                id="xpack.serverlessSearch.indexManagement.indexDetails.overview.emptyPrompt.connector.body"
                defaultMessage="This index is managed by an existing connector."
              />
            </p>
            {!!connectorType && (
              <>
                <EuiFlexGroup
                  direction="row"
                  gutterSize="s"
                  alignItems="center"
                  justifyContent="center"
                >
                  <EuiFlexItem grow={false}>
                    <EuiIcon
                      size="l"
                      title={connectorType.name}
                      id={connectorType.serviceType}
                      type={connectorType.iconPath}
                      style={{ marginBottom: '0px' }}
                    />
                  </EuiFlexItem>
                  <EuiFlexItem grow={false}>{connectorType.name}</EuiFlexItem>
                </EuiFlexGroup>
              </>
            )}
          </>
        }
        actions={
          <EuiButton
            data-test-subj="serverlessSearchConnectorSetupEmptyPromptViewConnectorButton"
            fill
            href={connectorPath}
          >
            <FormattedMessage
              id="xpack.serverlessSearch.indexManagement.indexDetails.overview.emptyPrompt.connector.action"
              defaultMessage="View Connector"
            />
          </EuiButton>
        }
      />
    </EuiPanel>
  );
};
