/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SESSIONS_WINDOW_DAYS } from './constants';
import { mergeProcessEvents } from './process_records';
import {
  getLaunchMode,
  getOwnRootResolver,
  getRunAlertIds,
  getRunStatus,
  hasPermissionBypass,
  parseHeadlessPrompt,
  RUN_END_MARGIN_MS,
  RUNNING_CAP_MS,
} from './session_rules';
import type {
  AgentIdentity,
  AgentSession,
  AgentSessions,
  ProcessRecord,
  RunAlertRecord,
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
  readonly identity: Pick<AgentIdentity, 'agentName'>;
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
