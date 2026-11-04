/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import {
  type InvestigationSeed,
  isEsqlQuery,
  resolveInvestigationHosts,
} from '@kbn/investigation-seed';
import type {
  AnalyzerResultStatus,
  SignalAnalyzerResult,
} from '@kbn/signal-investigation-contract';
import { inapplicabilityMessage } from './analyzer_applicability';

export const SERVICE_HOSTS_ANALYZER_ID = 'service_hosts';

const HOST_DEPENDENT_ANALYZERS: ReadonlySet<string> = new Set(['metric_change_points']);

export interface HostResolutionPlan {
  waitingForServiceHosts: boolean;
  hosts: string[];
  seedForHostAnalysis: InvestigationSeed;
  fallbackMessage?: string;
  skippedStatus?: Exclude<AnalyzerResultStatus, 'found' | 'indeterminable' | 'not_set_up'>;
  skippedMessage?: string;
}

/** True when the analyzer provides context entities rather than user-facing leads. */
export const isContextAnalyzer = (analyzerId: string): boolean =>
  analyzerId === SERVICE_HOSTS_ANALYZER_ID;

/** True when the analyzer requires host names resolved from the seed or from service_hosts. */
export const isHostDependentAnalyzer = (analyzerId: string): boolean =>
  HOST_DEPENDENT_ANALYZERS.has(analyzerId);

/** Resolves hosts for host-dependent analyses and sequences them after service_hosts when needed. */
export const resolveHostPlan = ({
  seed,
  hasServiceHostsInCatalog,
  serviceHostsLoading,
  serviceHostsResult,
}: {
  seed: InvestigationSeed;
  hasServiceHostsInCatalog: boolean;
  serviceHostsLoading: boolean;
  serviceHostsResult?: SignalAnalyzerResult;
}): HostResolutionPlan => {
  if (seed.query && isEsqlQuery(seed.query)) {
    return {
      waitingForServiceHosts: false,
      hosts: [],
      seedForHostAnalysis: seed,
      skippedStatus: 'not_applicable',
      skippedMessage: inapplicabilityMessage('metric_change_points', seed),
    };
  }

  const serviceName = seed.entities['service.name'];
  if (!serviceName) {
    const hosts = resolveInvestigationHosts(seed);
    if (hosts.length === 0) {
      return {
        waitingForServiceHosts: false,
        hosts: [],
        seedForHostAnalysis: seed,
        skippedStatus: 'not_applicable',
        skippedMessage: inapplicabilityMessage('metric_change_points', seed),
      };
    }
    return {
      waitingForServiceHosts: false,
      hosts,
      seedForHostAnalysis: { ...seed, hosts },
    };
  }

  if (hasServiceHostsInCatalog && serviceHostsLoading) {
    return {
      waitingForServiceHosts: true,
      hosts: [],
      seedForHostAnalysis: seed,
    };
  }

  const serviceHostsRan =
    hasServiceHostsInCatalog &&
    serviceHostsResult &&
    (serviceHostsResult.status === 'found' || serviceHostsResult.status === 'no_change');

  if (serviceHostsRan) {
    const discovered = serviceHostsResult.entities?.['host.name'] ?? [];
    const hosts = resolveInvestigationHosts({ ...seed, hosts: [...discovered] });
    if (hosts.length === 0) {
      return {
        waitingForServiceHosts: false,
        hosts: [],
        seedForHostAnalysis: seed,
        skippedStatus: 'no_change',
        skippedMessage: i18n.translate('xpack.signalInvestigation.flyout.noServiceHostsFound', {
          defaultMessage: 'No hosts were found for service {serviceName}.',
          values: { serviceName },
        }),
      };
    }
    return {
      waitingForServiceHosts: false,
      hosts,
      seedForHostAnalysis: {
        ...seed,
        hosts,
        entities: {
          ...seed.entities,
          ...(seed.entities['host.name'] ? {} : { 'host.name': hosts[0] }),
        },
      },
      fallbackMessage: serviceHostsResult.message,
    };
  }

  // service_hosts was skipped (APM disabled, no access, or failed): fall back to the seed host.
  const seedHosts = resolveInvestigationHosts(seed);
  if (seedHosts.length > 0) {
    return {
      waitingForServiceHosts: false,
      hosts: seedHosts,
      seedForHostAnalysis: { ...seed, hosts: seedHosts },
      fallbackMessage: i18n.translate('xpack.signalInvestigation.flyout.hostFallbackToSeed', {
        defaultMessage: 'Service hosts could not be resolved; checked only {hostName}.',
        values: { hostName: seedHosts[0] },
      }),
    };
  }

  if (serviceHostsResult?.status === 'no_access') {
    return {
      waitingForServiceHosts: false,
      hosts: [],
      seedForHostAnalysis: seed,
      skippedStatus: 'no_access',
    };
  }

  return {
    waitingForServiceHosts: false,
    hosts: [],
    seedForHostAnalysis: seed,
    skippedStatus: 'skipped',
    skippedMessage: i18n.translate('xpack.signalInvestigation.flyout.hostSkippedNoSeedHost', {
      defaultMessage: 'Service hosts could not be resolved and the seed has no host name.',
    }),
  };
};

export const combineCoverageMessages = (
  primary: string | undefined,
  secondary: string | undefined
): string | undefined => {
  const parts = [primary, secondary].filter(
    (part): part is string => typeof part === 'string' && part.length > 0
  );
  return parts.length > 0 ? parts.join(' ') : undefined;
};
