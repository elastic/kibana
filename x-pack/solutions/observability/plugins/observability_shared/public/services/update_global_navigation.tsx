/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Subject } from 'rxjs';
import type {
  AppUpdater,
  ApplicationStart,
  AppDeepLink,
  AppDeepLinkLocations,
  Capabilities,
} from '@kbn/core/public';
import { AppStatus, type PricingServiceStart } from '@kbn/core/public';
import { CasesDeepLinkId } from '@kbn/cases-plugin/public';
import { casesFeatureId } from '../../common';

/** Capability-based Observability access — pricing tiers do not affect this. */
function hasObservabilityCapabilities(capabilities: Capabilities): boolean {
  const { apm, metrics, uptime, synthetics, slo } = capabilities.navLinks;
  /* logs is a special case.
   * It is not a nav link but still exists as a
   * Kibana feature privilege with attached rule types */
  const logs = capabilities.logs?.show;
  const observabilityAlerts = capabilities.observabilityAlerts?.show;

  return Object.values({
    apm,
    logs,
    metrics,
    uptime,
    synthetics,
    slo,
    observabilityAlerts,
  }).some(Boolean);
}

function hasAccessToCases(capabilities: Capabilities): boolean {
  return Boolean(capabilities[casesFeatureId]?.read_cases);
}

export function updateGlobalNavigation({
  capabilities,
  deepLinks,
  updater$,
  pricing,
}: {
  capabilities: ApplicationStart['capabilities'];
  deepLinks: AppDeepLink[];
  updater$: Subject<AppUpdater>;
  pricing: PricingServiceStart;
}) {
  const isCompleteOverviewEnabled = pricing.isFeatureAvailable('observability:complete_overview');
  const hasObsCapabilities = hasObservabilityCapabilities(capabilities);
  const hasCasesAccess = hasAccessToCases(capabilities);
  // App access is capability-based only so the security gate applies on all pricing tiers.
  const isAccessible = hasObsCapabilities || hasCasesAccess;
  // Nav visibility keeps the incomplete-overview pricing bypass (nav only, not AppStatus).
  const someVisible = hasObsCapabilities || !isCompleteOverviewEnabled;

  const updatedDeepLinks = deepLinks
    .map((link) => {
      switch (link.id) {
        case CasesDeepLinkId.cases:
          if (hasCasesAccess) {
            return {
              ...link,
              visibleIn: ['classicSideNav', 'projectSideNav', 'globalSearch'],
            };
          }
          return null;
        case 'alerts':
          // Observability feature access only — cases-only users do not get alerts/rules nav.
          if (hasObsCapabilities) {
            return {
              ...link,
              visibleIn: ['classicSideNav', 'projectSideNav', 'globalSearch'],
            };
          }
          return null;
        case 'rules':
          if (hasObsCapabilities) {
            return {
              ...link,
              visibleIn: ['classicSideNav', 'projectSideNav', 'globalSearch'],
            };
          }
          return null;
        default:
          return link;
      }
    })
    .filter((link): link is AppDeepLink => link !== null);

  updater$.next(() => {
    if (!isAccessible) {
      return {
        deepLinks: [],
        status: AppStatus.inaccessible,
        visibleIn: [],
      };
    }

    const visibleIn: AppDeepLinkLocations[] = someVisible
      ? ['classicSideNav', 'projectSideNav', 'home', 'kibanaOverview']
      : [];

    if (isCompleteOverviewEnabled && someVisible) {
      visibleIn.push('globalSearch');
    }

    return {
      deepLinks: updatedDeepLinks,
      status: AppStatus.accessible,
      visibleIn,
    };
  });
}
