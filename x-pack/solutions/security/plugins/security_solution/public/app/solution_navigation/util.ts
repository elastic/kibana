/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ExternalPageName, SecurityPageName } from '@kbn/security-solution-navigation';
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

// We need to hide breadcrumbs for some pages (tabs) because they appear duplicated.
// These breadcrumbs are incorrectly processed as trailing breadcrumbs in SecuritySolution, because of `SpyRoute` architecture limitations.
// They are navLinks tree with a SecurityPageName, so they should be treated as leading breadcrumbs in ESS as well.
// TODO: Improve the breadcrumbs logic in `use_breadcrumbs_nav` to avoid this workaround.
const HIDDEN_BREADCRUMBS = new Set<SolutionPageName>([
  SecurityPageName.networkFlows,
  SecurityPageName.networkDns,
  SecurityPageName.networkHttp,
  SecurityPageName.networkTls,
  SecurityPageName.networkAnomalies,
  SecurityPageName.networkEvents,
  SecurityPageName.usersAll,
  SecurityPageName.usersAuthentications,
  SecurityPageName.usersAnomalies,
  SecurityPageName.usersRisk,
  SecurityPageName.usersEvents,
  SecurityPageName.hostsAll,
  SecurityPageName.hostsUncommonProcesses,
  SecurityPageName.hostsAnomalies,
  SecurityPageName.hostsEvents,
  SecurityPageName.hostsRisk,
  SecurityPageName.hostsSessions,
]);

export const isBreadcrumbHidden = (id: SolutionPageName): boolean =>
  HIDDEN_BREADCRUMBS.has(id) ||
  /* management sub-pages set their breadcrumbs themselves, the main Management breadcrumb is configured with our navigationTree definition */
  (id.startsWith(ExternalPageName.management) && id !== ExternalPageName.management);
