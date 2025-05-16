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
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiTitle,
  EuiCode,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { Connector, ConnectorStatus } from '@kbn/search-connectors';
import React, { useState } from 'react';
import { useQueryClient, useMutation } from '@tanstack/react-query';
import { FormattedMessage } from '@kbn/i18n-react';
import { isValidIndexName } from '../../../../utils/validate_index_name';
import { SAVE_LABEL } from '../../../../../common/i18n_string';
import { useConnector } from '../../../hooks/api/use_connector';
import { useKibanaServices } from '../../../hooks/use_kibana';
import { ApiKeyPanel } from './api_key_panel';
import { ConnectorIndexNameForm } from './connector_index_name_form';
import { SyncScheduledCallOut } from './sync_scheduled_callout';
import { docLinks } from '../../../../../common/doc_links';
import { DEFAULT_INGESTION_PIPELINE } from '../../../../../common';
interface ConnectorIndexNameProps {
  connector: Connector;
  isDisabled?: boolean;
}

export const ConnectorIndexName: React.FC<ConnectorIndexNameProps> = ({
  connector,
  isDisabled,
}) => {
  const { http } = useKibanaServices();
  const queryClient = useQueryClient();
  const { queryKey } = useConnector(connector.id);
  const [showSyncCallOut, setShowSyncCallOut] = useState(false);
  const { data, isLoading, mutate } = useMutation({
    mutationFn: async ({ inputName, sync }: { inputName: string | null; sync?: boolean }) => {
      setShowSyncCallOut(false);
      if (inputName && inputName !== connector.index_name) {
        const body = { index_name: inputName };
        await http.post(`/internal/serverless_search/connectors/${connector.id}/index_name`, {
          body: JSON.stringify(body),
        });
      }
      if (sync) {
        await http.post(`/internal/serverless_search/connectors/${connector.id}/sync`);
        setShowSyncCallOut(true);
      }
      return inputName;
    },
    onSuccess: () => {
      queryClient.setQueryData(queryKey, { connector: { ...connector, index_name: data } });
      queryClient.invalidateQueries(queryKey);
    },
  });

  const [newIndexName, setNewIndexname] = useState(connector.index_name);

  return (
    <>
      <EuiFlexGroup direction="column" alignItems="center" justifyContent="center">
        <EuiFlexItem>
          <EuiTitle size="s">
            <h2>
              {i18n.translate('xpack.serverlessSearch.connectors.config.connectorIndexNameTitle', {
                defaultMessage: 'Link index',
              })}
            </h2>
          </EuiTitle>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiText color="subdued">
            {i18n.translate(
              'xpack.serverlessSearch.connectors.config.connectorIndexNameDescription',
              {
                defaultMessage:
                  'Pick an index where your documents will be synced, or create a new one for this connector.',
              }
            )}
          </EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer />
      <ConnectorIndexNameForm
        isDisabled={isDisabled}
        indexName={newIndexName || ''}
        onChange={(name) => setNewIndexname(name)}
      />
      <EuiSpacer />
      <EuiPanel hasBorder>
        <EuiFlexGroup direction="column" justifyContent="spaceBetween">
          <EuiFlexItem grow={false}>
            <EuiTitle size="s">
              <h3>
                {i18n.translate('xpack.serverlessSearch.connectors.config.preprocessData.title', {
                  defaultMessage: 'Preprocess your data',
                })}
              </h3>
            </EuiTitle>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiText>
              <p>
                <FormattedMessage
                  id="xpack.serverlessSearch.connectors.config.preprocessData.description"
                  defaultMessage="Use ingest pipelines to preprocess data before indexing into Elasticsearch. Note that self-managed connectors use the {clientIngestionPipeline} pipeline for preprocessing."
                  values={{
                    clientIngestionPipeline: <EuiCode>{DEFAULT_INGESTION_PIPELINE}</EuiCode>,
                  }}
                />
              </p>
            </EuiText>
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiText>
              <p>
                <EuiLink
                  data-test-subj="serverlessSearchConnectorIndexNameLearnMoreLink"
                  href={docLinks.pipelines}
                  target="_blank"
                >
                  {i18n.translate(
                    'xpack.serverlessSearch.connectors.config.preprocessDataTitle.learnMore',
                    {
                      defaultMessage: 'Learn More',
                    }
                  )}
                </EuiLink>
              </p>
            </EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiPanel>
      <EuiSpacer />
      <ApiKeyPanel connector={connector} />
      <EuiSpacer />
      <EuiFlexGroup>
        <EuiFlexItem grow={false}>
          <span>
            <EuiButton
              data-test-subj="serverlessSearchConnectorIndexNameButton"
              color="primary"
              isDisabled={!isValidIndexName(newIndexName) || isDisabled}
              isLoading={isLoading}
              onClick={() => mutate({ inputName: newIndexName, sync: false })}
            >
              {SAVE_LABEL}
            </EuiButton>
          </span>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <span>
            <EuiButton
              data-test-subj="serverlessSearchConnectorIndexNameSaveAndSyncButton"
              color="primary"
              disabled={
                !(
                  isValidIndexName(newIndexName) &&
                  [ConnectorStatus.CONFIGURED, ConnectorStatus.CONNECTED].includes(connector.status)
                ) || isDisabled
              }
              fill
              isLoading={isLoading}
              onClick={() => mutate({ inputName: newIndexName, sync: true })}
            >
              {i18n.translate('xpack.serverlessSearch.connectors.config.saveSyncLabel', {
                defaultMessage: 'Save and sync',
              })}
            </EuiButton>
          </span>
        </EuiFlexItem>
      </EuiFlexGroup>
      {showSyncCallOut && (
        <>
          <EuiSpacer />
          <SyncScheduledCallOut />
        </>
      )}
    </>
  );
};
