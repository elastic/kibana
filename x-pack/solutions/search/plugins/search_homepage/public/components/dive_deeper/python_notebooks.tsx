/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiButton, EuiFlexGroup, EuiFlexItem, EuiText, EuiTitle } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

export const PythonNotebooks: React.FC = () => (
  <EuiFlexGroup direction="column" gutterSize="m">
    <EuiFlexItem grow={false}>
      <EuiTitle size="s">
        <span>
          {i18n.translate('xpack.searchHomepage.pythonNotebooks.title', {
            defaultMessage: 'Python notebooks',
          })}
        </span>
      </EuiTitle>
    </EuiFlexItem>
    <EuiFlexItem grow={false}>
      <EuiText size="s" color="subdued">
        <span>
          {i18n.translate('xpack.searchHomepage.pythonNotebooks.description', {
            defaultMessage:
              'A range of executable Python notebooks available to easily test features in a virtual environment.',
          })}
        </span>
      </EuiText>
    </EuiFlexItem>
    <EuiFlexItem grow={false}>
      <span>
        <EuiButton
          href="https://www.elastic.co/search-labs/tutorials/examples"
          target="_blank"
          data-test-subj="openNotebooksButton"
        >
          {i18n.translate('xpack.searchHomepage.pythonNotebooks.buttonText', {
            defaultMessage: 'Open notebooks',
          })}
        </EuiButton>
      </span>
    </EuiFlexItem>
  </EuiFlexGroup>
);
