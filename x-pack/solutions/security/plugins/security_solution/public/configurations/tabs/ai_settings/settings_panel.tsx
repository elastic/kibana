/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButton,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiText,
  EuiTitle,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import React from 'react';

export const SettingsPanel = ({ title, description, buttonText }) => {
  const { euiTheme } = useEuiTheme();

  return (
    <EuiPanel
      hasBorder
      hasShadow={false}
      css={css`
        margin-top: ${euiTheme.size.base};
      `}
    >
      <EuiTitle size="xs">
        <h4>{title}</h4>
      </EuiTitle>
      <EuiFlexGroup alignItems="baseline" justifyContent="spaceBetween">
        <EuiFlexItem grow={false}>
          <EuiText size="s">
            <p>{description}</p>
          </EuiText>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButton>{buttonText}</EuiButton>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  );
};
