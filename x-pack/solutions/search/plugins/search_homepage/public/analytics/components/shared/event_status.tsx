/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { KbnSuccessCallout } from '@kbn/ui-callout';
import type { AnalyticsPageId } from './page_ids';
import { getPageTelemetryId, getPageTestSubj } from './page_ids';

interface EventsDetectedCalloutProps {
  page: AnalyticsPageId;
  /** What arrived: `events` on the analytics journey, plain `data` on the search journey. */
  dataKind?: 'events' | 'data';
  /** Undefined when the cluster reports data without naming a source. */
  sourceName: string | undefined;
  /** Set when a polite live region does not already wrap the callout. */
  announceOnMount: boolean;
  onDismiss?: () => void;
  /** The step that the arrival of events unlocks. */
  nextAction?: { label: string; onClick: () => void };
}

/** What the confirmation says, naming the source when it is known. */
export const getDetectedTitle = (
  dataKind: 'events' | 'data',
  sourceName: string | undefined
): string => {
  if (dataKind === 'data') {
    return sourceName === undefined
      ? i18n.translate('xpack.searchHomepage.analytics.eventStatus.dataDetected', {
          defaultMessage: 'Data detected',
        })
      : i18n.translate('xpack.searchHomepage.analytics.eventStatus.dataDetectedInSource', {
          defaultMessage: 'Data detected in {sourceName}',
          values: { sourceName },
        });
  }
  return sourceName === undefined
    ? i18n.translate('xpack.searchHomepage.analytics.eventStatus.detected', {
        defaultMessage: 'Events detected',
      })
    : i18n.translate('xpack.searchHomepage.analytics.eventStatus.detectedInSource', {
        defaultMessage: 'Events detected in {sourceName}',
        values: { sourceName },
      });
};

/** Calm confirmation that the first data has reached the cluster. */
export const EventsDetectedCallout = ({
  page,
  dataKind = 'events',
  sourceName,
  announceOnMount,
  onDismiss,
  nextAction,
}: EventsDetectedCalloutProps): React.JSX.Element => (
  <KbnSuccessCallout
    size="s"
    announceOnMount={announceOnMount}
    onDismiss={onDismiss}
    actionProps={
      nextAction && {
        primary: {
          onClick: nextAction.onClick,
          children: nextAction.label,
          'data-test-subj': getPageTestSubj(page, 'ExploreDetected'),
          'data-telemetry-id': getPageTelemetryId(page, 'exploreDetected'),
        },
      }
    }
    data-test-subj={getPageTestSubj(page, 'EventsDetected')}
    title={getDetectedTitle(dataKind, sourceName)}
  />
);
