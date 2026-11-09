/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AppMountParameters, CoreStart } from '@kbn/core/public';
import { PerformanceContextProvider } from '@kbn/ebt-tools';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { RedirectAppLinks } from '@kbn/shared-ux-link-redirect-app';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import { Router } from '@kbn/shared-ux-router';
import { css } from '@emotion/react';
import { isNightshiftSupportedSpace } from '@kbn/nightshift-shared';
import useObservable from 'react-use/lib/useObservable';
import { EMPTY } from 'rxjs';
import React, { useMemo } from 'react';
import type { FocusedSignificantEventService } from '../chat/focused_significant_event_service';
import { NightshiftPage } from './nightshift_page';
import type { NightshiftStartDependencies } from '../types';
import { UnsupportedSpacePrompt } from './unsupported_space_prompt';

const queryClient = new QueryClient();

export function AppRoot({
  appMountParameters,
  coreStart,
  pluginsStart,
  isServerless,
  focusedSignificantEventService,
}: {
  appMountParameters: AppMountParameters;
  coreStart: CoreStart;
  pluginsStart: NightshiftStartDependencies;
  isServerless: boolean;
  focusedSignificantEventService: FocusedSignificantEventService;
}) {
  const { history } = appMountParameters;

  // Nightshift is in the side nav of every space, but only runs in the default one; elsewhere the
  // app explains that instead of rendering a Nightshift nobody can set up. A deployment without
  // the spaces plugin only has the default space.
  const activeSpace = useObservable(
    useMemo(() => pluginsStart.spaces?.getActiveSpace$() ?? EMPTY, [pluginsStart.spaces])
  );
  // `undefined` while the active space resolves, and in a deployment without the spaces plugin,
  // which only has the default space.
  const isUnsupportedSpace =
    activeSpace !== undefined && !isNightshiftSupportedSpace(activeSpace.id);

  // Flat shape so `useKibana().services` destructures the same way it did while
  // this app lived inside the observability plugin.
  const services = useMemo(
    () => ({
      ...coreStart,
      ...pluginsStart,
      isServerless,
      appParams: { history },
      focusedSignificantEventService,
    }),
    [coreStart, history, pluginsStart, isServerless, focusedSignificantEventService]
  );

  return (
    <KibanaContextProvider services={services}>
      <Router history={history}>
        <RedirectAppLinks
          coreStart={coreStart}
          data-test-subj="nightshiftMainContainer"
          css={css`
            display: flex;
            flex: 1 1 0;
            flex-flow: column nowrap;
            height: 100%;
            min-height: 0;
            width: 100%;
          `}
        >
          <PerformanceContextProvider>
            <QueryClientProvider client={queryClient}>
              {isUnsupportedSpace ? <UnsupportedSpacePrompt /> : <NightshiftPage />}
            </QueryClientProvider>
          </PerformanceContextProvider>
        </RedirectAppLinks>
      </Router>
    </KibanaContextProvider>
  );
}
