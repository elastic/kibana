/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';

import { useValues } from 'kea';

import {
  EuiBadge,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiPanel,
  EuiSpacer,
  EuiTitle,
} from '@elastic/eui';

import { i18n } from '@kbn/i18n';

import { BetaConnectorCallout } from '../../../shared/beta/beta_connector_callout';
import { KibanaLogic } from '../../../shared/kibana';

import { ConvertConnector } from '../search_index/connector/native_connector_configuration/convert_connector';
import { NativeConnectorConfigurationConfig } from '../search_index/connector/native_connector_configuration/native_connector_configuration_config';
import { ResearchConfiguration } from '../search_index/connector/native_connector_configuration/research_configuration';

import { AttachIndexBox } from './attach_index_box';
import { WhatsNextBox } from './components/whats_next_box';
import { ConnectorViewLogic } from './connector_view_logic';

export const NativeConnectorConfiguration: React.FC = () => {
  const { connector } = useValues(ConnectorViewLogic);
  const { connectorTypes: connectors } = useValues(KibanaLogic);

  const NATIVE_CONNECTORS = useMemo(
    () => connectors.filter(({ isNative }) => isNative),
    [connectors]
  );
  const BETA_CONNECTORS = useMemo(() => connectors.filter(({ isBeta }) => isBeta), [connectors]);

  if (!connector) {
    return <></>;
  }

  const nativeConnector = NATIVE_CONNECTORS.find(
    (connectorDefinition) => connectorDefinition.serviceType === connector.service_type
  ) || {
    docsUrl: '',
    externalAuthDocsUrl: '',
    externalDocsUrl: '',
    iconPath: 'custom.svg',
    isBeta: true,
    isNative: true,
    keywords: [],
    name: connector.name,
    serviceType: connector.service_type ?? '',
  };

  const iconPath = nativeConnector.iconPath;

  // TODO service_type === "" is considered unknown/custom connector multipleplaces replace all of them with a better solution
  const isBeta =
    !connector.service_type ||
    Boolean(BETA_CONNECTORS.find(({ serviceType }) => serviceType === connector.service_type));

  return (
    <>
      {isBeta ? (
        <>
          <EuiFlexItem grow={false}>
            <EuiPanel hasBorder hasShadow={false}>
              <BetaConnectorCallout />
            </EuiPanel>
          </EuiFlexItem>
          <EuiSpacer />
        </>
      ) : null}
      <EuiFlexGroup>
        <EuiFlexItem>
          <EuiFlexGroup gutterSize="m" direction="row" alignItems="center">
            {iconPath && (
              <EuiFlexItem grow={false}>
                <EuiIcon size="xl" type={iconPath} />
              </EuiFlexItem>
            )}
            <EuiFlexItem grow={false}>
              <EuiTitle size="s">
                <h2>{nativeConnector?.name ?? connector.name}</h2>
              </EuiTitle>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiBadge color="hollow">
                {connector.is_native
                  ? i18n.translate(
                      'xpack.enterpriseSearch.content.connector_detail.configurationConnector.badgeType.nativeConnector',
                      { defaultMessage: 'Elastic managed connector' }
                    )
                  : i18n.translate(
                      'xpack.enterpriseSearch.content.connector_detail.configurationConnector.badgeType.connectorClient',
                      { defaultMessage: 'Self-managed connector' }
                    )}
              </EuiBadge>
            </EuiFlexItem>
          </EuiFlexGroup>
          <EuiSpacer />
          <AttachIndexBox connector={connector} />
          {connector.index_name && (
            <>
              <EuiSpacer />
              <EuiPanel hasBorder>
                <EuiTitle size="s">
                  <h3>
                    {i18n.translate(
                      'xpack.enterpriseSearch.content.connector_detail.nativeConfigurationConnector.configuration.title',
                      { defaultMessage: 'Configuration' }
                    )}
                  </h3>
                </EuiTitle>
                <EuiSpacer />
                <ResearchConfiguration nativeConnector={nativeConnector} />
                <EuiSpacer size="m" />
                <NativeConnectorConfigurationConfig
                  connector={connector}
                  nativeConnector={nativeConnector}
                  status={connector.status}
                />
                <EuiSpacer />
              </EuiPanel>
              <EuiSpacer />
              <EuiPanel hasBorder>
                <ConvertConnector />
              </EuiPanel>
              <EuiSpacer />
              <WhatsNextBox
                connectorId={connector.id}
                connectorStatus={connector.status}
                connectorIndex={connector.index_name}
              />
            </>
          )}
        </EuiFlexItem>
      </EuiFlexGroup>
    </>
  );
};
