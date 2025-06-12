/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiButton, EuiFlexGroup, EuiFlexItem, EuiText, EuiTitle } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';

export const SearchLabs: React.FC = () => (
  <EuiFlexGroup direction="column" gutterSize="m">
    <EuiFlexItem grow={false}>
      <EuiTitle size="s">
        <span>
          {i18n.translate('xpack.searchHomepage.searchLabs.title', {
            defaultMessage: 'Search Labs',
          })}
        </span>
      </EuiTitle>
    </EuiFlexItem>
    <EuiFlexItem grow={false}>
      <EuiText size="s" color="subdued">
        <span>
          {i18n.translate('xpack.searchHomepage.searchLabs.description', {
            defaultMessage:
              'Explore the latest articles and tutorials on using Elasticsearch for AI/ML-powered search experiences.',
          })}
        </span>
      </EuiText>
    </EuiFlexItem>
    <EuiFlexItem grow={false}>
      <span>
        <EuiButton
          iconType={'popout'}
          href="https://www.elastic.co/search-labs/tutorials"
          target="_blank"
          iconSide="right"
          data-test-subj="searchLabsButton"
        >
          {i18n.translate('xpack.searchHomepage.searchLabs.buttonText', {
            defaultMessage: 'Visit Search Labs',
          })}
        </EuiButton>
      </span>
    </EuiFlexItem>
  </EuiFlexGroup>
);
