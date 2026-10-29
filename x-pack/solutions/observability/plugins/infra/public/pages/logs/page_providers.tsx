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
import {
  MlCpsCapabilityProvider,
  useInfraMlCpsPickerAccess,
  useIsInfraMlCpsEnabled,
} from '../../hooks/use_infra_ml_cps';
import { useKibanaContextForPlugin } from '../../hooks/use_kibana';
import { useKbnUrlStateStorageFromRouterContext } from '../../containers/kbn_url_state_context';

// The ML CPS capability must be settled before the inner providers mount, because the log view
// state machine below captures its project routing when its actor is created.
export const LogsPageProviders: FC<PropsWithChildren<unknown>> = ({ children }) => (
  <MlCpsCapabilityProvider>
    <LogsPageProvidersContent>{children}</LogsPageProvidersContent>
  </MlCpsCapabilityProvider>
);

const LogsPageProvidersContent: FC<PropsWithChildren<unknown>> = ({ children }) => {
  const {
    services: {
      notifications: { toasts: toastsService },
      logsShared,
      logsDataAccess,
    },
  } = useKibanaContextForPlugin();

  useInfraMlCpsPickerAccess();

  // The project picker is read-only for this app because project scope is a per-job property of
  // the ML jobs these pages render, so the picker cannot answer "is there any log data?". Scope
  // the status query to all projects explicitly, otherwise it would be clamped to the origin
  // project and an origin without logs would render the "no data" screen despite a linked project
  // having them. Note that resolving the log view also fetches its data view's fields, which stays
  // origin-scoped: nothing in this app reads that field list, so it is knowingly left alone.
  const isCpsEnabled = useIsInfraMlCpsEnabled();
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
