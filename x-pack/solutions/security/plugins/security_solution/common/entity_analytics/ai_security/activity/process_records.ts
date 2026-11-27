/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { firstString, toBoolean, toNumber, toStringArray } from './esql_values';
import type { ProcessRecord, RunAlertRecord } from './types';

type EsqlRecord = Record<string, unknown>;

const isString = (value: string | undefined): value is string => !!value;

/** Reads one process start event from an ES|QL row. */
export const toProcessEvent = (row: EsqlRecord): ProcessRecord | undefined => {
  const entityId = firstString(row['process.entity_id']);
  const timestamp = firstString(row['@timestamp']);
  if (!entityId || !timestamp) return undefined;
  return {
    entityId,
    timestamp,
    documentId: firstString(row._id),
    index: firstString(row._index),
    pid: toNumber(row['process.pid']),
    endpointAgentId: firstString(row['agent.id']),
    parentEntityId: firstString(row['process.parent.entity_id']),
    ancestry: toStringArray(row['process.Ext.ancestry']),
    name: firstString(row['process.name']),
    executable: firstString(row['process.executable']),
    commandLine: firstString(row['process.command_line']),
    unorderedArgs: toStringArray(row['process.args']),
    workingDirectory: firstString(row['process.working_directory']),
    userName: firstString(row['user.name']),
    sessionId: firstString(row['process.ai_agent.session_id']),
    email: firstString(row['process.ai_agent.email']),
    isDescendant: toBoolean(row['process.ai_agent.is_descendant']) ?? false,
    entryLeaderEntityId: firstString(row['process.entry_leader.entity_id']),
    entryLeaderStart: firstString(row['process.entry_leader.start']),
    entryLeaderName: firstString(row['process.entry_leader.name']),
    entryMetaType: firstString(row['process.entry_leader.entry_meta.type']),
    interactive: toBoolean(row['process.interactive']),
    hasExec: toStringArray(row['event.action']).includes('exec'),
  };
};

/** Entity IDs of the agent's processes that have an end event. */
export const toEndedProcessIds = (rows: readonly EsqlRecord[]): Set<string> =>
  new Set(rows.map((row) => firstString(row['process.entity_id'])).filter(isString));

/** When each of the agent's processes ended, by entity ID. */
export const toProcessEndTimes = (rows: readonly EsqlRecord[]): Map<string, string> =>
  new Map(
    rows.flatMap((row) => {
      const entityId = firstString(row['process.entity_id']);
      const endedAt = firstString(row.ended_at);
      return entityId && endedAt ? [[entityId, endedAt] as const] : [];
    })
  );

export const toRunAlert = (row: EsqlRecord): RunAlertRecord | undefined => {
  const id = firstString(row._id);
  const timestamp = firstString(row['@timestamp']);
  if (!id || !timestamp) return undefined;
  return {
    id,
    timestamp,
    eventTime: firstString(row['kibana.alert.original_time']),
    processEntityId: firstString(row['process.entity_id']),
    parentEntityId: firstString(row['process.parent.entity_id']),
    ancestry: toStringArray(row['process.Ext.ancestry']),
    entryLeaderEntityId: firstString(row['process.entry_leader.entity_id']),
  };
};

/**
 * Merges a process's fork and exec events. The exec carries the process's own command line, and
 * any event may carry the session ID, which Claude sets after start-up.
 */
export const mergeProcessEvents = (
  events: readonly ProcessRecord[]
): Map<string, ProcessRecord> => {
  const merged = new Map<string, ProcessRecord>();
  for (const event of events) {
    const existing = merged.get(event.entityId);
    merged.set(event.entityId, existing ? mergeTwo(existing, event) : event);
  }
  return merged;
};

const mergeTwo = (first: ProcessRecord, second: ProcessRecord): ProcessRecord => {
  const primary = second.hasExec && !first.hasExec ? second : first;
  const secondary = primary === second ? first : second;
  return {
    entityId: primary.entityId,
    timestamp: first.timestamp < second.timestamp ? first.timestamp : second.timestamp,
    documentId: primary.documentId ?? secondary.documentId,
    index: primary.index ?? secondary.index,
    pid: primary.pid ?? secondary.pid,
    endpointAgentId: primary.endpointAgentId ?? secondary.endpointAgentId,
    parentEntityId: primary.parentEntityId ?? secondary.parentEntityId,
    ancestry: primary.ancestry.length > 0 ? primary.ancestry : secondary.ancestry,
    name: primary.name ?? secondary.name,
    executable: primary.executable ?? secondary.executable,
    commandLine: primary.commandLine ?? secondary.commandLine,
    args: primary.args ?? secondary.args,
    unorderedArgs:
      primary.unorderedArgs.length > 0 ? primary.unorderedArgs : secondary.unorderedArgs,
    workingDirectory: primary.workingDirectory ?? secondary.workingDirectory,
    userName: primary.userName ?? secondary.userName,
    sessionId: primary.sessionId ?? secondary.sessionId,
    email: primary.email ?? secondary.email,
    isDescendant: primary.isDescendant,
    entryLeaderEntityId: primary.entryLeaderEntityId ?? secondary.entryLeaderEntityId,
    entryLeaderStart: primary.entryLeaderStart ?? secondary.entryLeaderStart,
    entryLeaderName: primary.entryLeaderName ?? secondary.entryLeaderName,
    entryMetaType: primary.entryMetaType ?? secondary.entryMetaType,
    interactive: primary.interactive ?? secondary.interactive,
    hasExec: first.hasExec || second.hasExec,
  };
};
