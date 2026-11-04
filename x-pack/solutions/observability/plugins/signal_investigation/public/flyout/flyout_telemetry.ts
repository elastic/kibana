/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AnalyticsServiceSetup, AnalyticsServiceStart } from '@kbn/core/public';
import type { InvestigationSeed } from '@kbn/investigation-seed';
import { getSignalInvestigationAnalyticsSetup } from '../telemetry/shown_telemetry';
import type { LeadFeedbackVerdict } from './lead_feedback';

export const SIGNAL_INVESTIGATION_OPENED_EVENT = 'signal_investigation_opened' as const;
export const SIGNAL_INVESTIGATION_LEAD_CLICKED_EVENT = 'signal_investigation_lead_clicked' as const;
export const SIGNAL_INVESTIGATION_LEAD_FEEDBACK_EVENT =
  'signal_investigation_lead_feedback' as const;

const registeredFlyoutSetupInstances = new WeakSet<AnalyticsServiceSetup>();

/**
 * Registers the three flyout EBT events (`opened`, `lead_clicked`, `lead_feedback`)
 * when the flyout module loads so their schemas stay out of the page-load bundle.
 */
export const registerFlyoutTelemetryEvents = (
  setup: AnalyticsServiceSetup | undefined = getSignalInvestigationAnalyticsSetup()
): void => {
  if (!setup || registeredFlyoutSetupInstances.has(setup)) {
    return;
  }
  registeredFlyoutSetupInstances.add(setup);

  setup.registerEventType({
    eventType: SIGNAL_INVESTIGATION_OPENED_EVENT,
    schema: {
      app: {
        type: 'keyword',
        _meta: {
          description: 'Origin application of the signal investigation.',
        },
      },
      surface: {
        type: 'keyword',
        _meta: {
          description: 'Origin UI surface of the signal investigation.',
        },
      },
    },
  });

  setup.registerEventType({
    eventType: SIGNAL_INVESTIGATION_LEAD_CLICKED_EVENT,
    schema: {
      analyzerId: {
        type: 'keyword',
        _meta: {
          description: 'Identifier of the analyzer that produced the clicked lead.',
        },
      },
      rank: {
        type: 'long',
        _meta: {
          description: 'One-based rank position of the clicked lead in the flyout.',
        },
      },
    },
  });

  setup.registerEventType({
    eventType: SIGNAL_INVESTIGATION_LEAD_FEEDBACK_EVENT,
    schema: {
      analyzerId: {
        type: 'keyword',
        _meta: {
          description: 'Identifier of the analyzer that produced the rated lead.',
        },
      },
      rank: {
        type: 'long',
        _meta: {
          description: 'One-based rank position of the rated lead in the flyout.',
        },
      },
      verdict: {
        type: 'keyword',
        _meta: {
          description: 'User feedback verdict: useful or not_useful.',
        },
      },
    },
  });
};

registerFlyoutTelemetryEvents();

/** Derives a non-sensitive surface label from the investigation seed origin. */
export const originSurface = (seed: InvestigationSeed): string => {
  if (seed.origin.app === 'discover') {
    return seed.origin.surface;
  }
  if (seed.origin.app === 'dashboard') {
    return seed.selection ? 'chartBrush' : 'panelMenu';
  }
  return 'alert';
};

const safeReport = (
  analytics: Pick<AnalyticsServiceStart, 'reportEvent'> | undefined,
  eventType: string,
  payload: Record<string, unknown>
): void => {
  if (!analytics) {
    return;
  }
  try {
    analytics.reportEvent(eventType, payload);
  } catch {
    // Telemetry errors must never break the feature.
  }
};

export const reportSignalInvestigationOpened = (
  analytics: Pick<AnalyticsServiceStart, 'reportEvent'> | undefined,
  seed: InvestigationSeed
): void => {
  registerFlyoutTelemetryEvents();
  safeReport(analytics, SIGNAL_INVESTIGATION_OPENED_EVENT, {
    app: seed.origin.app,
    surface: originSurface(seed),
  });
};

export const reportSignalInvestigationLeadClicked = (
  analytics: Pick<AnalyticsServiceStart, 'reportEvent'> | undefined,
  params: { analyzerId: string; rank: number }
): void => {
  registerFlyoutTelemetryEvents();
  safeReport(analytics, SIGNAL_INVESTIGATION_LEAD_CLICKED_EVENT, {
    analyzerId: params.analyzerId,
    rank: params.rank,
  });
};

export const reportSignalInvestigationLeadFeedback = (
  analytics: Pick<AnalyticsServiceStart, 'reportEvent'> | undefined,
  params: { analyzerId: string; rank: number; verdict: LeadFeedbackVerdict }
): void => {
  registerFlyoutTelemetryEvents();
  safeReport(analytics, SIGNAL_INVESTIGATION_LEAD_FEEDBACK_EVENT, {
    analyzerId: params.analyzerId,
    rank: params.rank,
    verdict: params.verdict,
  });
};
