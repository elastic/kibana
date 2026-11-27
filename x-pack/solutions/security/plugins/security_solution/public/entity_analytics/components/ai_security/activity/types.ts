/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

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

export interface SideEffects {
  readonly fileEvents: number;
  readonly networkEvents: number;
  readonly files: readonly string[];
  /** Names the process looked up in DNS. */
  readonly domains: readonly string[];
  /** Addresses of connections that didn't come from a DNS lookup. */
  readonly destinations: readonly string[];
}

export interface OtelRecord {
  readonly timestamp: string;
  readonly conversationId?: string;
  readonly eventName?: string;
  readonly prompt?: string;
  readonly promptId?: string;
  readonly toolName?: string;
  readonly commandLine?: string;
  readonly mcpServer?: string;
  readonly decision?: string;
  readonly model?: string;
  readonly inputTokens?: number;
  readonly outputTokens?: number;
  readonly isMock: boolean;
}

export type LaunchMode = 'interactive' | 'scripted' | 'scheduled' | 'unknown';

export interface ProcessStep {
  readonly kind: 'process';
  readonly timestamp: string;
  readonly process: ProcessRecord;
  readonly sideEffects?: SideEffects;
  /** The agent's own process (a launch re-exec), not a command it ran. */
  readonly isAgentProcess: boolean;
  /** Known start-up and tool preamble noise, hidden by default and counted. */
  readonly isSetup: boolean;
  /** The step ran as a different OS user than the install, for example under `sudo`. */
  readonly ranAsOtherUser?: string;
}

export interface PromptStep {
  readonly kind: 'prompt';
  readonly timestamp: string;
  /** Absent when OTel saw the prompt but didn't log its text. */
  readonly text?: string;
  readonly isMock: boolean;
}

export interface ToolCallStep {
  readonly kind: 'tool_call';
  readonly timestamp: string;
  readonly toolName?: string;
  readonly commandLine?: string;
  readonly mcpServer?: string;
  readonly decision?: string;
  readonly isMock: boolean;
}

export interface OtelEventStep {
  readonly kind: 'otel_event';
  readonly timestamp: string;
  readonly eventName?: string;
  readonly mcpServer?: string;
  readonly isMock: boolean;
}

export type ActivityStep = ProcessStep | PromptStep | ToolCallStep | OtelEventStep;

export interface ModelUsage {
  readonly requests: number;
  readonly models: readonly string[];
  readonly inputTokens: number;
  readonly outputTokens: number;
}

/** Steps in one agent session, or before any session ID was seen (`sessionId` absent). */
export interface ActivitySection {
  readonly sessionId?: string;
  readonly steps: readonly ActivityStep[];
  readonly modelUsage?: ModelUsage;
}

/**
 * Whether the run's root process has ended, from Defend's end events at read time. `stale` is a
 * root with no end event that started before the cap: a long session or a host that went offline.
 */
export type RunStatus =
  | { readonly kind: 'running' }
  | { readonly kind: 'stale'; readonly since: string }
  | { readonly kind: 'ended' };

/** What the run could reach, for the line under its header. Empty parts mean no data. */
export interface RunReach {
  readonly permissionPromptsOff: boolean;
  readonly workingDirectory?: string;
  /** Distinct files outside the working directory. Empty when the directory is unknown. */
  readonly filesOutside: readonly string[];
  /** Distinct domains, or addresses with no lookup. Every network destination is outside. */
  readonly destinations: readonly string[];
}

/** One launch of the agent and everything its process tree did. */
export interface AgentRun {
  readonly id: string;
  readonly root: ProcessRecord;
  readonly rootSideEffects?: SideEffects;
  readonly start: string;
  readonly end: string;
  readonly launchMode: LaunchMode;
  readonly isHeadless: boolean;
  readonly headlessPrompt?: string;
  readonly sessionIds: readonly string[];
  readonly sections: readonly ActivitySection[];
  /** Absent when end events couldn't be read. */
  readonly status?: RunStatus;
  readonly reach: RunReach;
  /** Alerts on a process of this run, newest first. */
  readonly alertIds: readonly string[];
}

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
 * without the commands they ran. The same unit as `AgentRun`, which the session's detail read builds.
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

/** Sessions on one calendar day, for the histogram. Days with none are kept as zero. */
export interface SessionDay {
  /** Start of the day, in milliseconds. */
  readonly day: number;
  readonly sessions: number;
  readonly sessionsWithAlerts: number;
}

/** What one session did, from its detail read. */
export interface AgentSessionDetail {
  /** Absent when the session's root wasn't found again, which a newer read can cause. */
  readonly run?: AgentRun;
  /** Descendants in the session's window that couldn't be tied to a launch. */
  readonly unplacedSteps: readonly ActivityStep[];
  readonly otelMatch: OtelMatch;
  /** OTel couldn't be read (as opposed to: there is none). */
  readonly otelFailed: boolean;
  readonly truncated: boolean;
}

export type OtelMatch = 'session' | 'account' | 'none';

/** Which data layers exist for this agent. */
export interface ActivityLayers {
  readonly defendRuns: boolean;
  readonly sessionIds: boolean;
  readonly headlessPrompts: boolean;
  readonly otelEvents: boolean;
  readonly otelToolCalls: boolean;
  readonly otelPrompts: boolean;
}

export interface AgentActivity {
  readonly runs: readonly AgentRun[];
  /** Descendants run by this install that couldn't be tied to one launch. Never dropped. */
  readonly unplacedSteps: readonly ActivityStep[];
  readonly layers: ActivityLayers;
  readonly otelMatch: OtelMatch;
  readonly truncated: boolean;
}
