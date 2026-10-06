/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { Redirect } from 'react-router-dom';
import { Route, Routes } from '@kbn/shared-ux-router';
import { useAlertZeroInvestigationsCapabilities } from './hooks/use_alertzero_investigations_capabilities';
import { EscalationsPage } from './pages/escalations';
import { WatchesRoutes } from './pages/watches/routes';
import { LandingPage } from './pages/landing_page';

/**
 * Renders the escalations page only when the current user has the `showEscalations`
 * UI capability. Without it, the user is redirected to the root route to avoid landing
 * on a page whose list requests would be rejected with 403.
 */
const EscalationsRoute: React.FC = () => {
  const { showEscalations } = useAlertZeroInvestigationsCapabilities();
  return showEscalations ? <EscalationsPage /> : <Redirect to="/" />;
};

/**
 * Top-level route table. A section with more than one page owns its own sub-routes — see
 * `pages/watches/routes.tsx` — so this stays a map of sections rather than of every page.
 *
 * Investigations have no route: an investigation is a templated Agent Builder conversation, so its
 * details render in Agent Builder's flyout over the queue and its chat lives in the Agent Builder
 * app.
 */
export const AlertZeroRoutes: React.FC = () => (
  <Routes>
    <Route path="/" exact component={LandingPage} />
    <Route path="/escalations" exact component={EscalationsRoute} />
    <Route path="/watches" component={WatchesRoutes} />
    <Redirect to="/" />
  </Routes>
);
