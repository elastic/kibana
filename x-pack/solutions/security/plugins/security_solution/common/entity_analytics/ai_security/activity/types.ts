/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/** One agent install: the three fields its Entity Store ID is made of. */
export interface AgentIdentity {
  readonly entityId: string;
  readonly agentName: string;
  readonly hostId: string;
  readonly userName: string;
}

/** One process, merged from its fork and exec events. */
export interface ProcessRecord {
  readonly entityId: string;
  readonly timestamp: string;
  readonly documentId?: string;
  readonly index?: string;
  readonly pid?: number;
  /** Elastic Agent ID of the Defend install that saw the process (`agent.id`). */
  readonly endpointAgentId?: string;
  readonly parentEntityId?: string;
  readonly ancestry: readonly string[];
  readonly name?: string;
  readonly executable?: string;
  readonly commandLine?: string;
  /** Arguments in order, from `_source`. ES|QL returns keyword arrays sorted, so they come separately. */
  readonly args?: readonly string[];
  /** Arguments as ES|QL returns them, sorted. Only for matching, never for display. */
  readonly unorderedArgs: readonly string[];
  readonly workingDirectory?: string;
  readonly userName?: string;
  readonly sessionId?: string;
  readonly email?: string;
  readonly isDescendant: boolean;
  readonly entryLeaderEntityId?: string;
  readonly entryLeaderStart?: string;
  readonly entryLeaderName?: string;
  readonly entryMetaType?: string;
  readonly interactive?: boolean;
  /** The event came from an exec, so its command line is the process's own. */
  readonly hasExec: boolean;
}

export type LaunchMode = 'interactive' | 'scripted' | 'scheduled' | 'unknown';

/**
 * Whether the run's root process has ended, from Defend's end events at read time. `stale` is a
 * root with no end event that started before the cap: a long session or a host that went offline.
 */
export type RunStatus =
  | { readonly kind: 'running' }
  | { readonly kind: 'stale'; readonly since: string }
  | { readonly kind: 'ended' };

/** An alert on the agent, with the process fields that tie it to a run. */
export interface RunAlertRecord {
  readonly id: string;
  readonly timestamp: string;
  /** When the source event happened (`kibana.alert.original_time`). */
  readonly eventTime?: string;
  readonly processEntityId?: string;
  readonly parentEntityId?: string;
  readonly ancestry: readonly string[];
  readonly entryLeaderEntityId?: string;
}

export interface TimeWindow {
  readonly from: string;
  readonly to: string;
}

/**
 * One launch as the first read sees it: the agent's own processes (the root and its re-execs),
 * without the commands they ran. The same unit as the flyout's `AgentRun`, which the session's
 * detail read builds.
 */
export interface AgentSession {
  readonly id: string;
  readonly root: ProcessRecord;
  readonly start: string;
  /** The last end event of the agent's own processes, when the root has ended. */
  readonly end?: string;
  readonly launchMode: LaunchMode;
  readonly isHeadless: boolean;
  readonly permissionPromptsOff: boolean;
  /** Absent when end events couldn't be read. */
  readonly status?: RunStatus;
  /**
   * Alerts tied to the session by the agent's own processes, or by terminal session and time for
   * alerts on deeper descendants, newest first. The detail read adds any it ties by ancestry.
   */
  readonly alertIds: readonly string[];
}

/** The agent's sessions in a fixed window, newest first, plus what the detail read reuses. */
export interface AgentSessions {
  readonly sessions: readonly AgentSession[];
  readonly window: TimeWindow;
  /** Start events of the agent's own processes in the window. */
  readonly ownEvents: readonly ProcessRecord[];
  /** Agent processes with an end event. Absent when end events couldn't be read. */
  readonly endedProcessIds?: ReadonlySet<string>;
  readonly alerts: readonly RunAlertRecord[];
  /** Read time, in milliseconds. */
  readonly now: number;
  /** The read hit its limit, so the oldest sessions in the window may be missing. */
  readonly truncated: boolean;
}
