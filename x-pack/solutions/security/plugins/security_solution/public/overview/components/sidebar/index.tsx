/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';

import type { FilterMode as RecentTimelinesFilterMode } from '../recent_timelines/types';

import { Sidebar } from './sidebar';

export const StatefulSidebar = React.memo(() => {
  const [recentTimelinesFilterBy, setRecentTimelinesFilterBy] =
    useState<RecentTimelinesFilterMode>('favorites');

  return (
    <Sidebar
      recentTimelinesFilterBy={recentTimelinesFilterBy}
      setRecentTimelinesFilterBy={setRecentTimelinesFilterBy}
    />
  );
});

StatefulSidebar.displayName = 'StatefulSidebar';
