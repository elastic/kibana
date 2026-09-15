/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { Redirect } from 'react-router-dom';
import { Route, Routes } from '@kbn/shared-ux-router';
import { useQueryClient } from '@kbn/react-query';
import type { ListWatchesResponse } from '@kbn/alertzero-common';
import { queryKeys } from '../../query_keys';
import { useWatches } from '../../hooks/use_watches_api';
import { WatchDetailPage } from './watch_detail';

/**
 * Landing redirect for the Watches section. The gate (see `routes.tsx`) already renders the S2
 * empty state while watches are still resolving, so by the time this renders a watch exists.
 * Resolves the installed watches from the react-query cache first (populated by the gate's
 * `useOnboardingState`, so no extra request) and falls back to the live query. It redirects to the
 * first catalog watch rather than a hardcoded floor id, which may not exist in this space.
 */
const WatchesIndexRedirect: React.FC = () => {
  const queryClient = useQueryClient();
  const cached = queryClient.getQueryData<ListWatchesResponse>(queryKeys.watches.list());
  // Skip the network call when the gate already cached the list; use it only as a fallback.
  const { data: fetched } = useWatches({ enabled: cached === undefined });

  const firstWatchId = (cached?.watches ?? fetched?.watches)?.[0]?.id;

  if (!firstWatchId) {
    return null;
  }
  return <Redirect to={`/watches/${firstWatchId}`} />;
};

/**
 * Routes owned by the Watches section. The app's route table only knows about `/watches`, so adding a
 * page here needs no change outside this folder.
 */
export const WatchesRoutes: React.FC = () => (
  <Routes>
    {/* Literal /watches/<section> routes must precede /watches/:watchId, or the section name is
        read as a watch id. */}
    <Route path="/watches/:watchId" component={WatchDetailPage} />
    <Route path="/watches" exact component={WatchesIndexRedirect} />
  </Routes>
);
