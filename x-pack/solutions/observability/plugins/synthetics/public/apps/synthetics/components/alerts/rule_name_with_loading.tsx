/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, EuiLoadingSpinner } from '@elastic/eui';
import React from 'react';

export const RuleNameWithLoading = ({
  ruleName,
  isLoading,
}: {
  ruleName: string;
  isLoading: boolean;
}) => {
  return (
    <EuiFlexGroup alignItems="center">
      <EuiFlexItem>{ruleName}</EuiFlexItem>
      {isLoading && (
        <EuiFlexItem grow={false}>
          <EuiLoadingSpinner />
        </EuiFlexItem>
      )}
    </EuiFlexGroup>
  );
};
