/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiTitle, EuiIcon } from '@elastic/eui';
import { css } from '@emotion/react';

export const Title = ({ icon, count, text }: { icon?: string; count?: number; text: string }) => {
  return (
    <EuiFlexGroup
      gutterSize="s"
      css={css`
        flex-grow: 0;
      `}
    >
      {icon && (
        <EuiFlexItem grow={false}>
          <EuiIcon type={icon} size="l" color="text" />
        </EuiFlexItem>
      )}
      <EuiFlexItem>
        <EuiTitle size="xs">
          <h2>
            {count} {text}
          </h2>
        </EuiTitle>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
