/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';

export function ErrorPanel() {
  return (
    <EuiFlexGroup justifyContent="center" alignItems="center">
      <EuiFlexItem grow={false}>
        <EuiText color="subdued">
          {i18n.translate('xpack.observability.section.errorPanel', {
            defaultMessage: 'An error happened when trying to fetch data. Please try again',
          })}
        </EuiText>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}
