/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ChromeBreadcrumb } from '@kbn/core/public';
import { AdministrationSubTab } from '../types';
import {
  ENDPOINTS_TAB,
  EVENT_FILTERS_TAB,
  POLICIES_TAB,
  ENDPOINT_EXCEPTIONS_TAB,
  TRUSTED_APPS_TAB,
  TRUSTED_DEVICES_TAB,
} from './translations';
import type { AdministrationRouteSpyState } from '../../common/utils/route/types';
import {
  HOST_ISOLATION_EXCEPTIONS,
  BLOCKLIST,
  RESPONSE_ACTIONS_HISTORY,
  SCRIPTS_LIBRARY,
  PROTECTION_UPDATES,
  NOTES,
} from '../../app/translations';

const TabNameMappedToI18nKey: Record<AdministrationSubTab, string> = {
  [AdministrationSubTab.endpoints]: ENDPOINTS_TAB,
  [AdministrationSubTab.policies]: POLICIES_TAB,
  [AdministrationSubTab.endpointExceptions]: ENDPOINT_EXCEPTIONS_TAB,
  [AdministrationSubTab.trustedApps]: TRUSTED_APPS_TAB,
  [AdministrationSubTab.trustedDevices]: TRUSTED_DEVICES_TAB,
  [AdministrationSubTab.eventFilters]: EVENT_FILTERS_TAB,
  [AdministrationSubTab.hostIsolationExceptions]: HOST_ISOLATION_EXCEPTIONS,
  [AdministrationSubTab.blocklist]: BLOCKLIST,
  [AdministrationSubTab.responseActionsHistory]: RESPONSE_ACTIONS_HISTORY,
  [AdministrationSubTab.scriptsLibrary]: SCRIPTS_LIBRARY,
  [AdministrationSubTab.protectionUpdates]: PROTECTION_UPDATES,
  [AdministrationSubTab.notes]: NOTES,
};

export function getTrailingBreadcrumbs(params: AdministrationRouteSpyState): ChromeBreadcrumb[] {
  return [
    ...(params?.tabName ? [params?.tabName] : []).map((tabName) => ({
      text: TabNameMappedToI18nKey[tabName],
      href: '',
    })),
  ];
}
