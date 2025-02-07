/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { css } from '@emotion/css';
import React from 'react';
import { AssetImage } from '../asset_image';

export function PreviewPanelIllustration({ children }: { children: React.ReactNode }) {
  return (
    <EuiFlexGroup alignItems="center" justifyContent="center">
      <EuiFlexItem
        grow={false}
        className={css`
          max-width: 350px;
        `}
      >
        <AssetImage />
        {children}
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}
