/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import ReactDOM from 'react-dom';
import { I18nProvider } from '@kbn/i18n-react';
import type { AppMountParameters, CoreStart } from '@kbn/core/public';
import { Redirect } from 'react-router-dom';
import { Router, Route, Routes } from '@kbn/shared-ux-router';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { wrapWithTheme } from '@kbn/react-kibana-context-theme';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import { PND_PLUGIN_NAME } from '@kbn/pnd-common';
import { AppChromeLayout } from './components/app_chrome';
import { PlaceholderPage } from './components/placeholder_page';
import {
  NAV_ALERTS,
  NAV_ATTACKS,
  NAV_RECORDS,
  NAV_THREAT_HUNT,
  NAV_STREAMS,
} from './components/app_chrome/translations';
import type { PndClientConfig, PndStartDependencies } from './types';
import { BriefPage } from './pages/brief';
import { ChatsPage } from './pages/chats';
import { SettingsPage } from './pages/settings';
import { WatchesPage } from './pages/watches';
import { WatchDetailPage } from './pages/watches/watch_detail';
import { WatchesSectionStubPage } from './pages/watches/section_stub';
import { WatchesWorkflowsPage } from './pages/watches/watches_workflows_page';
import { WatchesSkillsPage } from './pages/watches/watches_skills_page';
import { WatchesGuardrailsPage } from './pages/watches/watches_guardrails_page';
import { WatchesActivityPage } from './pages/watches/watches_activity_page';
import { InvestigationDetailPage } from './pages/investigations/investigation_detail';

interface RenderAppParams {
  coreStart: CoreStart;
  startDeps: PndStartDependencies;
  params: AppMountParameters;
  config: PndClientConfig;
}

const rootStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  flex: 1,
  minHeight: 0,
};

export const renderApp = ({ coreStart, startDeps, params, config: _config }: RenderAppParams) => {
  coreStart.chrome.docTitle.change(PND_PLUGIN_NAME);

  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        refetchOnWindowFocus: 'always',
        refetchOnMount: 'always',
      },
    },
  });

  const App = () => (
    <div style={rootStyle}>
      <QueryClientProvider client={queryClient}>
        <I18nProvider>
          <KibanaContextProvider services={{ ...coreStart, ...startDeps }}>
            <Router history={params.history}>
              <AppChromeLayout>
                <Routes>
                  <Route path="/" exact component={BriefPage} />
                  <Route path="/chats" component={ChatsPage} />
                  <Route path="/alerts" render={() => <PlaceholderPage title={NAV_ALERTS} />} />
                  <Route path="/attacks" render={() => <PlaceholderPage title={NAV_ATTACKS} />} />
                  <Route path="/records" render={() => <PlaceholderPage title={NAV_RECORDS} />} />
                  <Route
                    path="/threat-hunt"
                    render={() => <PlaceholderPage title={NAV_THREAT_HUNT} />}
                  />
                  <Route path="/streams" render={() => <PlaceholderPage title={NAV_STREAMS} />} />
                  <Route path="/watches/workflows" component={WatchesWorkflowsPage} />
                  <Route path="/watches/skills" component={WatchesSkillsPage} />
                  <Route path="/watches/activity" component={WatchesActivityPage} />
                  <Route
                    path="/watches/performance"
                    render={() => <WatchesSectionStubPage section="performance" />}
                  />
                  <Route path="/watches/guardrails" component={WatchesGuardrailsPage} />
                  <Route path="/watches/:watchId" component={WatchDetailPage} />
                  <Route path="/watches" exact component={WatchesPage} />
                  <Route path="/settings" component={SettingsPage} />
                  <Route
                    path="/investigations/:id/proposals/:proposalId"
                    component={InvestigationDetailPage}
                  />
                  <Route path="/investigations/:id" component={InvestigationDetailPage} />
                  {/*
                    No dedicated investigations-list page exists — Brief (`/`) is the
                    investigation queue/list experience. Without this exact-match redirect,
                    `/app/pnd/investigations` (no `:id`) matched no route above and
                    `<Routes>` rendered an empty shell with no 404/redirect, which looked
                    like a blank-list bug rather than an unmatched route.
                  */}
                  <Route path="/investigations" exact render={() => <Redirect to="/" />} />
                </Routes>
              </AppChromeLayout>
            </Router>
          </KibanaContextProvider>
        </I18nProvider>
      </QueryClientProvider>
    </div>
  );

  ReactDOM.render(wrapWithTheme(<App />, coreStart.theme), params.element);

  return () => {
    ReactDOM.unmountComponentAtNode(params.element);
  };
};
