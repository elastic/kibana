/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiPanel } from '@elastic/eui';
import { css } from '@emotion/css';
import type { PropsWithChildren } from 'react';
import React from 'react';

const style = css`
  .euiStep__title {
    font-size: 14px;
  }
`;

export const SubStepWrapper = React.memo<PropsWithChildren<{}>>(({ children }) => {
  return (
    <EuiPanel hasShadow={false} paddingSize="xs" className={style}>
      {children}
    </EuiPanel>
  );
});
SubStepWrapper.displayName = 'SubStepWrapper';
