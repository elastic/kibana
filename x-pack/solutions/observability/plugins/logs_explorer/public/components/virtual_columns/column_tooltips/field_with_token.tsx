/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, EuiText, EuiToken, useEuiTheme } from '@elastic/eui';
import React from 'react';
import { css } from '@emotion/react';

export const FieldWithToken = ({
  field,
  iconType = 'tokenKeyword',
}: {
  field: string;
  iconType?: string;
}) => {
  const { euiTheme } = useEuiTheme();

  return (
    <div
      css={css`
        margin-bottom: ${euiTheme.size.xs};
      `}
    >
      <EuiFlexGroup
        responsive={false}
        alignItems="center"
        justifyContent="flexStart"
        gutterSize="xs"
      >
        <EuiFlexItem grow={false}>
          <EuiToken iconType={iconType} size="s" />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiText size="s">
            <strong>{field}</strong>
          </EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>
    </div>
  );
};
