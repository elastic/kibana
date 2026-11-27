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
import {
  hasPlatformAlertReadCapabilities,
  hasPlatformRuleReadCapabilities,
} from '@kbn/rule-data-utils';
import { casesFeatureId } from '../../common';

/** Observability features whose privileges grant classic rule read. */
export function hasObservabilityRuleReadCapabilities(capabilities: Capabilities): boolean {
  const { apm, metrics, uptime, synthetics, slo } = capabilities.navLinks;
  /* logs is a special case.
   * It is not a nav link but still exists as a
   * Kibana feature privilege with attached rule types */
  const logs = capabilities.logs?.show;

  return Object.values({ apm, logs, metrics, uptime, synthetics, slo }).some(Boolean);
}

/** Observability features whose privileges grant classic alert read. */
export function hasObservabilityAlertReadCapabilities(capabilities: Capabilities): boolean {
  return (
    hasObservabilityRuleReadCapabilities(capabilities) ||
    capabilities.observabilityAlerts?.show === true
  );
}

/** Any privilege that can read rules on the Observability classic Rules page. */
export const hasClassicRulesReadCapability = (capabilities: Capabilities): boolean =>
  hasObservabilityRuleReadCapabilities(capabilities) ||
  hasPlatformRuleReadCapabilities(capabilities);

/** Any privilege that can read classic alerts, including alert-only features. */
export const hasClassicAlertsReadCapability = (capabilities: Capabilities): boolean =>
  hasObservabilityAlertReadCapabilities(capabilities) ||
  hasPlatformAlertReadCapabilities(capabilities);

function hasAccessToCases(capabilities: Capabilities): boolean {
  return Boolean(capabilities[casesFeatureId]?.read_cases);
}

export function updateGlobalNavigation({
  capabilities,
  deepLinks,
  updater$,
  pricing,
  showV1Alerts = true,
}: {
  capabilities: ApplicationStart['capabilities'];
  deepLinks: AppDeepLink[];
  updater$: Subject<AppUpdater>;
  pricing: PricingServiceStart;
  showV1Alerts?: boolean;
}) {
  const isCompleteOverviewEnabled = pricing.isFeatureAvailable('observability:complete_overview');
  const hasObsAlertCapabilities = hasObservabilityAlertReadCapabilities(capabilities);
  const hasObsRuleCapabilities = hasObservabilityRuleReadCapabilities(capabilities);
  const hasCasesAccess = hasAccessToCases(capabilities);
  // App access is capability-based only so the security gate applies on all pricing tiers.
  const isAccessible = hasObsAlertCapabilities || hasCasesAccess;
  // Nav visibility keeps the incomplete-overview pricing bypass (nav only, not AppStatus).
  const someVisible = hasObsAlertCapabilities || !isCompleteOverviewEnabled;

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
          if (hasObsAlertCapabilities) {
            const alertsVisibleIn: AppDeepLinkLocations[] = showV1Alerts
              ? ['classicSideNav', 'projectSideNav', 'globalSearch']
              : [];
            return { ...link, visibleIn: alertsVisibleIn };
          }
          return null;
        case 'rules':
          if (hasObsRuleCapabilities) {
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
