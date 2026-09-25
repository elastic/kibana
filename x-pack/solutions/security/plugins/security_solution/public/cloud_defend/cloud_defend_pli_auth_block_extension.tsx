/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PropsWithChildren } from 'react';
import React, { memo } from 'react';
import { useUpsellingComponent } from '../common/hooks/use_upselling';

export const CloudDefendPliAuthBlockExtension = memo<PropsWithChildren>(({ children }) => {
  const Component = useUpsellingComponent('cloud_defend_integration_installation');
  if (!Component) {
    return <>{children}</>;
  }
  return <Component />;
});

CloudDefendPliAuthBlockExtension.displayName = 'CloudDefendPliAuthBlockExtension';
