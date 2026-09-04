/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC, PropsWithChildren } from 'react';
import React, { useState } from 'react';
import {
  LogViewProvider,
  initializeFromUrl as createInitializeFromUrl,
  updateContextInUrl as createUpdateContextInUrl,
  listenForUrlChanges as createListenForUrlChanges,
} from '@kbn/logs-shared-plugin/public';
import { LogSourcesProvider } from '@kbn/logs-data-access-plugin/public';
import { PROJECT_ROUTING } from '@kbn/cps-utils';
import { LogAnalysisCapabilitiesProvider } from '../../containers/logs/log_analysis';
import { useKibanaContextForPlugin } from '../../hooks/use_kibana';
import { useKbnUrlStateStorageFromRouterContext } from '../../containers/kbn_url_state_context';

export const LogsPageProviders: FC<PropsWithChildren<unknown>> = ({ children }) => {
  const {
    services: {
      notifications: { toasts: toastsService },
      cps,
      logsShared,
      logsDataAccess,
    },
  } = useKibanaContextForPlugin();

  // The project picker is disabled for this app because project scope is a per-job property of the
  // ML jobs these pages render, so the picker cannot answer "is there any log data?". Scope the
  // status query to all projects explicitly, otherwise it would be clamped to the origin project
  // and an origin without logs would render the "no data" screen despite a linked project having
  // them. Note that resolving the log view also fetches its data view's fields, which stays
  // origin-scoped: nothing in this app reads that field list, so it is knowingly left alone.
  const isCpsEnabled = Boolean(cps?.isTierEligible && cps?.cpsManager);
  const projectRouting = isCpsEnabled ? PROJECT_ROUTING.ALL : undefined;

  const urlStateStorage = useKbnUrlStateStorageFromRouterContext();

  const [initializeFromUrl] = useState(() => {
    return createInitializeFromUrl({ toastsService, urlStateStorage });
  });
  const [updateContextInUrl] = useState(() => {
    return createUpdateContextInUrl({ toastsService, urlStateStorage });
  });
  const [listenForUrlChanges] = useState(() => {
    return createListenForUrlChanges({ urlStateStorage });
  });

  return (
    <LogViewProvider
      logViews={logsShared.logViews.client}
      projectRouting={projectRouting}
      initializeFromUrl={initializeFromUrl}
      updateContextInUrl={updateContextInUrl}
      listenForUrlChanges={listenForUrlChanges}
    >
      <LogSourcesProvider logSourcesService={logsDataAccess.services.logSourcesService}>
        <LogAnalysisCapabilitiesProvider>{children}</LogAnalysisCapabilitiesProvider>
      </LogSourcesProvider>
    </LogViewProvider>
  );
};
