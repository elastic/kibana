/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, EuiTitle } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { ElasticsearchDocumentation } from './elasticsearch_documentation';
import { PythonNotebooks } from './python_notebooks';
import { SearchLabs } from './search_labs';

export const DiveDeeperWithElasticsearch: React.FC = () => (
  <EuiFlexGroup direction="column" gutterSize="m">
    <EuiFlexItem grow={false}>
      <EuiTitle size="s">
        <span>
          {i18n.translate('xpack.searchHomepage.diveDeeper.title', {
            defaultMessage: 'Dive Deeper with Elasticsearch',
          })}
        </span>
      </EuiTitle>
    </EuiFlexItem>
    <EuiFlexItem grow={false}>
      <EuiFlexGroup>
        <EuiFlexItem grow={false}>
          <SearchLabs />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <PythonNotebooks />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <ElasticsearchDocumentation />
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiFlexItem>
  </EuiFlexGroup>
);
