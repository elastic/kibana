/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiButton, EuiFlexGroup, EuiFlexItem, EuiText, EuiTitle } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';

export const ElasticsearchDocumentation: React.FC = () => (
  <EuiFlexGroup direction="column" gutterSize="m">
    <EuiFlexItem grow={false}>
      <EuiTitle size="s">
        <span>
          {i18n.translate('xpack.searchHomepage.elasticsearchDocumentation.title', {
            defaultMessage: 'Elasticsearch Documentation',
          })}
        </span>
      </EuiTitle>
    </EuiFlexItem>
    <EuiFlexItem grow={false}>
      <EuiText size="s" color="subdued">
        <span>
          {i18n.translate('xpack.searchHomepage.elasticsearchDocumentation.description', {
            defaultMessage:
              'A range of executable Python notebooks available to easily test features in a virtual environment.',
          })}
        </span>
      </EuiText>
    </EuiFlexItem>
    <EuiFlexItem grow={false}>
      <span>
        <EuiButton data-test-subj="viewDocumentationButton">
          {i18n.translate('xpack.searchHomepage.elasticsearchDocumentation.buttonText', {
            defaultMessage: 'View Documentation',
          })}
        </EuiButton>
      </span>
    </EuiFlexItem>
  </EuiFlexGroup>
);
