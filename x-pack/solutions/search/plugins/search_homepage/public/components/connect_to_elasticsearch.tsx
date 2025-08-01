/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import {
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
import { useElasticsearchUrl } from '../hooks/use_elasticsearch_url';
import { ApiKeyForm } from './api_key_form';

export const ConnectToElasticsearch = () => {
  const elasticsearchUrl = useElasticsearchUrl();

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
                    <ApiKeyForm data-test-subj="apiKeyForm" />
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
