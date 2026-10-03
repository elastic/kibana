/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { RiskScoreStatusReason } from './types';

const NS = 'xpack.securitySolution.entityAnalytics.riskScoreStatus';

interface ReasonCopy {
  title: string;
  description: string;
  defaultActionLabel: string;
}

const COPY_BY_REASON: Record<RiskScoreStatusReason, ReasonCopy> = {
  no_matching_alerts: {
    title: i18n.translate(`${NS}.noMatchingAlerts.title`, {
      defaultMessage: 'No risk scores to display yet',
    }),
    description: i18n.translate(`${NS}.noMatchingAlerts.description`, {
      defaultMessage:
        'The risk engine ran successfully but found no alerts matching your entities in the current scoring window.',
    }),
    defaultActionLabel: i18n.translate(`${NS}.noMatchingAlerts.actionLabel`, {
      defaultMessage: 'Review engine settings',
    }),
  },
  engine_never_run: {
    title: i18n.translate(`${NS}.engineNeverRun.title`, {
      defaultMessage: "Risk engine hasn't run yet",
    }),
    description: i18n.translate(`${NS}.engineNeverRun.description`, {
      defaultMessage:
        "The engine is installed but hasn't completed a scoring run in this space yet. The first run may take a few minutes.",
    }),
    defaultActionLabel: i18n.translate(`${NS}.engineNeverRun.actionLabel`, {
      defaultMessage: 'Check engine status',
    }),
  },
  engine_disabled: {
    title: i18n.translate(`${NS}.engineDisabled.title`, {
      defaultMessage: 'Risk scoring is disabled',
    }),
    description: i18n.translate(`${NS}.engineDisabled.description`, {
      defaultMessage:
        'The risk engine is installed but currently disabled, so new scores are not being produced.',
    }),
    defaultActionLabel: i18n.translate(`${NS}.engineDisabled.actionLabel`, {
      defaultMessage: 'Enable risk engine',
    }),
  },
  engine_not_installed: {
    title: i18n.translate(`${NS}.engineNotInstalled.title`, {
      defaultMessage: 'Get started with risk scoring',
    }),
    description: i18n.translate(`${NS}.engineNotInstalled.description`, {
      defaultMessage:
        'Set up the risk engine to begin scoring users, hosts, and services based on alert activity.',
    }),
    defaultActionLabel: i18n.translate(`${NS}.engineNotInstalled.actionLabel`, {
      defaultMessage: 'Set up risk engine',
    }),
  },
  unknown: {
    title: i18n.translate(`${NS}.unknown.title`, {
      defaultMessage: 'No risk scores available',
    }),
    description: i18n.translate(`${NS}.unknown.description`, {
      defaultMessage: 'The risk engine has not produced scores for the entities in this view.',
    }),
    defaultActionLabel: i18n.translate(`${NS}.unknown.actionLabel`, {
      defaultMessage: 'Review engine settings',
    }),
  },
};

export const copyForReason = (reason: RiskScoreStatusReason): ReasonCopy => COPY_BY_REASON[reason];

export const FACT_LAST_RUN = (relativeTime: string) =>
  i18n.translate(`${NS}.facts.lastRun`, {
    defaultMessage: 'Engine healthy — last run {relativeTime}',
    values: { relativeTime },
  });

export const FACT_ENTITIES_TRACKED = (count: number) =>
  i18n.translate(`${NS}.facts.entitiesTracked`, {
    defaultMessage: '{count, plural, one {# entity} other {# entities}} tracked',
    values: { count },
  });

export const FACT_SCORING_WINDOW = (start: string, end: string) =>
  i18n.translate(`${NS}.facts.scoringWindow`, {
    defaultMessage: 'Scoring window — {start} to {end}',
    values: { start, end },
  });

export const FACT_MATCHING_ALERTS = (count: number) =>
  i18n.translate(`${NS}.facts.matchingAlerts`, {
    defaultMessage: '{count, plural, one {# matching alert} other {# matching alerts}} in window',
    values: { count },
  });
