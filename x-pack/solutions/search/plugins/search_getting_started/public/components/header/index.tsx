/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiTitle,
  EuiSpacer,
  EuiText,
  useCurrentEuiBreakpoint,
} from '@elastic/eui';

import { i18n } from '@kbn/i18n';
import { ElasticsearchConnectionDetails } from '../elasticsearch_connection_details';

export const SearchGettingStartedHeader: React.FC = () => {
  const currentBreakpoint = useCurrentEuiBreakpoint();

  return (
    <EuiFlexGroup gutterSize={currentBreakpoint === 'xl' ? 'l' : 'xl'} direction="column">
      <EuiFlexGroup gutterSize="l" alignItems="flexStart" direction="column">
        <EuiFlexItem>
          <EuiTitle size="l">
            <h1>
              {i18n.translate('xpack.search.gettingStarted.page.title', {
                defaultMessage: 'Start building with Elasticsearch.',
              })}
            </h1>
          </EuiTitle>
          <EuiSpacer size="m" />
          <EuiText grow={false} color="subdued" size="m">
            <p>
              {i18n.translate('xpack.search.gettingStarted.page.description', {
                defaultMessage:
                  'Connect your deployment and start building AI-powered search for products, docs, chatbots, recommenders, and more.',
              })}
            </p>
          </EuiText>
        </EuiFlexItem>
        <EuiFlexItem>
          <ElasticsearchConnectionDetails />
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiFlexGroup>
  );
};
