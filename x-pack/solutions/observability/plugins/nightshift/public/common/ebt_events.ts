/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AnalyticsServiceSetup, AnalyticsServiceStart } from '@kbn/core/public';
import type { InvestigationSummary } from '@kbn/agentic-investigations-plugin/common';
import type { Severity, SeverityCounts } from '@kbn/nightshift-investigations-plugin/common';

/**
 * Custom Nightshift EBT events.
 *
 * Click tracking (`@kbn/ebt-click`) covers intents expressed by a click and can only carry
 * `action`, `element` and `detail`. These events cover what clicks cannot: things that are not
 * clicks (page loads, deep links, typing) and things that need an id to join on
 * (`investigation_id`).
 */
export const NIGHTSHIFT_EBT_EVENTS = {
  /** The investigations landing page finished its first load. */
  HOMEPAGE_VIEWED: 'nightshift_homepage_viewed',
  /** An investigation was rendered, whether reached by click or by deep link. */
  INVESTIGATION_VIEWED: 'nightshift_investigation_viewed',
  /** The user searched the investigations list. The term itself is never reported. */
  INVESTIGATIONS_SEARCHED: 'nightshift_investigations_searched',
} as const;

/** How the user arrived at the investigation they are viewing. */
export const INVESTIGATION_VIEW_SOURCES = {
  /** Clicked an investigation in the list or in a significant event flyout. */
  CLICK: 'click',
  /** Opened by `?investigationId=` on page load, for example from a shared link or Slack. */
  DEEP_LINK: 'deepLink',
} as const;

export type InvestigationViewSource =
  (typeof INVESTIGATION_VIEW_SOURCES)[keyof typeof INVESTIGATION_VIEW_SOURCES];

interface HomepageViewedProps {
  investigation_count: number;
  /** Loaded investigations per severity, one field per `SEVERITY_OPTIONS` entry. */
  critical_count: number;
  high_count: number;
  medium_count: number;
  low_count: number;
  unrated_count: number;
}

interface InvestigationViewedProps {
  investigation_id: string;
  source: InvestigationViewSource;
  severity?: Severity;
  status?: string;
  in_progress?: boolean;
  subject_count?: number;
  pending_proposal_count?: number;
}

interface InvestigationsSearchedProps {
  /** Length only: search terms are customer data and are never reported. */
  query_length: number;
  /** Investigations the search matched, so empty results are distinguishable from hits. */
  result_count: number;
}

const severityCountField = (severity: Severity) => ({
  type: 'long' as const,
  _meta: { description: `Number of loaded investigations rated ${severity}.` },
});

/** Registers every custom Nightshift EBT event. Call once, from the plugin's `setup`. */
export const registerNightshiftEbtEvents = (analytics: AnalyticsServiceSetup): void => {
  analytics.registerEventType<HomepageViewedProps>({
    eventType: NIGHTSHIFT_EBT_EVENTS.HOMEPAGE_VIEWED,
    schema: {
      investigation_count: {
        type: 'long',
        _meta: { description: 'Number of investigations loaded on the landing page.' },
      },
      critical_count: severityCountField('critical'),
      high_count: severityCountField('high'),
      medium_count: severityCountField('medium'),
      low_count: severityCountField('low'),
      unrated_count: {
        type: 'long',
        _meta: { description: 'Number of loaded investigations without a severity rating.' },
      },
    },
  });

  analytics.registerEventType<InvestigationViewedProps>({
    eventType: NIGHTSHIFT_EBT_EVENTS.INVESTIGATION_VIEWED,
    schema: {
      investigation_id: {
        type: 'keyword',
        _meta: {
          description:
            'Id of the viewed investigation (the Agent Builder conversation id), to join a click with what it opened.',
        },
      },
      source: {
        type: 'keyword',
        _meta: { description: 'How the investigation was reached: click or deepLink.' },
      },
      severity: {
        type: 'keyword',
        _meta: { description: 'Severity of the investigation.', optional: true },
      },
      status: {
        type: 'keyword',
        _meta: { description: 'Investigation status, for example open or closed.', optional: true },
      },
      in_progress: {
        type: 'boolean',
        _meta: { description: 'A worker was still running for the investigation.', optional: true },
      },
      subject_count: {
        type: 'long',
        _meta: { description: 'Number of subjects the investigation covers.', optional: true },
      },
      pending_proposal_count: {
        type: 'long',
        _meta: {
          description: 'Number of proposed actions awaiting a decision.',
          optional: true,
        },
      },
    },
  });

  analytics.registerEventType<InvestigationsSearchedProps>({
    eventType: NIGHTSHIFT_EBT_EVENTS.INVESTIGATIONS_SEARCHED,
    schema: {
      query_length: {
        type: 'long',
        _meta: { description: 'Length of the search term. The term itself is never reported.' },
      },
      result_count: {
        type: 'long',
        _meta: { description: 'Number of investigations the search matched.' },
      },
    },
  });
};

/** Reports that the landing page finished loading, with the investigation counts it shows. */
export const reportNightshiftHomepageViewed = (
  analytics: AnalyticsServiceStart,
  {
    investigationCount,
    severityCounts,
    unratedCount,
  }: {
    investigationCount: number;
    severityCounts: SeverityCounts;
    unratedCount: number;
  }
): void => {
  analytics.reportEvent<HomepageViewedProps>(NIGHTSHIFT_EBT_EVENTS.HOMEPAGE_VIEWED, {
    investigation_count: investigationCount,
    critical_count: severityCounts.critical,
    high_count: severityCounts.high,
    medium_count: severityCounts.medium,
    low_count: severityCounts.low,
    unrated_count: unratedCount,
  });
};

/**
 * Reports that an investigation is on screen. `investigation` is absent when a deep link opens an
 * investigation the list has not loaded, in which case only the id and the source are known.
 */
export const reportNightshiftInvestigationViewed = (
  analytics: AnalyticsServiceStart,
  {
    investigationId,
    source,
    investigation,
  }: {
    investigationId: string;
    source: InvestigationViewSource;
    investigation?: InvestigationSummary;
  }
): void => {
  analytics.reportEvent<InvestigationViewedProps>(NIGHTSHIFT_EBT_EVENTS.INVESTIGATION_VIEWED, {
    investigation_id: investigationId,
    source,
    severity: investigation?.metadata.severity,
    status: investigation?.metadata.status,
    in_progress: investigation?.in_progress,
    subject_count: investigation?.subjects.length,
    pending_proposal_count: investigation?.pending_proposal_count,
  });
};

/** Reports that the user searched the investigations list, without the term itself. */
export const reportNightshiftInvestigationsSearched = (
  analytics: AnalyticsServiceStart,
  { queryLength, resultCount }: { queryLength: number; resultCount: number }
): void => {
  analytics.reportEvent<InvestigationsSearchedProps>(
    NIGHTSHIFT_EBT_EVENTS.INVESTIGATIONS_SEARCHED,
    { query_length: queryLength, result_count: resultCount }
  );
};
