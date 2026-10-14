/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { AlertSnoozeBadge, buildSnoozeSummary } from '@kbn/response-ops-alert-snooze';
import type { TopAlert } from '../../../typings/alerts';
import { useAlertSnoozeState } from '../hooks/use_alert_snooze_state';

export interface AlertSnoozeStatusProps {
  alert: TopAlert;
}

/**
 * Shows the same snooze/mute badge used in the alerts table next to the alert
 * status. The per-alert snooze state lives on the rule saved object, so it is
 * fetched here rather than read from the alert doc (which only carries the
 * boolean muted/snoozed flags).
 */
export function AlertSnoozeStatus({ alert }: AlertSnoozeStatusProps) {
  const { isMuted, snoozedInstance } = useAlertSnoozeState(alert);

  if (!isMuted && !snoozedInstance) {
    return null;
  }

  const summary = buildSnoozeSummary({
    isMuted,
    expiresAt: isMuted ? null : snoozedInstance?.expiresAt,
    conditions: snoozedInstance?.conditions,
    conditionOperator: snoozedInstance?.conditionOperator,
  });

  return <AlertSnoozeBadge summary={summary} />;
}
