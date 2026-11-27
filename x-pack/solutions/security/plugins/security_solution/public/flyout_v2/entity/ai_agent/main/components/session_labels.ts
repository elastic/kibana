/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type {
  AgentSession,
  LaunchMode,
} from '../../../../../entity_analytics/components/ai_security/activity/types';

export const LAUNCH_MODE_LABELS: Readonly<Record<LaunchMode, string>> = {
  interactive: i18n.translate(
    'xpack.securitySolution.flyout.entityDetails.aiAgent.activity.launch.interactive',
    { defaultMessage: 'Interactive' }
  ),
  scripted: i18n.translate(
    'xpack.securitySolution.flyout.entityDetails.aiAgent.activity.launch.scripted',
    { defaultMessage: 'Scripted' }
  ),
  scheduled: i18n.translate(
    'xpack.securitySolution.flyout.entityDetails.aiAgent.activity.launch.scheduled',
    { defaultMessage: 'Scheduled' }
  ),
  unknown: i18n.translate(
    'xpack.securitySolution.flyout.entityDetails.aiAgent.activity.launch.unknown',
    { defaultMessage: 'Launch mode unknown' }
  ),
};

/** The launch mode with the terminal session's leader, such as "Scheduled (crond)". */
export const getLaunchLabel = ({
  launchMode,
  root,
}: Pick<AgentSession, 'launchMode' | 'root'>): string =>
  root.entryLeaderName
    ? i18n.translate(
        'xpack.securitySolution.flyout.entityDetails.aiAgent.activity.launchWithLeader',
        {
          defaultMessage: '{mode} ({leader})',
          values: { mode: LAUNCH_MODE_LABELS[launchMode], leader: root.entryLeaderName },
        }
      )
    : LAUNCH_MODE_LABELS[launchMode];

/** A session's length to the second under an hour, and to the minute above it. */
export const formatSessionDuration = (ms: number): string => {
  const totalSeconds = Math.max(0, Math.round(ms / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (hours > 0) {
    return i18n.translate(
      'xpack.securitySolution.flyout.entityDetails.aiAgent.activity.durationHours',
      { defaultMessage: '{hours}h {minutes}m', values: { hours, minutes } }
    );
  }
  if (minutes > 0) {
    return i18n.translate(
      'xpack.securitySolution.flyout.entityDetails.aiAgent.activity.durationMinutes',
      { defaultMessage: '{minutes}m {seconds}s', values: { minutes, seconds } }
    );
  }
  return i18n.translate(
    'xpack.securitySolution.flyout.entityDetails.aiAgent.activity.durationSeconds',
    { defaultMessage: '{seconds}s', values: { seconds } }
  );
};
