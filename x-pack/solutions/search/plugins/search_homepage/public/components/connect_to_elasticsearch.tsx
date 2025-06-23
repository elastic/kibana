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
import { useElasticsearchUrl } from '../hooks/use_elasticsearch_url';

export const ConnectToElasticsearch = () => {
  const { share } = useKibana().services;
  const { data } = useGetApiKeys();
  const elasticsearchUrl = useElasticsearchUrl();
  const locator = share?.url?.locators.get('MANAGEMENT_APP_LOCATOR');
  const manageKeysLink = locator?.useUrl({ sectionId: 'security', appId: 'api_keys' });
  const createApiKeyLink = locator?.useUrl({ sectionId: 'security', appId: 'api_keys/create' });

  return (
    <EuiFlexGroup gutterSize="xl">
      <EuiFlexItem grow={3}>
        <EuiFlexGroup direction="column" gutterSize="l">
          <EuiFlexItem grow={false}>
            <EuiFlexGroup direction="column" gutterSize="s">
              <EuiFlexItem>
                <EuiTitle size="m">
                  <h2>
                    {i18n.translate('xpack.searchHomepage.connectToElasticsearch.title', {
                      defaultMessage: 'Connect to Elasticsearch',
                    })}
                  </h2>
                </EuiTitle>
              </EuiFlexItem>
              <EuiFlexItem>
                <EuiText grow={false} color="subdued">
                  <p>
                    {i18n.translate('xpack.searchHomepage.connectToElasticsearch.description', {
                      defaultMessage:
                        'Set up your connection to Elasticsearch to start searching and analyzing your data.',
                    })}
                  </p>
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
                        <EuiCopy textToCopy={elasticsearchUrl}>
                          {(copy) => (
                            <EuiButtonIcon
                              aria-label={i18n.translate(
                                'xpack.searchHomepage.connectToElasticsearch.copyElasticsearchUrlAriaLabel',
                                { defaultMessage: 'Copy Elasticsearch URL' }
                              )}
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
                          value={elasticsearchUrl}
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
                            defaultMessage: 'API keys',
                          }
                        )}
                      </span>
                    </EuiTitle>
                  </EuiFlexItem>
                  <EuiFlexItem grow={false}>
                    <EuiFlexGroup gutterSize="s" alignItems="baseline">
                      <EuiFlexItem grow={false}>
                        <EuiButton
                          href={createApiKeyLink}
                          iconType="key"
                          data-test-subj="createApiKeyButton"
                        >
                          {i18n.translate(
                            'xpack.searchHomepage.connectToElasticsearch.createApiKey',
                            {
                              defaultMessage: 'Create API key',
                            }
                          )}
                        </EuiButton>
                      </EuiFlexItem>
                      <EuiFlexItem grow={false}>
                        <EuiButtonEmpty
                          iconType="gear"
                          href={manageKeysLink}
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
      <EuiFlexItem grow={1}>
        <ConnectToElasticsearchSidePanel />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
