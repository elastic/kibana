/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Suspense } from 'react';
import { LazyPackageCard } from '@kbn/fleet-plugin/public';
import type { IntegrationCardItem } from '@kbn/fleet-plugin/public';

export const renderResultCard = (item: IntegrationCardItem): React.ReactNode => (
  <Suspense fallback={null}>
    <LazyPackageCard {...item} showLabels={false} />
  </Suspense>
);
