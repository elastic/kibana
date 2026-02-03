/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { lazy } from 'react';

export const LazyIconAgentBuilder = lazy(() =>
  import('./agent_builder').then(({ iconAgentBuilder }) => ({ default: iconAgentBuilder }))
);

// TODO delete when the `bullseye` EUI icon has been updated
export const LazyIconFindings = lazy(() =>
  import('./findings').then(({ iconFindings }) => ({ default: iconFindings }))
);

// TODO delete when the EUI icon has been updated
export const LazyIconIntelligence = lazy(() =>
  import('./intelligence').then(({ iconIntelligence }) => ({
    default: iconIntelligence,
  }))
);
