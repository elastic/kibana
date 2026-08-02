/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { Redirect, useParams } from 'react-router-dom';
import type { CoreStart } from '@kbn/core/public';
import { Route, Routes } from '@kbn/shared-ux-router';
import { SECURITY_UI_APP_ID, SecurityPageName } from '@kbn/security-solution-navigation';
import { buildLifecycleSearch } from './components/lifecycle_flyout';
import { PlaceholderPage } from './components/placeholder_page';
import {
  NAV_ALERTS,
  NAV_RECORDS,
  NAV_STREAMS,
  NAV_THREAT_HUNT,
} from './components/app_chrome/translations';
import { ChatsPage } from './pages/chats';
import { ConversationsPage } from './pages/conversations';
import { ExecutionsPage } from './pages/executions';
import { SettingsPage } from './pages/settings';
import { WatchesRoutes } from './pages/watches/routes';

interface AttacksRedirectProps {
  navigateToApp: CoreStart['application']['navigateToApp'];
}

const AttacksRedirect: React.FC<AttacksRedirectProps> = ({ navigateToApp }) => {
  React.useEffect(() => {
    // `replace` so the browser Back button skips this redirect rather than re-triggering it
    navigateToApp(SECURITY_UI_APP_ID, {
      deepLinkId: SecurityPageName.attacks,
      replace: true,
    });
  }, [navigateToApp]);
  return null;
};

/**
 * One path segment, decoded.
 *
 * react-router v5 hands `useParams` the **raw** segment — there is no `decodeURIComponent` anywhere in
 * `react-router@5.3.4` — while `URLSearchParams` encodes whatever it is given. So passing the segment
 * straight into `buildLifecycleSearch` would double-encode any id that needed encoding in the path,
 * and `?lifecycle=` would name a discovery that does not exist.
 *
 * A malformed escape (`%zz`) makes `decodeURIComponent` throw a `URIError`, and a hand-edited URL is
 * not worth taking the whole app down for: the raw segment is the better answer, because it still
 * opens the overlay and the flyout's own "could not correlate a run" state then says so.
 */
const decodePathParam = (value: string): string => {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
};

/**
 * Upstream's `/investigations/*` deep links, pointed at the flyout.
 *
 * [#284440](https://github.com/elastic/kibana/pull/284440) shipped these two paths against a detail
 * **page**; decision 1 of the 2026-08-17 Experience/UX sync makes the overlay the only detail surface
 * *("Flyout goes to tabs…")*, and the prototype has no investigation detail page at all. So the URL
 * contract survives and the duplicate rendering does not: their addressing, our internals.
 *
 * `Redirect` rather than an effect, and therefore `replace` rather than `push`: the overlay is worth
 * exactly one history entry (see `use_open_lifecycle`), and a deep link that pushed would leave Back
 * pointing at the redirect and re-triggering it. It lands on the queue at `/` with the overlay open
 * over it, which is what `useOpenLifecycle` produces from a queue row.
 *
 * ⚠️ `?lifecycle=` is keyed on an **attack discovery alert id**. `kibana-phf4.29` made
 * `/internal/pnd/investigations/{id}/proposals` accept either that id or the derived Investigation
 * conversation id, so a link carrying the alert id resolves to a populated flyout and one carrying
 * the conversation id resolves to the flyout's "could not correlate a run" state rather than to an
 * error. Register `#56` records that, and that `:proposalId` is deliberately dropped — a two-tab
 * flyout has no per-proposal address to send it to, and the pending tuning it names is already the
 * Review tuning section of the Overview tab.
 */
const InvestigationRedirect: React.FC = () => {
  const { id } = useParams<{ id: string }>();

  return <Redirect to={{ pathname: '/', search: buildLifecycleSearch('', decodePathParam(id)) }} />;
};

interface PndRoutesProps {
  navigateToApp: CoreStart['application']['navigateToApp'];
}

/**
 * Top-level route table. A section with more than one page owns its own sub-routes — see
 * `pages/watches/routes.tsx` — so this stays a map of sections rather than of every page.
 *
 * ⚠️ `Routes` is a react-router v5 `Switch`, so **first match wins and order is load-bearing**.
 * That matters most inside the Watches section, which is why its literal-before-param ordering
 * lives in one file next to the pages it orders. It matters here too, for the two
 * `/investigations/*` deep links: the path with the literal `proposals` segment precedes the bare
 * param route. `application.test.tsx` pins each route here.
 */
export const PndRoutes: React.FC<PndRoutesProps> = ({ navigateToApp }) => (
  <Routes>
    <Route path="/" exact component={ConversationsPage} />
    {/*
      `/chats` also answers to `?conversationId=<id>`, which opens that conversation in a detail
      panel beside the list (annotation 9b) — that is where the queue row's agent button lands.
      A **query** param rather than a `/chats/:conversationId` route, deliberately: `Routes` is a
      v5 `Switch` where first match wins, so a param segment here would have to be ordered against
      every future `/chats/<section>`, and the panel has to compose with the `?lifecycle=` overlay
      any page can open over itself. `pages/chats` reads it with `readConversationId`.
    */}
    <Route path="/chats" component={ChatsPage} />
    <Route path="/executions/:correlationId" component={ExecutionsPage} />
    <Route path="/executions" exact component={ExecutionsPage} />
    <Route path="/alerts" render={() => <PlaceholderPage title={NAV_ALERTS} />} />
    <Route path="/attacks" render={() => <AttacksRedirect navigateToApp={navigateToApp} />} />
    <Route path="/records" render={() => <PlaceholderPage title={NAV_RECORDS} />} />
    <Route path="/threat-hunt" render={() => <PlaceholderPage title={NAV_THREAT_HUNT} />} />
    <Route path="/streams" render={() => <PlaceholderPage title={NAV_STREAMS} />} />
    <Route path="/watches" component={WatchesRoutes} />
    <Route path="/settings" component={SettingsPage} />
    {/*
      Upstream's two investigation deep links, in upstream's order: the path carrying the literal
      `proposals` segment first, then the bare param route. Neither is `exact`, so ordering is what
      keeps the param route from swallowing the deeper path — it reads `inv-1` out of
      `/investigations/inv-1/proposals/p-1` either way today, because both resolve to the same
      redirect, but the ordering is the one that stays correct the day the proposals path gains a
      surface of its own. `application.test.tsx` pins both URLs.
    */}
    <Route path="/investigations/:id/proposals/:proposalId" component={InvestigationRedirect} />
    <Route path="/investigations/:id" component={InvestigationRedirect} />
    {/*
      There is no `/conversations` route, and that is not an omission: `ConversationsPage`
      **is** what `/` renders. It was reachable only by import while the branch carried two queues.
    */}
  </Routes>
);
