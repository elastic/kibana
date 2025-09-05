/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiHorizontalRule, EuiText, EuiTitle } from '@elastic/eui';

import { i18n } from '@kbn/i18n';
import { FormInfoField } from '@kbn/search-shared-ui';
import { ConnectToElasticsearchSidePanel } from './connect_to_elasticsearch_side_panel';
import { AISearchCapabilities } from './ai_search_capabilities/ai_search_capabilities';
import { useElasticsearchUrl } from '../hooks/use_elasticsearch_url';
import { ApiKeyForm } from './api_key_form';
import { ConsoleTutorialsGroup } from './console_tutorials_group';
import { CONNECT_TO_ELASTICSEARCH_TITLE, ELASTICSEARCH_ENDPOINT_LABEL } from './shared/i18n';

export const ConnectToElasticsearch = () => {
  const elasticsearchUrl = useElasticsearchUrl();

  return (
    <EuiFlexGroup gutterSize="xl" wrap>
      <EuiFlexItem grow={3}>
        <EuiFlexGroup direction="column" gutterSize="l">
          <EuiFlexItem grow={false}>
            <EuiFlexGroup direction="column" gutterSize="s">
              <EuiFlexItem>
                <EuiTitle size="s">
                  <h3>{CONNECT_TO_ELASTICSEARCH_TITLE}</h3>
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
          <EuiFlexItem>
            <EuiFlexGroup alignItems="flexStart" gutterSize="l">
              <EuiFlexItem grow={false}>
                <EuiFlexGroup direction="column" gutterSize="s">
                  <EuiFlexItem grow={false}>
                    <EuiTitle size="xxs">
                      <span>{ELASTICSEARCH_ENDPOINT_LABEL}</span>
                    </EuiTitle>
                  </EuiFlexItem>
                  <EuiFlexItem>
                    <FormInfoField
                      value={elasticsearchUrl}
                      copyValue={elasticsearchUrl}
                      dataTestSubj="endpointValueField"
                      copyValueDataTestSubj="copyEndpointButton"
                    />
                  </EuiFlexItem>
                </EuiFlexGroup>
              </EuiFlexItem>
              <EuiFlexItem>
                <ApiKeyForm />
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiHorizontalRule />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <ConsoleTutorialsGroup />
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
