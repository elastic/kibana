/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { Redirect } from 'react-router-dom';
import { Route, Routes } from '@kbn/shared-ux-router';
import { WatchesActivityPage } from './activity';
import { WatchDetailPage } from './watch_detail';
import { WorkersPage } from './workers';
import { SkillsPage } from './skills';

/**
 * Routes owned by the Watches section. The app's route table only knows about `/watches`, so adding a
 * page here needs no change outside this folder.
 */
export const WatchesRoutes: React.FC = () => (
  <Routes>
    {/* Literal /watches/<section> routes must precede /watches/:watchId, or the section name is
        read as a watch id. `routes.test.tsx` pins each one. */}
    <Route path="/watches/workers" component={WorkersPage} />
    <Route path="/watches/skills" component={SkillsPage} />
    <Route path="/watches/activity" component={WatchesActivityPage} />
    <Route path="/watches/:watchId" component={WatchDetailPage} />
    {/* No overview page — redirect bare /watches to the Workers section. */}
    <Route path="/watches" exact render={() => <Redirect to="/watches/workers" />} />
  </Routes>
);
