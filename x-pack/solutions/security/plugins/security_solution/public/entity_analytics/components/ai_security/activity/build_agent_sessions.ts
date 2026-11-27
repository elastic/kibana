/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';
import type { AgentIdentity } from '../types';
import { buildAgentActivity } from './build_agent_activity';
import type {
  AgentSession,
  AgentSessionDetail,
  AgentSessions,
  LaunchMode,
  OtelMatch,
  OtelRecord,
  ProcessRecord,
  SessionDay,
  SideEffects,
  TimeWindow,
} from './types';

export {
  buildAgentSessions,
  getSessionsWindow,
  getSessionWindow,
} from '../../../../../common/entity_analytics/ai_security/activity/build_agent_sessions';
export type { BuildAgentSessionsParams } from '../../../../../common/entity_analytics/ai_security/activity/build_agent_sessions';

/** Sessions per calendar day across the window, in Kibana's time zone. Days with none are zero. */
export const buildSessionDays = (
  sessions: readonly AgentSession[],
  { from, to }: TimeWindow
): SessionDay[] => {
  const counts = new Map<number, { sessions: number; sessionsWithAlerts: number }>();
  for (const { start, alertIds } of sessions) {
    const day = moment(start).startOf('day').valueOf();
    const count = counts.get(day) ?? { sessions: 0, sessionsWithAlerts: 0 };
    counts.set(day, {
      sessions: count.sessions + 1,
      sessionsWithAlerts: count.sessionsWithAlerts + (alertIds.length > 0 ? 1 : 0),
    });
  }
  const days: SessionDay[] = [];
  const last = moment(to).startOf('day').valueOf();
  for (const day = moment(from).startOf('day'); day.valueOf() <= last; day.add(1, 'day')) {
    const value = day.valueOf();
    days.push({ day: value, ...(counts.get(value) ?? { sessions: 0, sessionsWithAlerts: 0 }) });
  }
  return days;
};

export interface SessionsSummary {
  readonly byLaunchMode: Readonly<Record<LaunchMode, number>>;
  readonly headless: number;
  readonly permissionPromptsOff: number;
  readonly withAlerts: number;
}

export const summariseSessions = (sessions: readonly AgentSession[]): SessionsSummary => {
  const byLaunchMode: Record<LaunchMode, number> = {
    scheduled: 0,
    interactive: 0,
    scripted: 0,
    unknown: 0,
  };
  sessions.forEach(({ launchMode }) => {
    byLaunchMode[launchMode] += 1;
  });
  return {
    byLaunchMode,
    headless: sessions.filter(({ isHeadless }) => isHeadless).length,
    permissionPromptsOff: sessions.filter(({ permissionPromptsOff }) => permissionPromptsOff)
      .length,
    withAlerts: sessions.filter(({ alertIds }) => alertIds.length > 0).length,
  };
};

export interface BuildSessionDetailParams {
  readonly identity: AgentIdentity;
  readonly sessions: AgentSessions;
  readonly session: AgentSession;
  readonly descendantEvents: readonly ProcessRecord[];
  readonly sideEffects: ReadonlyMap<string, SideEffects>;
  readonly otelEvents: readonly OtelRecord[];
  readonly otelMatch: OtelMatch;
  /** Ordered `process.args` of the session's root, by process entity ID. */
  readonly rootArgs?: ReadonlyMap<string, readonly string[]>;
  readonly truncated?: boolean;
}

/**
 * One session's run, built with every session's own processes so the descendants of another
 * session running at the same time are placed there and left out, rather than shown as unplaced.
 */
export const buildSessionDetail = ({
  identity,
  sessions,
  session,
  descendantEvents,
  sideEffects,
  otelEvents,
  otelMatch,
  rootArgs,
  truncated = false,
}: BuildSessionDetailParams): Omit<AgentSessionDetail, 'otelFailed'> => {
  const activity = buildAgentActivity({
    identity,
    ownEvents: sessions.ownEvents,
    descendantEvents,
    sideEffects,
    otelEvents,
    otelMatch,
    rootArgs,
    endedProcessIds: sessions.endedProcessIds,
    alerts: sessions.alerts,
    now: sessions.now,
    truncated,
  });
  const run = activity.runs.find(({ id }) => id === session.id);
  const alertIds = new Set([...(run?.alertIds ?? []), ...session.alertIds]);
  return {
    run: run && {
      ...run,
      alertIds: sessions.alerts.filter(({ id }) => alertIds.has(id)).map(({ id }) => id),
    },
    unplacedSteps: activity.unplacedSteps,
    otelMatch: activity.otelMatch,
    truncated,
  };
};
