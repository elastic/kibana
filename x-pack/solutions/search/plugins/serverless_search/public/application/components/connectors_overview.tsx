/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButton,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLink,
  EuiPageTemplate,
  EuiText,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import React, { useMemo } from 'react';

import { GithubLink } from '@kbn/search-api-panels';
import { SelfManagedConnectorsEmptyPrompt } from './connectors/self_managed_connectors_empty_prompt';
import { docLinks } from '../../../common/doc_links';
import { LEARN_MORE_LABEL } from '../../../common/i18n_string';
import { useConnectors } from '../hooks/api/use_connectors';
import { useCreateConnector } from '../hooks/api/use_create_connector';
import { useKibanaServices } from '../hooks/use_kibana';
import { ConnectorsTable } from './connectors/connectors_table';
import { ConnectorPrivilegesCallout } from './connectors/connector_config/connector_privileges_callout';
import { useAssetBasePath } from '../hooks/use_asset_base_path';

export const ConnectorsOverview = () => {
  const { data, isLoading: connectorsLoading } = useConnectors();
  const { console: consolePlugin } = useKibanaServices();
  const { createConnector, isLoading } = useCreateConnector();
  const embeddableConsole = useMemo(
    () => (consolePlugin?.EmbeddableConsole ? <consolePlugin.EmbeddableConsole /> : null),
    [consolePlugin]
  );
  const canManageConnectors = !data || data.canManageConnectors;

  const assetBasePath = useAssetBasePath();

  return (
    <EuiPageTemplate offset={0} grow restrictWidth data-test-subj="svlSearchConnectorsPage">
      <EuiPageTemplate.Header
        pageTitle={i18n.translate('xpack.serverlessSearch.connectors.title', {
          defaultMessage: 'Connectors',
        })}
        data-test-subj="serverlessSearchConnectorsTitle"
        restrictWidth
        rightSideItems={
          connectorsLoading || (data?.connectors || []).length > 0
            ? [
                <EuiFlexGroup direction="row" alignItems="center" justifyContent="center">
                  <EuiFlexItem>
                    <GithubLink
                      href={'https://github.com/elastic/connectors'}
                      label={i18n.translate('xpack.serverlessSearch.connectorsPythonLink', {
                        defaultMessage: 'elastic/connectors',
                      })}
                      assetBasePath={assetBasePath}
                      data-test-subj="serverlessSearchConnectorsOverviewElasticConnectorsLink"
                    />
                  </EuiFlexItem>
                  <EuiFlexItem>
                    <EuiButton
                      data-test-subj="serverlessSearchConnectorsOverviewCreateConnectorButton"
                      disabled={!canManageConnectors}
                      isLoading={isLoading}
                      fill
                      iconType="plusInCircleFilled"
                      onClick={() => createConnector()}
                    >
                      {i18n.translate('xpack.serverlessSearch.connectors.createConnector', {
                        defaultMessage: 'Create connector',
                      })}
                    </EuiButton>
                  </EuiFlexItem>
                </EuiFlexGroup>,
              ]
            : undefined
        }
      >
        <EuiText>
          <p>
            <FormattedMessage
              id="xpack.serverlessSearch.connectors.headerContent"
              defaultMessage="Sync third-party data sources to Elasticsearch, by deploying Elastic connectors on your own infrastructure. {learnMoreLink}"
              values={{
                learnMoreLink: (
                  <EuiLink
                    data-test-subj="serverlessSearchConnectorsOverviewLink"
                    target="_blank"
                    href={docLinks.connectors}
                  >
                    {LEARN_MORE_LABEL}
                  </EuiLink>
                ),
              }}
            />
          </p>
        </EuiText>
      </EuiPageTemplate.Header>
      <EuiPageTemplate.Section restrictWidth color="subdued">
        <ConnectorPrivilegesCallout />
        {connectorsLoading || (data?.connectors || []).length > 0 ? (
          <ConnectorsTable />
        ) : (
          <SelfManagedConnectorsEmptyPrompt />
        )}
      </EuiPageTemplate.Section>
      {embeddableConsole}
    </EuiPageTemplate>
  );
};
