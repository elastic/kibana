/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';
import { SESSIONS_WINDOW_DAYS } from '../constants';
import type { AgentIdentity } from '../types';
import {
  buildAgentActivity,
  getLaunchMode,
  getOwnRootResolver,
  getRunAlertIds,
  getRunStatus,
  hasPermissionBypass,
  mergeProcessEvents,
  parseHeadlessPrompt,
  RUN_END_MARGIN_MS,
  RUNNING_CAP_MS,
} from './build_agent_activity';
import type {
  AgentSession,
  AgentSessionDetail,
  AgentSessions,
  LaunchMode,
  OtelMatch,
  OtelRecord,
  ProcessRecord,
  RunAlertRecord,
  SessionDay,
  SideEffects,
  TimeWindow,
} from './types';

const toIso = (ms: number): string => new Date(ms).toISOString();

const DAY_MS = 86_400_000;

/** The fixed window the sessions read covers: the last 30 days, ending at `now`. */
export const getSessionsWindow = (now: number): TimeWindow => ({
  from: toIso(now - SESSIONS_WINDOW_DAYS * DAY_MS),
  to: toIso(now),
});

/**
 * The time a session's processes can fall in: from its start to a little past its end. A session
 * with no end event reaches to now, or to the running cap for one that never ended.
 */
export const getSessionWindow = (
  { start, end }: Pick<AgentSession, 'start' | 'end'>,
  now: number
): TimeWindow => ({
  from: start,
  to: end
    ? toIso(new Date(end).getTime() + RUN_END_MARGIN_MS)
    : toIso(Math.min(now, new Date(start).getTime() + RUNNING_CAP_MS)),
});

const isWithin = (timestamp: string, { from, to }: TimeWindow): boolean =>
  timestamp >= from && timestamp <= to;

const latest = (timestamps: ReadonlyArray<string | undefined>): string | undefined =>
  timestamps.reduce<string | undefined>(
    (max, value) => (value && (!max || value > max) ? value : max),
    undefined
  );

interface SessionDraft {
  readonly session: Omit<AgentSession, 'alertIds'>;
  readonly processIds: ReadonlySet<string>;
  readonly window: TimeWindow;
}

/**
 * Ties each alert to one session. An alert on one of the session's own processes, or on a direct
 * child of one, is tied by ID. An alert on a deeper descendant has no ancestry in the alerts index,
 * so it is tied by terminal session and event time when exactly one session matches.
 */
const placeAlerts = (
  drafts: readonly SessionDraft[],
  alerts: readonly RunAlertRecord[]
): Map<string, string[]> => {
  const placed = new Map<string, string[]>();
  const add = (sessionId: string, alertId: string) =>
    placed.set(sessionId, [...(placed.get(sessionId) ?? []), alertId]);
  for (const alert of alerts) {
    const byProcess = drafts.find(
      ({ processIds }) => getRunAlertIds(processIds, [alert]).length > 0
    );
    if (byProcess) {
      add(byProcess.session.id, alert.id);
    } else if (alert.eventTime) {
      const { eventTime, entryLeaderEntityId } = alert;
      const candidates = drafts.filter(
        ({ session, window }) =>
          isWithin(eventTime, window) &&
          (!entryLeaderEntityId ||
            !session.root.entryLeaderEntityId ||
            session.root.entryLeaderEntityId === entryLeaderEntityId)
      );
      if (candidates.length === 1) add(candidates[0].session.id, alert.id);
    }
  }
  return placed;
};

export interface BuildAgentSessionsParams {
  readonly identity: AgentIdentity;
  readonly window: TimeWindow;
  readonly ownEvents: readonly ProcessRecord[];
  /** When each agent process ended. Absent when end events couldn't be read. */
  readonly endTimes?: ReadonlyMap<string, string>;
  /** Alerts on the agent, newest first. */
  readonly alerts?: readonly RunAlertRecord[];
  /** Read time, in milliseconds. */
  readonly now?: number;
  readonly truncated?: boolean;
}

/**
 * The agent's sessions from the start events of its own processes, newest first. A session is one
 * launch: an agent process whose parent isn't the agent, plus the agent's re-execs. What the
 * session ran is left to its detail read.
 */
export const buildAgentSessions = ({
  identity,
  window,
  ownEvents,
  endTimes,
  alerts = [],
  now = Date.now(),
  truncated = false,
}: BuildAgentSessionsParams): AgentSessions => {
  const own = mergeProcessEvents(ownEvents);
  const rootOf = getOwnRootResolver(own);
  const membersByRoot = new Map<string, ProcessRecord[]>();
  for (const process of own.values()) {
    const rootId = rootOf(process.entityId);
    membersByRoot.set(rootId, [...(membersByRoot.get(rootId) ?? []), process]);
  }
  const endedProcessIds = endTimes ? new Set(endTimes.keys()) : undefined;

  const drafts: SessionDraft[] = [...membersByRoot.entries()].flatMap(([rootId, members]) => {
    const root = own.get(rootId);
    if (!root) return [];
    const status = getRunStatus(root, endedProcessIds, now);
    const end =
      status?.kind === 'ended'
        ? latest(members.map(({ entityId }) => endTimes?.get(entityId)))
        : undefined;
    const session = {
      id: root.entityId,
      root,
      start: root.timestamp,
      end,
      launchMode: getLaunchMode(root),
      isHeadless: parseHeadlessPrompt(root.args, root.commandLine).isHeadless,
      permissionPromptsOff: hasPermissionBypass(identity.agentName, root),
      status,
    };
    return [
      {
        session,
        processIds: new Set(members.map(({ entityId }) => entityId)),
        window: getSessionWindow(session, now),
      },
    ];
  });

  const alertIds = placeAlerts(drafts, alerts);
  const sessions = drafts
    .map(({ session }) => ({ ...session, alertIds: alertIds.get(session.id) ?? [] }))
    .sort((a, b) => b.start.localeCompare(a.start));

  return {
    sessions,
    window,
    ownEvents,
    endedProcessIds,
    alerts,
    now,
    truncated,
  };
};

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
