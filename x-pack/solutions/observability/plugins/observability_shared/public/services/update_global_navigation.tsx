/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Subject } from 'rxjs';
import { AppUpdater, ApplicationStart, AppDeepLink } from '@kbn/core/public';
import { CasesDeepLinkId } from '@kbn/cases-plugin/public';
import { casesFeatureId } from '../../common';

export function updateGlobalNavigation({
  capabilities,
  deepLinks,
  updater$,
}: {
  capabilities: ApplicationStart['capabilities'];
  deepLinks: AppDeepLink[];
  updater$: Subject<AppUpdater>;
}) {
  const { apm, metrics, uptime, synthetics, slo } = capabilities.navLinks;
  /* logs is a special case.
   * It is not a nav link but still exists as a
   * Kibana feature privilege with attached rule types */
  const logs = capabilities.logs?.show;
  const someVisible = Object.values({
    apm,
    logs,
    metrics,
    uptime,
    synthetics,
    slo,
  }).some((visible) => visible);

  const updatedDeepLinks = deepLinks
    .map((link) => {
      switch (link.id) {
        case CasesDeepLinkId.cases:
          if (capabilities[casesFeatureId].read_cases) {
            return {
              ...link,
              visibleIn: ['sideNav', 'globalSearch'],
            };
          }
          return null;
        case 'alerts':
          if (someVisible) {
            return {
              ...link,
              visibleIn: ['sideNav', 'globalSearch'],
            };
          }
          return null;
        case 'rules':
          if (someVisible) {
            return {
              ...link,
              visibleIn: ['sideNav', 'globalSearch'],
            };
          }
          return null;
        default:
          return link;
      }
    })
    .filter((link): link is AppDeepLink => link !== null);

  updater$.next(() => ({
    deepLinks: updatedDeepLinks,
    visibleIn: someVisible ? ['sideNav', 'globalSearch', 'home', 'kibanaOverview'] : [],
  }));
}
