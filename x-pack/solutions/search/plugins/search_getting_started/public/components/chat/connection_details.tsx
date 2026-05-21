/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { EuiBadge, EuiBadgeGroup, EuiFlexGroup, EuiFlexItem, EuiTitle } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import { ApiKeyForm } from '@kbn/search-api-keys-components';
import { FormInfoField } from '@kbn/search-shared-ui';
import { useElasticsearchUrl } from '../../hooks/use_elasticsearch_url';
import { useAgentBuilderMcpUrl } from '../../hooks/use_mcp_url';

enum UrlView {
  elasticsearch = 'elasticsearch',
  mcp = 'mcp',
}

export const ChatElasticsearchConnectionDetails = () => {
  const [urlView, setUrlView] = useState<UrlView>(UrlView.elasticsearch);
  const elasticsearchUrl = useElasticsearchUrl();
  const mcpServerUrl = useAgentBuilderMcpUrl();

  return (
    <EuiFlexGroup direction="column">
      <EuiFlexItem>
        <EuiTitle size="xxs">
          <h5>
            {i18n.translate(
              'xpack.search.gettingStarted.chat.elasticsearchConnectionDetails.serverless.title',
              {
                defaultMessage: 'Connector to your project',
              }
            )}
          </h5>
        </EuiTitle>
      </EuiFlexItem>
      <EuiFlexItem>
        <EuiBadgeGroup
          role="group"
          aria-label={i18n.translate(
            'xpack.search.gettingStarted.chat.elasticsearchConnectionDetails.urlSelectBadgeGroup.aria',
            {
              defaultMessage: 'Select endpoint type',
            }
          )}
        >
          <EuiBadge
            color={urlView !== UrlView.elasticsearch ? 'hollow' : 'default'}
            onClick={() => setUrlView(UrlView.elasticsearch)}
            data-test-subj="viewElasticsearchUrlBtn"
            onClickAriaLabel={i18n.translate(
              'xpack.search.gettingStarted.chat.elasticsearchConnectionDetails.urlSelectBadge.elasticsearch.aria',
              {
                defaultMessage: 'View the elasticsearch endpoint url',
              }
            )}
          >
            {i18n.translate(
              'xpack.search.gettingStarted.chat.elasticsearchConnectionDetails.urlSelectBadge.elasticsearch',
              {
                defaultMessage: 'Elasticsearch',
              }
            )}
          </EuiBadge>
          <EuiBadge
            color={urlView !== UrlView.mcp ? 'hollow' : 'default'}
            onClick={() => setUrlView(UrlView.mcp)}
            data-test-subj="viewMCPUrlBtn"
            onClickAriaLabel={i18n.translate(
              'xpack.search.gettingStarted.chat.elasticsearchConnectionDetails.urlSelectBadge.mcp.aria',
              {
                defaultMessage: 'View the model context protocol server url',
              }
            )}
          >
            {i18n.translate(
              'xpack.search.gettingStarted.chat.elasticsearchConnectionDetails.urlSelectBadge.mcp',
              {
                defaultMessage: 'MCP',
              }
            )}
          </EuiBadge>
        </EuiBadgeGroup>
      </EuiFlexItem>
      <EuiFlexItem>
        {urlView === UrlView.elasticsearch && (
          <FormInfoField
            value={elasticsearchUrl}
            copyValue={elasticsearchUrl}
            dataTestSubj="endpointValueField"
            copyValueDataTestSubj="copyEndpointButton"
          />
        )}
        {urlView === UrlView.mcp && (
          <FormInfoField
            value={mcpServerUrl}
            copyValue={mcpServerUrl}
            dataTestSubj="mcpEndpointValueField"
            copyValueDataTestSubj="copyMcpEndpointButton"
          />
        )}
      </EuiFlexItem>
      <EuiFlexItem>
        <ApiKeyForm />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
