/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AiAgentActivity } from '@kbn/entity-store/common/domain/definitions/ai_agent_activity';
import {
  buildAgentSessions,
  getSessionsWindow,
} from '../../../../../common/entity_analytics/ai_security/activity/build_agent_sessions';
import type {
  LaunchMode,
  ProcessRecord,
} from '../../../../../common/entity_analytics/ai_security/activity/types';

/** Launch modes with no person at a terminal. */
const UNATTENDED_LAUNCH_MODES: ReadonlySet<LaunchMode> = new Set(['scheduled', 'scripted']);

const toUtcDay = (timestamp: string): string => new Date(timestamp).toISOString().slice(0, 10);

export interface ComputeAiAgentActivityParams {
  readonly agentName: string;
  /** Start events of the agent's own processes in the last 30 days, newest first. */
  readonly ownEvents: readonly ProcessRecord[];
  /** Run time, in milliseconds. */
  readonly now: number;
}

/** The agent's activity profile, from the same sessions the flyout's Agent activity tab lists. */
export const computeAiAgentActivity = ({
  agentName,
  ownEvents,
  now,
}: ComputeAiAgentActivityParams): AiAgentActivity => {
  const { sessions } = buildAgentSessions({
    identity: { agentName },
    window: getSessionsWindow(now),
    ownEvents,
    now,
  });
  return {
    sessions: sessions.length,
    active_days: new Set(sessions.map(({ start }) => toUtcDay(start))).size,
    unattended_sessions: sessions.filter(({ launchMode }) =>
      UNATTENDED_LAUNCH_MODES.has(launchMode)
    ).length,
    permission_bypass_sessions: sessions.filter(({ permissionPromptsOff }) => permissionPromptsOff)
      .length,
    computed_at: new Date(now).toISOString(),
  };
};
