/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { Redirect } from 'react-router-dom';
import { Route, Routes } from '@kbn/shared-ux-router';
import { SYSTEM_SECURITY_WATCH_FLOOR_ID } from '@kbn/pnd-common';
import { WatchDetailPage } from './watch_detail';

const DEFAULT_WATCH_PATH = `/watches/${SYSTEM_SECURITY_WATCH_FLOOR_ID}`;

/**
 * Routes owned by the Watches section. The app's route table only knows about `/watches`, so adding a
 * page here needs no change outside this folder.
 */
export const WatchesRoutes: React.FC = () => (
  <Routes>
    {/* Literal /watches/<section> routes must precede /watches/:watchId, or the section name is
        read as a watch id. */}
    <Route path="/watches/:watchId" component={WatchDetailPage} />
    {/* Land on the first catalog Watch so live mode is not dumped onto mock-only Workers. */}
    <Route path="/watches" exact render={() => <Redirect to={DEFAULT_WATCH_PATH} />} />
  </Routes>
);
