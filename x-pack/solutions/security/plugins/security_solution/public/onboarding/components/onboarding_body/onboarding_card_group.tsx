/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { type PropsWithChildren } from 'react';
import { EuiSpacer, EuiTitle } from '@elastic/eui';

export const OnboardingCardGroup = React.memo<PropsWithChildren<{ title: string }>>(
  ({ title, children }) => {
    return (
      <div>
        <EuiTitle size="xs">
          <h2>{title}</h2>
        </EuiTitle>
        <EuiSpacer size="m" />
        {children}
      </div>
    );
  }
);
OnboardingCardGroup.displayName = 'OnboardingCardGroup';
