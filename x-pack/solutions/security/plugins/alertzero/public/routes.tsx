/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { Route, Routes } from '@kbn/shared-ux-router';
import { PlaceholderPage } from './components/placeholder_page';
import {
  NAV_ALERTS,
  NAV_ATTACKS,
  NAV_STREAMS,
  NAV_THREAT_HUNT,
} from './components/app_chrome/translations';
import { ConversationsPage } from './pages/conversations';
import { SettingsPage } from './pages/settings';
import { WatchesRoutes } from './pages/watches/routes';

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
    <Route path="/" exact component={ConversationsPage} />
    <Route path="/alerts" render={() => <PlaceholderPage title={NAV_ALERTS} />} />
    <Route path="/attacks" render={() => <PlaceholderPage title={NAV_ATTACKS} />} />
    <Route path="/threat-hunt" render={() => <PlaceholderPage title={NAV_THREAT_HUNT} />} />
    <Route path="/streams" render={() => <PlaceholderPage title={NAV_STREAMS} />} />
    <Route path="/watches" component={WatchesRoutes} />
    <Route path="/settings" component={SettingsPage} />
  </Routes>
);
