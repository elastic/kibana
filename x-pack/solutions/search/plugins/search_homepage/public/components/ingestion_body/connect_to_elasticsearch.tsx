/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { css } from '@emotion/react';
import { EuiFlexGroup, EuiFlexItem, EuiText, EuiTitle, useEuiTheme } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormInfoField } from '@kbn/search-shared-ui';

import { useElasticsearchUrl } from '../../hooks/use_elasticsearch_url';
import { CONNECT_TO_ELASTICSEARCH_TITLE, ELASTICSEARCH_ENDPOINT_LABEL } from '../shared/i18n';
import { ExploreLanguageClients } from './explore_language_clients';
import { ApiKeyForm } from '../api_key_form';

export const ConnectToElasticsearch = () => {
  const { euiTheme } = useEuiTheme();
  const elasticsearchUrl = useElasticsearchUrl();

  return (
    <EuiFlexGroup direction="column">
      <EuiFlexGroup direction="column" gutterSize="s">
        <EuiTitle size="s">
          <h3>{CONNECT_TO_ELASTICSEARCH_TITLE}</h3>
        </EuiTitle>
        <EuiText grow={false} color="subdued">
          <p>
            {i18n.translate(
              'xpack.searchHomepage.connectToElasticsearchIngestionVariant.description',
              {
                defaultMessage:
                  'Interact and add documents directly to your Elasticsearch index using your preferred language client.',
              }
            )}
          </p>
        </EuiText>
      </EuiFlexGroup>
      <EuiFlexGroup wrap>
        <EuiFlexItem grow={false}>
          <EuiFlexGroup
            gutterSize="s"
            alignItems="center"
            css={css({
              borderRight: euiTheme.border.thick,
              paddingRight: euiTheme.size.m,
            })}
          >
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
          <ExploreLanguageClients />
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiFlexGroup>
  );
};
