/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect } from 'react';
import ReactDOM from 'react-dom';
import { useLocation } from 'react-router-dom';
import useLocalStorage from 'react-use/lib/useLocalStorage';
import { Router } from '@kbn/shared-ux-router';
import {
  OBSERVABILITY_LOGS_EXPLORER_APP_ID,
  OBS_LOGS_EXPLORER_LOGS_VIEWER_KEY,
} from '@kbn/deeplinks-observability';
import { DISCOVER_APP_ID } from '@kbn/deeplinks-analytics';
import { AppMountParameters, CoreStart } from '@kbn/core/public';

export const renderLastUsedLogsViewerRedirect = (
  core: CoreStart,
  appParams: AppMountParameters
) => {
  ReactDOM.render(
    <Router history={appParams.history}>
      <LastUsedLogsViewerRedirect core={core} />
    </Router>,
    appParams.element
  );

  return () => {
    ReactDOM.unmountComponentAtNode(appParams.element);
  };
};

export const LastUsedLogsViewerRedirect = ({ core }: { core: CoreStart }) => {
  const location = useLocation();
  const path = `${location.pathname}${location.search}`;
  const [lastUsedLogsViewApp] = useLocalStorage<
    typeof DISCOVER_APP_ID | typeof OBSERVABILITY_LOGS_EXPLORER_APP_ID
  >(OBS_LOGS_EXPLORER_LOGS_VIEWER_KEY, OBSERVABILITY_LOGS_EXPLORER_APP_ID);

  if (
    lastUsedLogsViewApp &&
    lastUsedLogsViewApp !== DISCOVER_APP_ID &&
    lastUsedLogsViewApp !== OBSERVABILITY_LOGS_EXPLORER_APP_ID
  ) {
    throw new Error(
      `Invalid last used logs viewer app: "${lastUsedLogsViewApp}". Allowed values are "${DISCOVER_APP_ID}" and "${OBSERVABILITY_LOGS_EXPLORER_APP_ID}"`
    );
  }

  useEffect(() => {
    if (lastUsedLogsViewApp === DISCOVER_APP_ID) {
      core.application.navigateToApp(DISCOVER_APP_ID, { replace: true, path });
    }

    if (lastUsedLogsViewApp === OBSERVABILITY_LOGS_EXPLORER_APP_ID) {
      core.application.navigateToApp(OBSERVABILITY_LOGS_EXPLORER_APP_ID, { replace: true, path });
    }
  }, [core, path, lastUsedLogsViewApp]);

  return <></>;
};
