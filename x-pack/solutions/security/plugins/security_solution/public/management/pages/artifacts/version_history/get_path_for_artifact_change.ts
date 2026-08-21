/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ArtifactListPageUrlParams } from '../../../components/artifact_list_page';
import {
  getBlocklistsListPath,
  getEndpointExceptionsListPath,
  getEventFiltersListPath,
  getTrustedAppsListPath,
  getTrustedDevicesListPath,
} from '../../../common/routing';
import { AdministrationSubTab } from '../../../types';
import type { ArtifactChangeHistoryItem } from './types';

export const getPathForArtifactChange = (item: ArtifactChangeHistoryItem): string => {
  const location: Partial<ArtifactListPageUrlParams> = {
    page: 1,
    highlightItemId: item.artifactItemId,
  };

  switch (item.artifactTab) {
    case AdministrationSubTab.endpointExceptions:
      return getEndpointExceptionsListPath(location);
    case AdministrationSubTab.trustedApps:
      return getTrustedAppsListPath(location);
    case AdministrationSubTab.trustedDevices:
      return getTrustedDevicesListPath(location);
    case AdministrationSubTab.eventFilters:
      return getEventFiltersListPath(location);
    case AdministrationSubTab.blocklist:
      return getBlocklistsListPath(location);
    default:
      return getTrustedAppsListPath(location);
  }
};
