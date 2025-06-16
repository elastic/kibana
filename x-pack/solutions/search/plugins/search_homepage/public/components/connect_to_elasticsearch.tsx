/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import {
  EuiBadge,
  EuiButton,
  EuiButtonEmpty,
  EuiButtonIcon,
  EuiCopy,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import React from 'react';

import { i18n } from '@kbn/i18n';
import { ConnectToElasticsearchSidePanel } from './connect_to_elasticsearch_side_panel';
import { AISearchCapabilities } from './ai_search_capabilities/ai_search_capabilities';
import { useKibana } from '../hooks/use_kibana';
import { useGetApiKeys } from '../hooks/api/use_api_key';

const LOCALHOST_URL = 'http://localhost:9200/';
const MANAGEMENT_API_KEYS = '/app/management/security/api_keys';
const CREATE_API_KEY = '/app/management/security/api_keys/create';

export const ConnectToElasticsearch = () => {
  const { http } = useKibana().services;
  const { data } = useGetApiKeys();

  return (
    <EuiFlexGroup>
      <EuiFlexItem grow={false}>
        <EuiFlexGroup direction="column" gutterSize="l">
          <EuiFlexItem grow={false}>
            <EuiFlexGroup direction="column" gutterSize="s">
              <EuiFlexItem grow={false}>
                <EuiTitle size="m">
                  <span>
                    {i18n.translate('xpack.searchHomepage.connectToElasticsearch.title', {
                      defaultMessage: 'Connect to Elasticsearch',
                    })}
                  </span>
                </EuiTitle>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiText>
                  {i18n.translate('xpack.searchHomepage.connectToElasticsearch.description', {
                    defaultMessage:
                      'Set up your connection to Elasticsearch to start searching and analyzing your data.',
                  })}
                </EuiText>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiFlexGroup alignItems="flexStart" gutterSize="l">
              <EuiFlexItem grow={false}>
                <EuiFlexGroup direction="column" gutterSize="s">
                  <EuiFlexItem grow={false}>
                    <EuiTitle size="xxs">
                      <span>
                        {i18n.translate(
                          'xpack.searchHomepage.connectToElasticsearch.elasticSearchEndpointLabel',
                          {
                            defaultMessage: 'Elasticsearch endpoint',
                          }
                        )}
                      </span>
                    </EuiTitle>
                  </EuiFlexItem>
                  <EuiFlexItem grow={false}>
                    <EuiFlexGroup gutterSize="s">
                      <EuiFlexItem grow={false}>
                        <EuiCopy textToCopy={LOCALHOST_URL}>
                          {(copy) => (
                            <EuiButtonIcon
                              onClick={copy}
                              iconType="copyClipboard"
                              size="m"
                              data-test-subj="copyEndpointButton"
                            />
                          )}
                        </EuiCopy>
                      </EuiFlexItem>
                      <EuiFlexItem grow={false}>
                        <EuiFieldText
                          value={LOCALHOST_URL}
                          readOnly
                          data-test-subj="endpointValueField"
                        />
                      </EuiFlexItem>
                    </EuiFlexGroup>
                  </EuiFlexItem>
                </EuiFlexGroup>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiFlexGroup direction="column" gutterSize="s">
                  <EuiFlexItem grow={false}>
                    <EuiTitle size="xxs">
                      <span>
                        {i18n.translate(
                          'xpack.searchHomepage.connectToElasticsearch.apiKeysLabel',
                          {
                            defaultMessage: 'API Keys',
                          }
                        )}
                      </span>
                    </EuiTitle>
                  </EuiFlexItem>
                  <EuiFlexItem grow={false}>
                    <EuiFlexGroup gutterSize="s" alignItems="baseline">
                      <EuiFlexItem grow={false}>
                        <EuiButton
                          href={http.basePath.prepend(CREATE_API_KEY)}
                          iconType="key"
                          data-test-subj="createApiKeyButton"
                        >
                          {i18n.translate(
                            'xpack.searchHomepage.connectToElasticsearch.createApiKey',
                            {
                              defaultMessage: 'Create API Key',
                            }
                          )}
                        </EuiButton>
                      </EuiFlexItem>
                      <EuiFlexItem grow={false}>
                        <EuiButtonEmpty
                          iconType="gear"
                          href={http.basePath.prepend(MANAGEMENT_API_KEYS)}
                          data-test-subj="manageApiKeysButton"
                        >
                          Manage API keys
                        </EuiButtonEmpty>
                      </EuiFlexItem>
                      <EuiFlexItem grow={false}>
                        <EuiBadge
                          data-test-subj="activeApiKeysBadge"
                          color={(data?.apiKeys?.length ?? 0) > 0 ? 'success' : 'warning'}
                        >
                          {data?.apiKeys?.length ?? 0} active
                        </EuiBadge>
                      </EuiFlexItem>
                    </EuiFlexGroup>
                  </EuiFlexItem>
                </EuiFlexGroup>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiHorizontalRule />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <AISearchCapabilities />
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <ConnectToElasticsearchSidePanel />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
