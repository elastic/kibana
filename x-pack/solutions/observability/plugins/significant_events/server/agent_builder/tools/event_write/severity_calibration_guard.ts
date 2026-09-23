/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  Severity,
  SignificantEvent,
  SignificantEventStatus,
} from '@kbn/significant-events-schema';
import { addsNewDetectionRules, extractRuleUuids } from './episode_context';

export type EventsWriteSource = 'discovery';

const hasCompletedInvestigation = (event: SignificantEvent): boolean =>
  event.investigations?.some(({ completed_at: completedAt }) => completedAt !== undefined) ?? false;

const hasNewConfirmedRule = (
  signals: SignificantEvent['signals'],
  latestEvent: SignificantEvent
): boolean =>
  addsNewDetectionRules(
    extractRuleUuids((signals ?? []).filter(({ verdict }) => verdict === 'confirms')),
    extractRuleUuids(latestEvent.signals)
  );

/** Preserves an investigated event's current severity unless Discovery supplies an unlock. */
export const getCalibratedSeverity = ({
  source,
  latestEvent,
  proposedSeverity,
  proposedStatus,
  proposedSignals,
}: {
  source?: EventsWriteSource;
  latestEvent?: SignificantEvent;
  proposedSeverity: Severity;
  proposedStatus: SignificantEventStatus;
  proposedSignals?: SignificantEvent['signals'];
}): SignificantEvent['severity'] => {
  if (
    source !== 'discovery' ||
    latestEvent === undefined ||
    !hasCompletedInvestigation(latestEvent)
  ) {
    return proposedSeverity;
  }

  const isResolution = proposedStatus === 'closed' || proposedStatus === 'dismissed';
  const isReopen = latestEvent.status !== 'open' && proposedStatus === 'open';

  return isResolution || isReopen || hasNewConfirmedRule(proposedSignals, latestEvent)
    ? proposedSeverity
    : latestEvent.severity;
};
