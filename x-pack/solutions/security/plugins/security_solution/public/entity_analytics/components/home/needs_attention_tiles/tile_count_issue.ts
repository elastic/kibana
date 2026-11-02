/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

import type { TileCountIssue } from './data';
import { TILE_QUERY_TIMEOUT_MS } from './hooks/tile_query_timeout';

export type TileNoAccess = 'alerts' | 'anomalies' | 'risk';
export type TileMissingPrerequisite = 'alertsIndex' | 'anomalyJobs' | 'riskData';

const NO_ACCESS_TEXT: Record<TileNoAccess, string> = {
  alerts: i18n.translate('xpack.securitySolution.entityAnalytics.home.tiles.noAlertsAccess', {
    defaultMessage: 'Requires read access to alerts',
  }),
  anomalies: i18n.translate('xpack.securitySolution.entityAnalytics.home.tiles.noAnomaliesAccess', {
    defaultMessage: 'Requires read access to ML anomalies',
  }),
  risk: i18n.translate('xpack.securitySolution.entityAnalytics.home.tiles.noRiskAccess', {
    defaultMessage: 'Requires read access to risk scores',
  }),
};

const MISSING_PREREQUISITE: Record<TileMissingPrerequisite, TileCountIssue> = {
  alertsIndex: {
    kind: 'issue',
    cause: 'missing',
    icon: 'warning',
    text: i18n.translate('xpack.securitySolution.entityAnalytics.home.tiles.noAlertsIndex', {
      defaultMessage: 'Requires an alerts index',
    }),
    tooltip: i18n.translate('xpack.securitySolution.entityAnalytics.home.tiles.noAlertsIndexTip', {
      defaultMessage:
        'This space has no alerts index yet. Turn on detection rules in this space to start generating alerts.',
    }),
  },
  anomalyJobs: {
    kind: 'issue',
    cause: 'missing',
    icon: 'warning',
    text: i18n.translate('xpack.securitySolution.entityAnalytics.home.tiles.noAnomalyJobs', {
      defaultMessage: 'Requires anomaly detection jobs',
    }),
    tooltip: i18n.translate('xpack.securitySolution.entityAnalytics.home.tiles.noAnomalyJobsTip', {
      defaultMessage:
        'No anomaly detection jobs are running. Set up and start anomaly detection jobs in Machine Learning to see anomalous entities.',
    }),
  },
  riskData: {
    kind: 'issue',
    cause: 'missing',
    icon: 'warning',
    text: i18n.translate('xpack.securitySolution.entityAnalytics.home.tiles.noRiskData', {
      defaultMessage: 'Requires risk score history data',
    }),
    tooltip: i18n.translate('xpack.securitySolution.entityAnalytics.home.tiles.noRiskDataTip', {
      defaultMessage:
        'No risk score data yet. Turn on risk scoring in Entity analytics settings to see entities whose risk changed.',
    }),
  },
};

const TIMED_OUT: TileCountIssue = {
  kind: 'issue',
  cause: 'timedOut',
  icon: 'error',
  text: i18n.translate('xpack.securitySolution.entityAnalytics.home.tiles.countTimedOut', {
    defaultMessage: 'Query timed out',
  }),
  tooltip: i18n.translate('xpack.securitySolution.entityAnalytics.home.tiles.countTimedOutTip', {
    defaultMessage:
      'This metric took more than {seconds} seconds to load and was stopped. Try a shorter time range or narrower filters.',
    values: { seconds: TILE_QUERY_TIMEOUT_MS / 1000 },
  }),
};

const FAILED: TileCountIssue = {
  kind: 'issue',
  cause: 'failed',
  icon: 'error',
  text: i18n.translate('xpack.securitySolution.entityAnalytics.home.tiles.countFailed', {
    defaultMessage: "Couldn't load data",
  }),
  tooltip: i18n.translate('xpack.securitySolution.entityAnalytics.home.tiles.countFailedTip', {
    defaultMessage: "This metric couldn't load. Refresh the page to try again.",
  }),
};

/**
 * Why a tile can't show its count, or undefined when it can. The first cause that applies wins:
 * missing read access, a timeout, a missing prerequisite (alerts index, ML jobs), a failed query.
 */
export const getCountIssue = ({
  noAccess,
  timedOut,
  missing,
  hasError,
}: {
  noAccess?: TileNoAccess;
  timedOut: boolean;
  missing?: TileMissingPrerequisite;
  hasError: boolean;
}): TileCountIssue | undefined => {
  if (noAccess) return { kind: 'locked', text: NO_ACCESS_TEXT[noAccess] };
  if (timedOut) return TIMED_OUT;
  if (missing) return MISSING_PREREQUISITE[missing];
  if (hasError) return FAILED;
  return undefined;
};
