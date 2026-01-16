/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiText, EuiSpacer } from '@elastic/eui';

interface OverviewTabProps {
  hostId: string;
}

export const OverviewTab: React.FC<OverviewTabProps> = React.memo(({ hostId }) => {
  return (
    <>
      <EuiSpacer size="l" />
      <EuiText>
        <p>Overview tab for host: {hostId}</p>
        <p>This will contain detailed overview information in the next phase.</p>
      </EuiText>
    </>
  );
});

OverviewTab.displayName = 'OverviewTab';
