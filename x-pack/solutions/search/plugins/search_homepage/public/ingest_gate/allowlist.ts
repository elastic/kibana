/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PLUGIN_ID } from '../../common';

const SEARCH_GETTING_STARTED = 'searchGettingStarted';
const SEARCH_INDEX_MANAGEMENT = 'elasticsearchIndexManagement';
// The serverless project's landing route, whose only content is a redirect to the home.
const SERVERLESS_HOME_REDIRECT = 'serverlessHomeRedirect';

type AllowedPaths = 'all' | readonly RegExp[];

/**
 * The pages that add data, by app. Patterns match the path inside the app, hash included.
 * Integrations and Fleet are allowed whole: adding an integration, a policy or an agent crosses
 * most of their routes.
 */
const INGEST_APPS: Readonly<Record<string, AllowedPaths>> = {
  [PLUGIN_ID]: 'all',
  [SEARCH_GETTING_STARTED]: 'all',
  [SERVERLESS_HOME_REDIRECT]: 'all',
  [SEARCH_INDEX_MANAGEMENT]: 'all',
  integrations: 'all',
  fleet: 'all',
  home: [/^\/?#\/tutorial_directory\/(fileDataViz|sampleData)(\/|\?|$)/],
  dev_tools: [/^\/?(#\/?)?$/, /^\/?#\/console(\/|\?|$)/],
  management: [/^\/(data\/(index_management|data_federation)|security\/api_keys)(\/|#|$)/],
};

/** Apps the user needs whatever the deployment holds, so the gate cannot lock them in. */
const ALWAYS_ALLOWED_APPS: readonly string[] = ['security_account'];

/** Apps whose pages are the gate itself or carry their own link back to it. */
const GATE_APPS: readonly string[] = [PLUGIN_ID, SEARCH_GETTING_STARTED, SERVERLESS_HOME_REDIRECT];

export interface GateLocation {
  /** Undefined while no app is mounted, as on an application-not-found page. */
  appId: string | undefined;
  /** Whether the app renders without the Kibana chrome by design, as login and error pages do. */
  isChromeless: boolean;
  /** The app's route without the base path. */
  appRoute: string | undefined;
  /** Path and hash without the base path. */
  location: string;
}

const getPathInApp = ({ appRoute, location }: GateLocation): string | undefined => {
  if (appRoute === undefined || !location.startsWith(appRoute)) {
    return undefined;
  }
  const pathInApp = location.slice(appRoute.length);
  return pathInApp === '' || /^[/#?]/.test(pathInApp) ? pathInApp : undefined;
};

/** Whether a page can be opened while the deployment holds no data. */
export const isAllowedWhileGated = (gateLocation: GateLocation): boolean => {
  const { appId, isChromeless } = gateLocation;
  if (appId === undefined || isChromeless || ALWAYS_ALLOWED_APPS.includes(appId)) {
    return true;
  }
  const pathInApp = getPathInApp(gateLocation);
  // The app changes before the location does, so a location outside the app is a navigation
  // in flight, judged once it lands.
  if (pathInApp === undefined) {
    return true;
  }
  if (!Object.hasOwn(INGEST_APPS, appId)) {
    return false;
  }
  const allowedPaths = INGEST_APPS[appId];
  return allowedPaths === 'all' || allowedPaths.some((pattern) => pattern.test(pathInApp));
};

/** Whether a page reachable while gated needs the control that leads back to the home. */
export const needsWayBack = ({ appId, isChromeless }: GateLocation): boolean =>
  appId !== undefined && !isChromeless && !GATE_APPS.includes(appId);
