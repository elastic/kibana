/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiTitle } from '@elastic/eui';

import { FormInfoField } from '@kbn/search-shared-ui';
import { useElasticsearchUrl } from '../hooks/use_elasticsearch_url';
import { ApiKeyForm } from './api_key_form';
import { ELASTICSEARCH_ENDPOINT_LABEL } from './shared/i18n';

export const ConnectToElasticsearch = () => {
  const elasticsearchUrl = useElasticsearchUrl();

  return (
    <EuiFlexGroup direction="column" gutterSize="xs">
      <EuiFlexItem grow={false}>
        <EuiFlexGroup direction="column" gutterSize="s">
          <EuiFlexItem>
            <EuiTitle size="xxs">
              <h3>{ELASTICSEARCH_ENDPOINT_LABEL}</h3>
            </EuiTitle>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
      <EuiFlexItem>
        <EuiFlexGroup alignItems="flexStart" gutterSize="m" wrap>
          <EuiFlexItem grow={false}>
            <EuiFlexGroup direction="column" gutterSize="xs">
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
    </EuiFlexGroup>
  );
};
