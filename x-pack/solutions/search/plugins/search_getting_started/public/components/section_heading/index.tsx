/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiPanel, EuiTitle, EuiIcon } from '@elastic/eui';

import { css } from '@emotion/react';

interface Props {
  title: string;
  icon: string;
}

export const SearchGettingStartedSectionHeading = ({ title, icon }: Props) => {
  return (
    <EuiFlexGroup gutterSize="s" alignItems="stretch">
      <EuiFlexItem style={{ alignSelf: 'center' }} grow={false}>
        <EuiPanel
          color="subdued"
          paddingSize="s"
          css={css`
            display: inline-block;
          `}
        >
          <EuiIcon type={icon} size="m" />
        </EuiPanel>
      </EuiFlexItem>
      <EuiFlexItem style={{ alignSelf: 'center' }}>
        <EuiTitle size="xs">
          <h2>{title}</h2>
        </EuiTitle>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
