/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiIconTip, EuiTitle } from '@elastic/eui';

interface QueryHeaderProps {
  title: string;
  tooltip: string;
}

export const QueryHeader: React.FC<QueryHeaderProps> = React.memo(({ title, tooltip }) => {
  return (
    <EuiFlexGroup data-test-subj="queryHeader" direction="row" gutterSize="xs" alignItems="center">
      <EuiFlexItem grow={false}>
        <EuiTitle data-test-subj="headerTitle" size="xxs">
          <h3>{title}</h3>
        </EuiTitle>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiIconTip
          content={tooltip}
          type="question"
          size="s"
          color="subdued"
          anchorProps={{ 'data-test-subj': 'headerIconTip' }}
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
});
QueryHeader.displayName = 'QueryHeader';
