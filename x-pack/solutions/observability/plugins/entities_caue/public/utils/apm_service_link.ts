/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ServiceOverviewParams } from '@kbn/observability-shared-plugin/common';
import { SERVICE_OVERVIEW_LOCATOR_ID } from '@kbn/observability-shared-plugin/common';
import type { SharePluginStart } from '@kbn/share-plugin/public';

export { SERVICE_OVERVIEW_LOCATOR_ID };

/**
 * Returns the URL for the APM service overview page, or undefined when APM's locator is
 * unavailable (e.g. APM plugin disabled). Uses `serviceOverviewLocator` from observability_shared
 * so we do not need to depend on @kbn/apm-plugin directly.
 *
 * Use `href` on an EuiLink rather than `locator.navigate()` so middle-click / cmd-click
 * ("open in new tab") works as expected — consistent with other APM links in the codebase.
 */
export const getApmServiceOverviewUrl = ({
  share,
  serviceName,
  environments,
}: {
  share: SharePluginStart;
  serviceName: string;
  /** Normalised list of environments for this service entity (may be empty). */
  environments: string[];
}): string | undefined => {
  const locator = share.url.locators.get<ServiceOverviewParams>(SERVICE_OVERVIEW_LOCATOR_ID);
  if (!locator || !serviceName) return undefined;

  // A service observed in exactly one environment → scope the link to it.
  // Zero or multiple → omit the filter so APM shows all environments.
  const environment = environments.length === 1 ? environments[0] : undefined;

  return locator.getRedirectUrl({ serviceName, environment });
};
