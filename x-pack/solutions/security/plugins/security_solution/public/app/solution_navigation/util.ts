/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { APP_UI_ID } from '../../../common';
import type { SolutionPageName } from '../../common/links';

export const getNavLinkIdFromSolutionPageName = (solutionPageName: SolutionPageName): string => {
  const cleanId = solutionPageName.replace(/\/(.*)$/, ''); // remove any trailing path
  const fullId = cleanId.includes(':') ? cleanId : `${APP_UI_ID}:${cleanId}`; // add the Security appId if not defined
  return fullId.replace(/:$/, ''); // clean trailing separator to app root links to contain the appId alone
};

export const getSolutionPageNameFromNavLinkId = (navLinkId: string): SolutionPageName => {
  const cleanId = navLinkId.includes(':') ? navLinkId : `${navLinkId}:`; // add trailing separator to app root links that contain the appId alone
  const fullId = cleanId.replace(`${APP_UI_ID}:`, ''); // remove Security appId if present
  return fullId as SolutionPageName;
};
