/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiPanel, EuiSteps, type EuiStepProps } from '@elastic/eui';
import { css } from '@emotion/css';
import React from 'react';

const style = css`
  .euiStep__title {
    font-size: 14px;
  }
`;

export const MigrationDataInputSubSteps = React.memo<{ steps: EuiStepProps[] }>(({ steps }) => {
  return (
    <EuiPanel hasShadow={false} paddingSize="xs" className={style}>
      <EuiSteps titleSize="xxs" steps={steps} />
    </EuiPanel>
  );
});
MigrationDataInputSubSteps.displayName = 'MigrationDataInputSubSteps';
