/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import {
  EuiTitle,
  EuiText,
  EuiHorizontalRule,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFieldText,
  EuiCopy,
  EuiButtonIcon,
  EuiButton,
  EuiButtonEmpty,
  EuiBadge,
} from '@elastic/eui';

import { i18n } from '@kbn/i18n';

const LOCALHOST_URL = 'http://localhost:9200/';

export const ConnectToElasticsearch = () => {
  return (
    <>
      <EuiFlexGroup direction="column" gutterSize="m">
        <EuiFlexItem>
          <EuiTitle size="m">
            <span>
              {i18n.translate('xpack.searchHomepage.connectToElasticsearch.title', {
                defaultMessage: 'Connect to Elasticsearch',
              })}
            </span>
          </EuiTitle>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiText>
            {i18n.translate('xpack.searchHomepage.connectToElasticsearch.description', {
              defaultMessage:
                'Set up your connection to Elasticsearch to start searching and analyzing your data.',
            })}
          </EuiText>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiFlexGroup>
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
              <EuiFlexGroup gutterSize="s" alignItems="center">
                <EuiFlexItem grow={false}>
                  <EuiCopy textToCopy={LOCALHOST_URL}>
                    {(copy) => (
                      <EuiButtonIcon
                        onClick={copy}
                        iconType="copyClipboard"
                        display="base"
                        size="m"
                      />
                    )}
                  </EuiCopy>
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiFieldText value={LOCALHOST_URL} readOnly />
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiTitle size="xxs">
                <span>
                  {i18n.translate('xpack.searchHomepage.connectToElasticsearch.apiKeysLabel', {
                    defaultMessage: 'API Keys',
                  })}
                </span>
              </EuiTitle>
              <EuiFlexGroup gutterSize="s" alignItems="baseline">
                <EuiFlexItem grow={false}>
                  <EuiButton iconType="key">
                    {i18n.translate('xpack.searchHomepage.connectToElasticsearch.createApiKey', {
                      defaultMessage: 'Create API Key',
                    })}
                  </EuiButton>
                </EuiFlexItem>
                <EuiFlexItem>
                  <EuiButtonEmpty iconType="gear">Manage API keys</EuiButtonEmpty>
                </EuiFlexItem>
                <EuiFlexItem>
                  <EuiBadge>0 active</EuiBadge>
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiHorizontalRule />
    </>
  );
};
