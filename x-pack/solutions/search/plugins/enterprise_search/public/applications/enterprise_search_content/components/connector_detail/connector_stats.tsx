/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { ReactNode } from 'react';

import { useValues } from 'kea';

import {
  EuiBadge,
  EuiButtonEmpty,
  EuiButtonIcon,
  EuiCode,
  EuiCopy,
  EuiFlexGrid,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHealth,
  EuiIcon,
  EuiSplitPanel,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { useKibana } from '@kbn/kibana-react-plugin/public';

import { Connector, ConnectorStatus, ElasticsearchIndex } from '@kbn/search-connectors';
import { EuiIconPlugs } from '@kbn/search-shared-ui';

import { KibanaDeps } from '../../../../../common/types';
import { generateEncodedPath } from '../../../shared/encode_path_params';
import { HttpLogic } from '../../../shared/http';
import { KibanaLogic } from '../../../shared/kibana';
import { EuiButtonEmptyTo, EuiButtonTo } from '../../../shared/react_router_helpers';
import { GetConnectorAgentlessPolicyApiResponse } from '../../api/connector/get_connector_agentless_policy_api_logic';
import {
  CONNECTOR_DETAIL_TAB_PATH,
  CONNECTOR_INTEGRATION_DETAIL_PATH,
  FLEET_AGENT_DETAIL_PATH,
  FLEET_POLICY_DETAIL_PATH,
} from '../../routes';
import {
  connectorStatusToColor,
  connectorStatusToText,
} from '../../utils/connector_status_helpers';

import { AgentlessConnectorStatusBadge } from './agentless_status_badge';
import { ConnectorDetailTabId } from './connector_detail';

export interface ConnectorStatsProps {
  connector: Connector;
  indexData?: ElasticsearchIndex;
  agentlessOverview?: GetConnectorAgentlessPolicyApiResponse;
}

export interface StatCardProps {
  content: ReactNode;
  footer: ReactNode;
  title: string;
}

export const StatCard: React.FC<StatCardProps> = ({ title, content, footer }) => {
  return (
    <EuiSplitPanel.Outer hasShadow={false} hasBorder grow>
      <EuiSplitPanel.Inner>
        <EuiFlexGroup direction="column" gutterSize="s">
          <EuiFlexItem grow={false}>
            <EuiTitle size="xxxs">
              <h4>{title}</h4>
            </EuiTitle>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>{content}</EuiFlexItem>
        </EuiFlexGroup>
      </EuiSplitPanel.Inner>
      <EuiSplitPanel.Inner grow={false} color="subdued">
        {footer}
      </EuiSplitPanel.Inner>
    </EuiSplitPanel.Outer>
  );
};

const seeDocumentsLabel = i18n.translate(
  'xpack.enterpriseSearch.connectors.connectorStats.seeDocumentsTextLabel',
  {
    defaultMessage: 'See documents',
  }
);

const pipelinesLabel = i18n.translate(
  'xpack.enterpriseSearch.connectors.connectorStats.managePipelines',
  {
    defaultMessage: 'Manage pipelines',
  }
);

const configureLabel = i18n.translate(
  'xpack.enterpriseSearch.connectors.connectorStats.configureLink',
  {
    defaultMessage: 'Configure',
  }
);

const noAgentLabel = i18n.translate(
  'xpack.enterpriseSearch.connectors.connectorStats.noAgentFound',
  {
    defaultMessage: 'No agent found',
  }
);

const noPolicyLabel = i18n.translate(
  'xpack.enterpriseSearch.connectors.connectorStats.noPolicyFound',
  {
    defaultMessage: 'No policy found',
  }
);

export const ConnectorStats: React.FC<ConnectorStatsProps> = ({
  connector,
  indexData,
  agentlessOverview,
}) => {
  const { connectorTypes } = useValues(KibanaLogic);
  const {
    services: { discover },
  } = useKibana<KibanaDeps>();
  const { http } = useValues(HttpLogic);
  const connectorDefinition = connectorTypes.find((c) => c.serviceType === connector.service_type);
  const columns = connector.is_native ? 2 : 3;

  const agnetlessPolicyExists = !!agentlessOverview?.policy;
  const agentlessAgentExists = !!agentlessOverview?.agent;

  const navigateToDiscoverPayload = agentlessAgentExists
    ? {
        dataViewId: 'logs-*',
        filters: [
          {
            meta: {
              key: 'labels.connector_id',
              index: 'logs-*',
              type: 'phrase',
              params: connector.id,
            },
            query: {
              match_phrase: {
                'labels.connector_id': connector.id,
              },
            },
          },
          {
            meta: {
              key: 'elastic_agent.id',
              index: 'logs-*',
              type: 'phrase',
              params: connector.id,
            },
            query: {
              match_phrase: {
                'elastic_agent.id': agentlessOverview.agent.id,
              },
            },
          },
        ],
        timeRange: {
          from: 'now-6h',
          to: 'now',
        },
        columns: ['message', 'log.level', 'labels.sync_job_id'],
      }
    : {};

  return (
    <EuiFlexGrid columns={columns} direction="row">
      <EuiFlexItem>
        <StatCard
          title={i18n.translate(
            'xpack.enterpriseSearch.connectors.connectorStats.h4.connectorLabel',
            {
              defaultMessage: 'Connector',
            }
          )}
          content={
            <EuiFlexGroup
              gutterSize="m"
              responsive={false}
              alignItems="center"
              justifyContent="spaceBetween"
            >
              {connectorDefinition && connectorDefinition.iconPath && (
                <EuiFlexItem grow={false}>
                  <EuiIcon type={connectorDefinition.iconPath} size="xl" />
                </EuiFlexItem>
              )}
              <EuiFlexItem>
                <EuiText>
                  <p>{connectorDefinition?.name ?? '-'}</p>
                </EuiText>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiBadge color={connectorStatusToColor(connector)}>
                  {connectorStatusToText(connector)}
                </EuiBadge>
              </EuiFlexItem>
            </EuiFlexGroup>
          }
          footer={
            <EuiFlexGroup alignItems="center" justifyContent="spaceBetween">
              <EuiFlexItem grow={false}>
                <EuiFlexGroup alignItems="center" gutterSize="xs">
                  <EuiFlexItem grow={false}>
                    <EuiText size="s">
                      <FormattedMessage
                        id="xpack.enterpriseSearch.connectors.connectorStats.connectorIdLabel"
                        defaultMessage="ID: {connectorId}"
                        values={{
                          connectorId: <EuiCode>{connector.id}</EuiCode>,
                        }}
                      />
                    </EuiText>
                  </EuiFlexItem>
                  <EuiFlexItem grow={false}>
                    <EuiCopy textToCopy={connector.id}>
                      {(copy) => (
                        <EuiButtonIcon
                          onClick={copy}
                          color="text"
                          iconType="copyClipboard"
                          aria-label={i18n.translate(
                            'xpack.enterpriseSearch.connectors.connectorStats.copyConnectorIdButton',
                            {
                              defaultMessage: 'Copy Connector ID',
                            }
                          )}
                          data-test-subj="copyConnectorIdButton"
                        />
                      )}
                    </EuiCopy>
                  </EuiFlexItem>
                </EuiFlexGroup>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                {[ConnectorStatus.CONNECTED, ConnectorStatus.CONFIGURED].includes(
                  connector.status
                ) && connector.index_name ? (
                  <EuiButtonEmptyTo
                    size="s"
                    to={generateEncodedPath(CONNECTOR_DETAIL_TAB_PATH, {
                      connectorId: connector.id,
                      tabId: ConnectorDetailTabId.CONFIGURATION,
                    })}
                  >
                    {configureLabel}
                  </EuiButtonEmptyTo>
                ) : (
                  <EuiButtonTo
                    color="primary"
                    size="s"
                    fill
                    to={generateEncodedPath(CONNECTOR_DETAIL_TAB_PATH, {
                      connectorId: connector.id,
                      tabId: ConnectorDetailTabId.CONFIGURATION,
                    })}
                  >
                    {configureLabel}
                  </EuiButtonTo>
                )}
              </EuiFlexItem>
            </EuiFlexGroup>
          }
        />
      </EuiFlexItem>
      <EuiFlexItem>
        <StatCard
          title={i18n.translate('xpack.enterpriseSearch.connectors.connectorStats.indexTitle', {
            defaultMessage: 'Attached index',
          })}
          content={
            connector.index_name ? (
              indexData ? (
                <EuiFlexGroup justifyContent="spaceBetween">
                  <EuiFlexItem grow={false}>
                    <EuiBadge>{connector.index_name}</EuiBadge>
                  </EuiFlexItem>
                  <EuiFlexItem grow={false}>
                    {/* TODO: Are we not getting the real Index health status?  */}
                    <EuiHealth color="success">
                      <EuiText size="s">
                        {i18n.translate('xpack.enterpriseSearch.content.conectors.indexHealth', {
                          defaultMessage: 'Healthy',
                        })}
                      </EuiText>
                    </EuiHealth>
                  </EuiFlexItem>
                </EuiFlexGroup>
              ) : (
                <EuiText size="s" color="warning">
                  {i18n.translate(
                    'xpack.enterpriseSearch.connectors.connectorStats.indexDoesntExistLabel',
                    {
                      defaultMessage: "Index doesn't exist",
                    }
                  )}
                </EuiText>
              )
            ) : (
              <EuiText size="s" color="danger">
                {i18n.translate('xpack.enterpriseSearch.connectors.connectorStats.noIndexLabel', {
                  defaultMessage: 'No index attached yet',
                })}
              </EuiText>
            )
          }
          footer={
            <EuiFlexGroup justifyContent="spaceBetween" alignItems="center">
              <EuiFlexItem>
                <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
                  <EuiFlexItem grow={false}>
                    <EuiIcon type="documents" />
                  </EuiFlexItem>
                  <EuiFlexItem grow={false}>
                    <EuiText size="s">
                      <p>
                        {i18n.translate(
                          'xpack.enterpriseSearch.connectors.connectorStats.p.DocumentsLabel',
                          {
                            defaultMessage: '{documentAmount} Documents',
                            values: {
                              documentAmount: indexData?.count ?? 0,
                            },
                          }
                        )}
                      </p>
                    </EuiText>
                  </EuiFlexItem>
                </EuiFlexGroup>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiButtonEmptyTo
                  isDisabled={!(connector.index_name && indexData)}
                  size="s"
                  to={generateEncodedPath(CONNECTOR_DETAIL_TAB_PATH, {
                    connectorId: connector.id,
                    tabId: ConnectorDetailTabId.DOCUMENTS,
                  })}
                >
                  {seeDocumentsLabel}
                </EuiButtonEmptyTo>
              </EuiFlexItem>
            </EuiFlexGroup>
          }
        />
      </EuiFlexItem>
      <EuiFlexItem>
        <StatCard
          title={i18n.translate('xpack.enterpriseSearch.connectors.connectorStats.pipelinesTitle', {
            defaultMessage: 'Pipelines',
          })}
          content={
            connector.pipeline ? (
              <EuiFlexGroup>
                <EuiFlexItem grow={false}>
                  <EuiBadge>{connector.pipeline.name}</EuiBadge>
                </EuiFlexItem>
              </EuiFlexGroup>
            ) : (
              i18n.translate('xpack.enterpriseSearch.connectors.connectorStats.noPipelineText', {
                defaultMessage: 'None',
              })
            )
          }
          footer={
            <EuiFlexGroup justifyContent="flexEnd">
              <EuiFlexItem grow={false}>
                <EuiButtonEmptyTo
                  isDisabled={!connector.index_name}
                  size="s"
                  to={generateEncodedPath(CONNECTOR_DETAIL_TAB_PATH, {
                    connectorId: connector.id,
                    tabId: ConnectorDetailTabId.PIPELINES,
                  })}
                >
                  {pipelinesLabel}
                </EuiButtonEmptyTo>
              </EuiFlexItem>
            </EuiFlexGroup>
          }
        />
      </EuiFlexItem>
      {connector.is_native && (
        <EuiFlexItem>
          <StatCard
            title={i18n.translate(
              'xpack.enterpriseSearch.connectors.connectorStats.integrationTitle',
              {
                defaultMessage: 'Integration',
              }
            )}
            content={
              <EuiFlexGroup justifyContent="spaceBetween" alignItems="center">
                <EuiFlexItem grow={false}>
                  <EuiButtonEmpty
                    isDisabled={!connector.service_type}
                    iconType={EuiIconPlugs}
                    color="text"
                    href={http.basePath.prepend(
                      generateEncodedPath(CONNECTOR_INTEGRATION_DETAIL_PATH, {
                        serviceType: connector.service_type || '',
                      })
                    )}
                  >
                    Elastic Connectors
                  </EuiButtonEmpty>
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  {agentlessAgentExists ? (
                    <AgentlessConnectorStatusBadge status={agentlessOverview?.agent.status} />
                  ) : (
                    <EuiBadge color="warning">{noAgentLabel}</EuiBadge>
                  )}
                </EuiFlexItem>
              </EuiFlexGroup>
            }
            footer={
              <EuiFlexGroup justifyContent="spaceBetween" alignItems="center">
                <EuiFlexItem grow={false}>
                  <EuiButtonEmpty
                    data-test-subj="connectorStatsViewLogsButton"
                    aria-label={i18n.translate(
                      'xpack.enterpriseSearch.connectors.connectorStats.viewLogsButtonLabel',
                      { defaultMessage: 'View logs' }
                    )}
                    disabled={!agentlessAgentExists}
                    iconType="discoverApp"
                    onClick={() => {
                      discover.locator?.navigate(navigateToDiscoverPayload);
                    }}
                  >
                    {i18n.translate(
                      'xpack.enterpriseSearch.connectors.connectorStats.viewLogsButtonLabel',
                      { defaultMessage: 'View logs' }
                    )}
                  </EuiButtonEmpty>
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  {agentlessAgentExists && (
                    <EuiButtonEmpty
                      isDisabled={!agentlessOverview || !agentlessOverview.agent.id}
                      size="s"
                      href={http.basePath.prepend(
                        generateEncodedPath(FLEET_AGENT_DETAIL_PATH, {
                          agentId: agentlessOverview.agent.id,
                        })
                      )}
                    >
                      {i18n.translate(
                        'xpack.enterpriseSearch.connectors.connectorStats.hostOverview',
                        {
                          defaultMessage: 'Host overview',
                        }
                      )}
                    </EuiButtonEmpty>
                  )}
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  {agnetlessPolicyExists ? (
                    <EuiButtonEmpty
                      isDisabled={!agentlessOverview || !agentlessOverview.policy.id}
                      size="s"
                      href={http.basePath.prepend(
                        generateEncodedPath(FLEET_POLICY_DETAIL_PATH, {
                          policyId: agentlessOverview.policy.id,
                        })
                      )}
                    >
                      {i18n.translate(
                        'xpack.enterpriseSearch.connectors.connectorStats.managePolicy',
                        {
                          defaultMessage: 'Manage policy',
                        }
                      )}
                    </EuiButtonEmpty>
                  ) : (
                    <EuiText size="s" color="warning">
                      {noPolicyLabel}
                    </EuiText>
                  )}
                </EuiFlexItem>
              </EuiFlexGroup>
            }
          />
        </EuiFlexItem>
      )}
    </EuiFlexGrid>
  );
};
