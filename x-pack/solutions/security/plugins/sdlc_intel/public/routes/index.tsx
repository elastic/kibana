/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { Redirect } from 'react-router-dom';
import { Route, Routes } from '@kbn/shared-ux-router';
import {
  SDLC_EXECUTIVE_ROUTE,
  SDLC_PIPELINE_ROUTE,
  SDLC_TEAMS_ROUTE,
} from '../../common/constants';
import { ExecutivePage } from '../pages/executive_page';
import { PipelinePage } from '../pages/pipeline_page';
import { TeamsPage } from '../pages/teams_page';

export const SdlcIntelRoutes = () => (
  <Routes>
    <Route exact path="/">
      <Redirect to={SDLC_EXECUTIVE_ROUTE} />
    </Route>
    <Route path={SDLC_EXECUTIVE_ROUTE}>
      <ExecutivePage />
    </Route>
    <Route path={SDLC_PIPELINE_ROUTE}>
      <PipelinePage />
    </Route>
    <Route path={SDLC_TEAMS_ROUTE}>
      <TeamsPage />
    </Route>
  </Routes>
);
