/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiSpacer } from '@elastic/eui';
import { DriftOverview } from '../../../../endpoint_assets/components/drift_overview';

interface DriftTabProps {
  hostId: string;
}

export const DriftTab: React.FC<DriftTabProps> = React.memo(({ hostId }) => {
  return (
    <>
      <EuiSpacer size="l" />
      <DriftOverview hostId={hostId} />
    </>
  );
});

DriftTab.displayName = 'DriftTab';
