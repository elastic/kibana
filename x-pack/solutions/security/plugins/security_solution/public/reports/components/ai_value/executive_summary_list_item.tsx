/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiIcon, EuiText } from '@elastic/eui';
import { css } from '@emotion/react';

interface Props {
  children: React.ReactNode;
}

const ICON_PADDING = css`
  margin: 0px 8px 0 0;
`;
const ExecutiveSummaryListItemComponent: React.FC<Props> = ({ children }) => {
  return (
    <EuiFlexGroup gutterSize="s" alignItems="center">
      <EuiFlexItem grow={false}>
        <EuiIcon css={ICON_PADDING} type="check" color="success" />
      </EuiFlexItem>
      <EuiFlexItem>
        <EuiText size="s">{children}</EuiText>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

export const ExecutiveSummaryListItem = React.memo(ExecutiveSummaryListItemComponent);
