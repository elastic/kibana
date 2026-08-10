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
  NAV_RECORDS,
  NAV_STREAMS,
  NAV_THREAT_HUNT,
} from './components/app_chrome/translations';
import { ConversationsPage } from './pages/conversations';
import { ChatsPage } from './pages/chats';
import { SettingsPage } from './pages/settings';
import { WatchesRoutes } from './pages/watches/routes';
import { InvestigationDetailPage } from './pages/investigations/investigation_detail';

/**
 * Top-level route table. A section with more than one page owns its own sub-routes — see
 * `pages/watches/routes.tsx` — so this stays a map of sections rather than of every page.
 */
export const PndRoutes: React.FC = () => (
  <Routes>
    <Route path="/" exact component={ConversationsPage} />
    <Route path="/chats" component={ChatsPage} />
    <Route path="/alerts" render={() => <PlaceholderPage title={NAV_ALERTS} />} />
    <Route path="/attacks" render={() => <PlaceholderPage title={NAV_ATTACKS} />} />
    <Route path="/records" render={() => <PlaceholderPage title={NAV_RECORDS} />} />
    <Route path="/threat-hunt" render={() => <PlaceholderPage title={NAV_THREAT_HUNT} />} />
    <Route path="/streams" render={() => <PlaceholderPage title={NAV_STREAMS} />} />
    <Route path="/watches" component={WatchesRoutes} />
    <Route path="/settings" component={SettingsPage} />
    <Route path="/investigations/:id/proposals/:proposalId" component={InvestigationDetailPage} />
    <Route path="/investigations/:id" component={InvestigationDetailPage} />
  </Routes>
);
