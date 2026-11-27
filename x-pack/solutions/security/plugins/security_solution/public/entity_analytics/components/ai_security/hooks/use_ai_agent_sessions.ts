/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@kbn/react-query';
import { useKibana } from '../../../../common/lib/kibana';
import { useSpaceId } from '../../../../common/hooks/use_space_id';
import { ACTIVITY_MAX_PROCESS_EVENTS, AI_AGENTS_QUERY_KEYS } from '../constants';
import {
  buildDescendantProcessesQuery,
  buildOtelEventsQuery,
  buildOwnProcessEndsQuery,
  buildOwnProcessesQuery,
  buildProcessSideEffectsQuery,
  buildRunAlertsQuery,
} from '../queries/activity_queries';
import { isDefined } from '../queries/parse_rows';
import {
  toOtelRecord,
  toProcessEndTimes,
  toProcessEvent,
  toRunAlert,
  toSideEffects,
} from '../activity/build_agent_activity';
import {
  buildAgentSessions,
  buildSessionDetail,
  getSessionsWindow,
  getSessionWindow,
} from '../activity/build_agent_sessions';
import type { AgentSession, AgentSessionDetail, AgentSessions, OtelMatch } from '../activity/types';
import type { AgentIdentity, AgentRow } from '../types';
import { isClaudeCode } from '../utils';
import { fetchOrderedArgs, optionalRecords, recordsIfIndexExists } from './use_ai_agents';

/**
 * The agent's sessions in the last 30 days, newest first: the first of the tab's two reads. It
 * reads only the agent's own process starts, their end events and the agent's alerts, which is
 * enough for the summary, the session rows, the header count and Kill process.
 */
export const useAiAgentSessions = (agent: AgentRow | AgentIdentity | undefined) => {
  const { data } = useKibana().services;
  const spaceId = useSpaceId();
  return useQuery({
    queryKey: [AI_AGENTS_QUERY_KEYS.sessions, spaceId, agent?.entityId],
    enabled: !!agent && !!spaceId,
    queryFn: async ({ signal }): Promise<AgentSessions | undefined> => {
      if (!agent) return undefined;
      const space = spaceId ?? 'default';
      const now = Date.now();
      const window = getSessionsWindow(now);
      const [ownRecords, endRecords, alertRecords] = await Promise.all([
        recordsIfIndexExists(
          data.search,
          buildOwnProcessesQuery(space, agent, window.from, window.to),
          'own',
          signal
        ),
        optionalRecords(
          data.search,
          buildOwnProcessEndsQuery(space, agent, window.from),
          'ends',
          signal
        ),
        optionalRecords(
          data.search,
          buildRunAlertsQuery(space, agent.entityId, window.from),
          'run_alerts',
          signal
        ),
      ]);
      return buildAgentSessions({
        identity: agent,
        window,
        ownEvents: ownRecords.map(toProcessEvent).filter(isDefined),
        endTimes: endRecords.failed ? undefined : toProcessEndTimes(endRecords.records),
        alerts: alertRecords.records.map(toRunAlert).filter(isDefined),
        now,
        truncated: ownRecords.length >= ACTIVITY_MAX_PROCESS_EVENTS,
      });
    },
  });
};

export interface UseAiAgentSessionDetailParams {
  readonly agent: AgentRow | AgentIdentity;
  readonly sessions: AgentSessions;
  readonly session: AgentSession;
}

/**
 * What one session did: the second read, made when its row is expanded. It reads descendants,
 * file and network activity and OTel for the session's time range only.
 */
export const useAiAgentSessionDetail = ({
  agent,
  sessions,
  session,
}: UseAiAgentSessionDetailParams) => {
  const { data } = useKibana().services;
  const spaceId = useSpaceId();
  const accountEmails = 'accountEmails' in agent ? agent.accountEmails : [];
  return useQuery({
    queryKey: [
      AI_AGENTS_QUERY_KEYS.sessionDetail,
      spaceId,
      agent.entityId,
      session.id,
      sessions.now,
    ],
    enabled: !!spaceId,
    queryFn: async ({ signal }): Promise<AgentSessionDetail> => {
      const space = spaceId ?? 'default';
      const { from, to } = getSessionWindow(session, sessions.now);
      const [descendantRecords, sideEffectRecords] = await Promise.all([
        recordsIfIndexExists(
          data.search,
          buildDescendantProcessesQuery(space, agent, from, to),
          'descendants',
          signal
        ),
        optionalRecords(
          data.search,
          buildProcessSideEffectsQuery(space, agent, from, to),
          'effects',
          signal
        ),
      ]);
      const descendantEvents = descendantRecords.map(toProcessEvent).filter(isDefined);
      const ownInRange = sessions.ownEvents.filter(
        ({ timestamp }) => timestamp >= from && timestamp <= to
      );

      const sessionIds = Array.from(
        new Set([...ownInRange, ...descendantEvents].map(({ sessionId }) => sessionId))
      ).filter(isDefined);
      let otelMatch: OtelMatch = 'none';
      let otelQuery: string | undefined;
      if (isClaudeCode(agent.agentName) && sessionIds.length > 0) {
        otelMatch = 'session';
        otelQuery = buildOtelEventsQuery(space, { sessionIds, from, to });
      } else if (isClaudeCode(agent.agentName) && accountEmails.length > 0) {
        otelMatch = 'account';
        otelQuery = buildOtelEventsQuery(space, { emails: accountEmails, from, to });
      }

      const rootDocumentIds = ownInRange
        .filter(({ hasExec }) => hasExec)
        .map(({ documentId }) => documentId)
        .filter(isDefined);
      const [otel, rootArgs] = await Promise.all([
        otelQuery
          ? optionalRecords(data.search, otelQuery, 'otel', signal)
          : Promise.resolve({ records: [], failed: false }),
        fetchOrderedArgs(data.search, space, rootDocumentIds, signal).catch(
          () => new Map<string, string[]>()
        ),
      ]);

      return {
        ...buildSessionDetail({
          identity: agent,
          sessions,
          session,
          descendantEvents,
          sideEffects: toSideEffects(sideEffectRecords.records),
          otelEvents: otel.records.map(toOtelRecord).filter(isDefined),
          otelMatch,
          rootArgs,
          truncated: descendantRecords.length >= ACTIVITY_MAX_PROCESS_EVENTS,
        }),
        otelFailed: otel.failed,
      };
    },
  });
};
