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

const LOCALHOST_URL = 'http://localhost:9200/';

export const ConnectToElasticsearch = () => {
  return (
    <>
      <EuiFlexGroup>
        <EuiFlexItem>
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
            <EuiFlexItem>
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
                              <EuiButtonIcon onClick={copy} iconType="copyClipboard" size="m" />
                            )}
                          </EuiCopy>
                        </EuiFlexItem>
                        <EuiFlexItem grow={false}>
                          <EuiFieldText value={LOCALHOST_URL} readOnly style={{ width: 400 }} />
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
                          <EuiButton iconType="key">
                            {i18n.translate(
                              'xpack.searchHomepage.connectToElasticsearch.createApiKey',
                              {
                                defaultMessage: 'Create API Key',
                              }
                            )}
                          </EuiButton>
                        </EuiFlexItem>
                        <EuiFlexItem grow={false}>
                          <EuiButtonEmpty iconType="gear">Manage API keys</EuiButtonEmpty>
                        </EuiFlexItem>
                        <EuiFlexItem grow={false}>
                          <EuiBadge color="warning">0 active</EuiBadge>
                        </EuiFlexItem>
                      </EuiFlexGroup>
                    </EuiFlexItem>
                  </EuiFlexGroup>
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
        <EuiFlexItem grow={false} style={{ maxWidth: 430 }}>
          <ConnectToElasticsearchSidePanel />
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiHorizontalRule />
    </>
  );
};
