/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import {
  EuiEmptyPrompt,
  EuiFlexItem,
  EuiFlexGroup,
  EuiText,
  EuiButton,
  EuiLink,
  EuiPanel,
  EuiTitle,
} from '@elastic/eui';
import { Connector } from '@kbn/search-connectors';

import { docLinks } from '../../../../common/doc_links';

import { APIIndexEmptyPrompt } from './api_empty_prompt';
import { ConnectorIndexEmptyPrompt } from './connector_empty_prompt';
import { ConnectorSetupEmptyPrompt } from './connector_setup_prompt';

enum EmptyPromptView {
  Default,
  NewConnector,
  API,
  SetupConnector,
}

export interface OverviewEmptyPromptProps {
  indexName: string;
  connector?: Connector;
}

export const OverviewEmptyPrompt = ({ connector, indexName }: OverviewEmptyPromptProps) => {
  const isConnectorIndex = !!connector;
  const [currentView, setView] = React.useState<EmptyPromptView>(
    isConnectorIndex ? EmptyPromptView.SetupConnector : EmptyPromptView.Default
  );
  if (currentView === EmptyPromptView.SetupConnector) {
    return <ConnectorSetupEmptyPrompt indexName={indexName} connector={connector!} />;
  }
  if (currentView === EmptyPromptView.NewConnector) {
    return (
      <ConnectorIndexEmptyPrompt
        indexName={indexName}
        onBackClick={() => setView(EmptyPromptView.Default)}
      />
    );
  }
  if (currentView === EmptyPromptView.API) {
    return (
      <APIIndexEmptyPrompt
        indexName={indexName}
        onBackClick={() => setView(EmptyPromptView.Default)}
      />
    );
  }

  return (
    <EuiPanel>
      <EuiEmptyPrompt
        iconType="logstashInput"
        title={
          <EuiTitle size="xs">
            <h5>
              <FormattedMessage
                id="xpack.serverlessSearch.indexManagement.indexDetails.overview.emptyPrompt.title"
                defaultMessage="Start ingesting data"
              />
            </h5>
          </EuiTitle>
        }
        body={
          <EuiText>
            <p>
              <FormattedMessage
                id="xpack.serverlessSearch.indexManagement.indexDetails.overview.emptyPrompt.body"
                defaultMessage="Populate your index with data using {logstashLink}, {beatsLink}, {connectorsLink}, or RESTful {apiCallsLink}."
                values={{
                  logstashLink: (
                    <EuiLink
                      data-test-subj="serverlessSearchIndexDetailOverviewLogstashLink"
                      target="_blank"
                      external={false}
                      href={docLinks.logstash}
                    >
                      {i18n.translate(
                        'xpack.serverlessSearch.indexManagement.indexDetails.overview.emptyPrompt.body.logstashLink',
                        { defaultMessage: 'Logstash' }
                      )}
                    </EuiLink>
                  ),
                  beatsLink: (
                    <EuiLink
                      data-test-subj="serverlessSearchIndexDetailOverviewBeatsLink"
                      target="_blank"
                      external={false}
                      href={docLinks.beats}
                    >
                      {i18n.translate(
                        'xpack.serverlessSearch.indexManagement.indexDetails.overview.emptyPrompt.body.beatsLink',
                        { defaultMessage: 'Beats' }
                      )}
                    </EuiLink>
                  ),
                  connectorsLink: (
                    <EuiLink
                      data-test-subj="serverlessSearchIndexDetailOverviewConnectorsLink"
                      target="_blank"
                      external={false}
                      href={docLinks.connectors}
                    >
                      {i18n.translate(
                        'xpack.serverlessSearch.indexManagement.indexDetails.overview.emptyPrompt.body.connectorsLink',
                        { defaultMessage: 'connectors' }
                      )}
                    </EuiLink>
                  ),
                  apiCallsLink: (
                    <EuiLink
                      data-test-subj="serverlessSearchIndexDetailOverviewAPICallsLink"
                      target="_blank"
                      external={false}
                      href={docLinks.apiIntro}
                    >
                      {i18n.translate(
                        'xpack.serverlessSearch.indexManagement.indexDetails.overview.emptyPrompt.body.apiCallsLink',
                        { defaultMessage: 'API calls' }
                      )}
                    </EuiLink>
                  ),
                }}
              />
            </p>
          </EuiText>
        }
        actions={
          <EuiFlexGroup alignItems="center" justifyContent="center">
            <EuiFlexItem grow={false}>
              <EuiButton
                data-test-subj="serverlessSearchIndexDetailOverviewAddViaApiButton"
                onClick={() => setView(EmptyPromptView.API)}
              >
                <FormattedMessage
                  id="xpack.serverlessSearch.indexManagement.indexDetails.overview.emptyPrompt.actions.addViaAPI"
                  defaultMessage="Add via API"
                />
              </EuiButton>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiButton
                data-test-subj="serverlessSearchIndexDetailOverviewAddViaConnectorButton"
                onClick={() => setView(EmptyPromptView.NewConnector)}
              >
                <FormattedMessage
                  id="xpack.serverlessSearch.indexManagement.indexDetails.overview.emptyPrompt.actions.addViaConnector"
                  defaultMessage="Add via Connector"
                />
              </EuiButton>
            </EuiFlexItem>
          </EuiFlexGroup>
        }
      />
    </EuiPanel>
  );
};
