/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AgentIdentity } from '../types';
import { firstString, isMockRow, toNumber, toStringArray } from '../utils';
import { mergeProcessEvents } from '../../../../../common/entity_analytics/ai_security/activity/process_records';
import {
  getLaunchMode,
  getOwnRootResolver,
  getRunAlertIds,
  getRunStatus,
  hasPermissionBypass,
  MAX_PARENT_DEPTH,
  parseHeadlessPrompt,
  RUN_END_MARGIN_MS,
} from '../../../../../common/entity_analytics/ai_security/activity/session_rules';
import type {
  ActivitySection,
  ActivityStep,
  AgentActivity,
  AgentRun,
  ModelUsage,
  OtelMatch,
  OtelRecord,
  ProcessRecord,
  ProcessStep,
  RunAlertRecord,
  RunReach,
  SideEffects,
} from './types';

export {
  mergeProcessEvents,
  toEndedProcessIds,
  toProcessEndTimes,
  toProcessEvent,
  toRunAlert,
} from '../../../../../common/entity_analytics/ai_security/activity/process_records';
export {
  getLaunchMode,
  getOwnRootResolver,
  getRunAlertIds,
  getRunStatus,
  hasPermissionBypass,
  parseHeadlessPrompt,
  RUN_END_MARGIN_MS,
  RUNNING_CAP_MS,
} from '../../../../../common/entity_analytics/ai_security/activity/session_rules';

/**
 * Commands the agents run for themselves at start-up and before each Bash tool call (lab, plan.md).
 * Markers only match start-up scripts, never the `eval '<command>'` wrapper a Bash tool call runs
 * in, because a setup process hides its whole subtree.
 */
const SETUP_PROCESS_NAMES: ReadonlySet<string> = new Set([
  'env',
  'uname',
  'awk',
  'id',
  'hostnamectl',
  'locale',
  'dirname',
  'which',
  'tr',
]);
const SETUP_COMMAND_MARKERS: readonly string[] = [
  'core.hooksPath=/dev/null',
  'SNAPSHOT_FILE=',
  '/usr/libexec/grepconf.sh',
  'GREP_COLORS',
  'grep -E "code|cursor',
  'grep -E code|cursor',
  '/etc/debuginfod',
];

/**
 * The agent's own state and service traffic, ignored on the agent's own process only. A command
 * the agent runs that touches them still counts. Domains follow the prebuilt GenAI rules'
 * exclusions, plus Claude Code's log intake.
 */
const AGENT_STATE_PATH_MARKERS: readonly string[] = [
  '/.claude/',
  '/.claude.json',
  '/.local/state/claude/',
  '/.local/share/claude/',
  '/.cursor/',
  '/.config/cursor/',
  '/cc-socks/',
];
const AGENT_SERVICE_DOMAINS: readonly string[] = [
  'anthropic.com',
  'claude.ai',
  'claude.com',
  'cursor.com',
  'cursor.sh',
  'datadoghq.com',
];
/** Claude Code's tool shell sources its snapshot and writes its working directory on every command. */
const TOOL_SHELL_PATH_MARKERS: readonly string[] = ['/tmp/claude-', '/.claude/shell-snapshots/'];

type EsqlRecord = Record<string, unknown>;

export const toSideEffects = (rows: readonly EsqlRecord[]): Map<string, SideEffects> =>
  new Map(
    rows.flatMap((row) => {
      const entityId = firstString(row['process.entity_id']);
      if (!entityId) return [];
      return [
        [
          entityId,
          {
            fileEvents: toNumber(row.file_events) ?? 0,
            networkEvents: toNumber(row.network_events) ?? 0,
            files: toStringArray(row.files),
            domains: toStringArray(row.domains),
            destinations: toStringArray(row.destinations),
          },
        ] as const,
      ];
    })
  );

export const toOtelRecord = (row: EsqlRecord): OtelRecord | undefined => {
  const timestamp = firstString(row['@timestamp']);
  if (!timestamp) return undefined;
  return {
    timestamp,
    conversationId: firstString(row.conversation_id),
    eventName: firstString(row.event_name),
    prompt: firstString(row.prompt),
    promptId: firstString(row.prompt_id),
    toolName: firstString(row['gen_ai.tool.name']),
    commandLine: firstString(row['process.command_line']),
    mcpServer: firstString(row['claude_code.events.mcp_server_name']),
    decision: firstString(row['claude_code.events.decision_type']),
    model: firstString(row['gen_ai.request.model']),
    inputTokens: toNumber(row['gen_ai.usage.input_tokens']),
    outputTokens: toNumber(row['gen_ai.usage.output_tokens']),
    isMock: isMockRow(row),
  };
};

const normalisePath = (path: string): string => path.replace(/\\/g, '/').replace(/\/+$/, '');

const isWindowsPath = (path: string): boolean => /^[a-zA-Z]:[\\/]/.test(path);

/** The path is the directory or under it. Windows paths compare without case. */
export const isInsideDirectory = (path: string, directory: string): boolean => {
  const caseless = isWindowsPath(directory);
  const fold = (value: string) => (caseless ? value.toLowerCase() : value);
  const dir = fold(normalisePath(directory));
  const target = fold(normalisePath(path));
  return target === dir || target.startsWith(`${dir}/`);
};

const isServiceDomain = (domain: string): boolean =>
  AGENT_SERVICE_DOMAINS.some((service) => domain === service || domain.endsWith(`.${service}`));

const hasMarker = (path: string, markers: readonly string[]): boolean => {
  const normalised = normalisePath(path);
  return markers.some((marker) => normalised.includes(marker));
};

const NO_SIDE_EFFECTS: SideEffects = {
  fileEvents: 0,
  networkEvents: 0,
  files: [],
  domains: [],
  destinations: [],
};

/** The run's reach: permission prompts, and files and destinations outside its working directory. */
export const buildRunReach = (
  agentName: string,
  root: ProcessRecord,
  processes: readonly ProcessRecord[],
  sideEffects: ReadonlyMap<string, SideEffects>
): RunReach => {
  const workingDirectory = root.workingDirectory;
  const files = new Set<string>();
  const destinations = new Set<string>();
  for (const process of processes) {
    const effects = sideEffects.get(process.entityId) ?? NO_SIDE_EFFECTS;
    const isAgentProcess = !process.isDescendant;
    if (workingDirectory) {
      effects.files
        .filter(
          (path) =>
            !isInsideDirectory(path, workingDirectory) &&
            !hasMarker(path, TOOL_SHELL_PATH_MARKERS) &&
            !(isAgentProcess && hasMarker(path, AGENT_STATE_PATH_MARKERS))
        )
        .forEach((path) => files.add(path));
    }
    const domains = effects.domains.filter(
      (domain) => !(isAgentProcess && isServiceDomain(domain))
    );
    domains.forEach((domain) => destinations.add(domain));
    // A process that looked names up connects to their addresses, which would count twice.
    if (effects.domains.length === 0) {
      effects.destinations.forEach((address) => destinations.add(address));
    }
  }
  return {
    permissionPromptsOff: hasPermissionBypass(agentName, root),
    workingDirectory,
    filesOutside: [...files].sort(),
    destinations: [...destinations].sort(),
  };
};

export const isSetupProcess = (process: ProcessRecord): boolean => {
  if (!process.isDescendant) return false;
  if (process.name && SETUP_PROCESS_NAMES.has(process.name)) return true;
  const text = process.commandLine ?? process.unorderedArgs.join(' ');
  return text !== '' && SETUP_COMMAND_MARKERS.some((marker) => text.includes(marker));
};

const addMs = (timestamp: string, ms: number): string =>
  new Date(new Date(timestamp).getTime() + ms).toISOString();

const sortByTime = <T extends { readonly timestamp: string }>(items: readonly T[]): T[] =>
  [...items].sort((a, b) => a.timestamp.localeCompare(b.timestamp));

interface RunDraft {
  readonly root: ProcessRecord;
  readonly members: ProcessRecord[];
  readonly otel: OtelRecord[];
}

export interface BuildAgentActivityParams {
  readonly identity: AgentIdentity;
  readonly ownEvents: readonly ProcessRecord[];
  readonly descendantEvents: readonly ProcessRecord[];
  readonly sideEffects: ReadonlyMap<string, SideEffects>;
  readonly otelEvents: readonly OtelRecord[];
  readonly otelMatch: OtelMatch;
  /** Ordered `process.args` of run roots, by process entity ID. */
  readonly rootArgs?: ReadonlyMap<string, readonly string[]>;
  /** Agent processes with an end event. Absent when end events couldn't be read. */
  readonly endedProcessIds?: ReadonlySet<string>;
  readonly alerts?: readonly RunAlertRecord[];
  /** Read time, in milliseconds. */
  readonly now?: number;
  readonly truncated?: boolean;
}

/**
 * Builds the agent's runs from whatever sources exist. A run is one launch: an agent process
 * whose parent isn't the agent, plus the agent's re-execs and every descendant found through
 * process ancestry. Descendants are never matched on `user.name`, because a `sudo` child runs as
 * root. A descendant that can't be placed by ancestry falls back to its session ID, then its
 * terminal session, and otherwise stays visible as an unplaced step.
 */
export const buildAgentActivity = ({
  identity,
  ownEvents,
  descendantEvents,
  sideEffects,
  otelEvents,
  otelMatch,
  rootArgs,
  endedProcessIds,
  alerts = [],
  now = Date.now(),
  truncated = false,
}: BuildAgentActivityParams): AgentActivity => {
  const own = mergeProcessEvents(ownEvents);
  const all = mergeProcessEvents([...ownEvents, ...descendantEvents]);
  const ownIds = new Set(own.keys());
  const rootOfOwn = getOwnRootResolver(own);

  const runRootFor = (process: ProcessRecord): string | undefined => {
    let current: ProcessRecord | undefined = process;
    for (let depth = 0; current && depth < MAX_PARENT_DEPTH; depth++) {
      if (ownIds.has(current.entityId)) return rootOfOwn(current.entityId);
      const ownAncestor = current.ancestry.find((id) => ownIds.has(id));
      if (ownAncestor) return rootOfOwn(ownAncestor);
      if (!current.parentEntityId || current.parentEntityId === current.entityId) break;
      current = all.get(current.parentEntityId);
    }
    return undefined;
  };

  const drafts = new Map<string, RunDraft>();
  for (const process of own.values()) {
    const rootId = rootOfOwn(process.entityId);
    if (rootId === process.entityId) {
      drafts.set(rootId, { root: process, members: [], otel: [] });
    }
  }

  const unplaced: ProcessRecord[] = [];
  for (const process of all.values()) {
    const rootId = runRootFor(process);
    const draft = rootId ? drafts.get(rootId) : undefined;
    if (draft) {
      if (process.entityId !== draft.root.entityId) draft.members.push(process);
    } else if (!ownIds.has(process.entityId)) {
      unplaced.push(process);
    }
  }

  const sessionsOf = (draft: RunDraft): Set<string> =>
    new Set(
      [draft.root, ...draft.members]
        .map((member) => member.sessionId)
        .filter((id): id is string => !!id)
    );
  const runWindow = (draft: RunDraft) => {
    const times = [draft.root, ...draft.members].map((member) => member.timestamp).sort();
    return { start: times[0], end: addMs(times[times.length - 1], RUN_END_MARGIN_MS) };
  };

  const stillUnplaced: ProcessRecord[] = [];
  for (const process of unplaced) {
    const draftList = [...drafts.values()];
    const bySession = process.sessionId
      ? draftList.find((draft) => sessionsOf(draft).has(process.sessionId as string))
      : undefined;
    const byTerminal =
      !bySession && process.entryLeaderEntityId
        ? draftList.filter((draft) => {
            const { start, end } = runWindow(draft);
            return (
              draft.root.entryLeaderEntityId === process.entryLeaderEntityId &&
              process.timestamp >= start &&
              process.timestamp <= end
            );
          })
        : [];
    const target = bySession ?? (byTerminal.length === 1 ? byTerminal[0] : undefined);
    if (target) {
      target.members.push(process);
    } else if (process.userName === identity.userName) {
      stillUnplaced.push(process);
    }
  }

  const draftList = [...drafts.values()];
  for (const event of otelEvents) {
    const target =
      otelMatch === 'session'
        ? draftList.find(
            (draft) => !!event.conversationId && sessionsOf(draft).has(event.conversationId)
          )
        : draftList.find((draft) => {
            const { start, end } = runWindow(draft);
            return event.timestamp >= start && event.timestamp <= end;
          });
    target?.otel.push(event);
  }

  // A setup command's children (the shell snapshot's `head`, `sed` and `awk`) are setup too.
  const setupIds = new Set<string>();
  for (const process of sortByTime([...all.values()])) {
    if (
      isSetupProcess(process) ||
      (process.isDescendant && !!process.parentEntityId && setupIds.has(process.parentEntityId))
    ) {
      setupIds.add(process.entityId);
    }
  }

  const toProcessStep = (process: ProcessRecord): ProcessStep => ({
    kind: 'process',
    timestamp: process.timestamp,
    process,
    sideEffects: sideEffects.get(process.entityId),
    isAgentProcess: !process.isDescendant,
    isSetup: setupIds.has(process.entityId),
    ranAsOtherUser:
      process.userName && process.userName !== identity.userName ? process.userName : undefined,
  });

  const runs: AgentRun[] = sortByTime(
    draftList.map((draft) => ({ timestamp: draft.root.timestamp, draft }))
  ).map(({ draft }) => {
    const orderedArgs = rootArgs?.get(draft.root.entityId);
    const root = orderedArgs ? { ...draft.root, args: orderedArgs } : draft.root;
    const members = sortByTime(draft.members);
    const { isHeadless, prompt } = parseHeadlessPrompt(root.args, root.commandLine);
    const sections = buildSections(members.map(toProcessStep), draft.otel, root.sessionId);
    const lastTimestamp = members.length ? members[members.length - 1].timestamp : root.timestamp;
    const processes = [root, ...members];
    return {
      id: root.entityId,
      root,
      rootSideEffects: sideEffects.get(root.entityId),
      start: root.timestamp,
      end: lastTimestamp,
      launchMode: getLaunchMode(root),
      isHeadless,
      headlessPrompt: prompt,
      sessionIds: [...sessionsOf(draft)],
      sections,
      status: getRunStatus(root, endedProcessIds, now),
      reach: buildRunReach(identity.agentName, root, processes, sideEffects),
      alertIds: getRunAlertIds(new Set(processes.map(({ entityId }) => entityId)), alerts),
    };
  });

  const allProcesses = [...all.values()];
  const otelSteps = runs.flatMap((run) => run.sections.flatMap((section) => section.steps));
  return {
    runs,
    unplacedSteps: sortByTime(stillUnplaced).map(toProcessStep),
    layers: {
      defendRuns: own.size > 0,
      sessionIds: allProcesses.some((process) => !!process.sessionId),
      headlessPrompts: runs.some((run) => run.isHeadless && !!run.headlessPrompt),
      otelEvents: otelEvents.length > 0,
      otelToolCalls: otelEvents.some(isToolEvent),
      otelPrompts: otelSteps.some((step) => step.kind === 'prompt' && !!step.text),
    },
    otelMatch: otelEvents.length > 0 ? otelMatch : 'none',
    truncated,
  };
};

const isToolEvent = ({ eventName }: OtelRecord): boolean =>
  eventName === 'tool_result' || eventName === 'tool_decision';

const toOtelStep = (event: OtelRecord): ActivityStep | undefined => {
  switch (event.eventName) {
    case 'user_prompt':
      return {
        kind: 'prompt',
        timestamp: event.timestamp,
        text: event.prompt,
        isMock: event.isMock,
      };
    case 'tool_result':
      return {
        kind: 'tool_call',
        timestamp: event.timestamp,
        toolName: event.toolName,
        commandLine: event.commandLine,
        mcpServer: event.mcpServer,
        decision: event.decision,
        isMock: event.isMock,
      };
    case 'tool_decision':
      // An accepted decision is followed by its result, so only a rejection is a step of its own.
      return event.decision === 'reject'
        ? {
            kind: 'tool_call',
            timestamp: event.timestamp,
            toolName: event.toolName,
            commandLine: event.commandLine,
            decision: event.decision,
            isMock: event.isMock,
          }
        : undefined;
    case 'api_request':
      return undefined;
    default:
      return {
        kind: 'otel_event',
        timestamp: event.timestamp,
        eventName: event.eventName,
        mcpServer: event.mcpServer,
        isMock: event.isMock,
      };
  }
};

const toModelUsage = (events: readonly OtelRecord[]): ModelUsage | undefined => {
  const requests = events.filter((event) => event.eventName === 'api_request');
  if (requests.length === 0) return undefined;
  return {
    requests: requests.length,
    models: [...new Set(requests.map((event) => event.model).filter((m): m is string => !!m))],
    inputTokens: requests.reduce((sum, event) => sum + (event.inputTokens ?? 0), 0),
    outputTokens: requests.reduce((sum, event) => sum + (event.outputTokens ?? 0), 0),
  };
};

/**
 * Splits a run's steps by agent session. A process step without a session ID belongs to the
 * session in progress, because Claude only stamps the ID once the session starts.
 */
const buildSections = (
  processSteps: readonly ProcessStep[],
  otel: readonly OtelRecord[],
  rootSessionId: string | undefined
): ActivitySection[] => {
  const bySession = new Map<string | undefined, { steps: ActivityStep[]; otel: OtelRecord[] }>();
  const sectionFor = (sessionId: string | undefined) => {
    let section = bySession.get(sessionId);
    if (!section) {
      section = { steps: [], otel: [] };
      bySession.set(sessionId, section);
    }
    return section;
  };

  let current = rootSessionId;
  for (const step of processSteps) {
    current = step.process.sessionId ?? current;
    sectionFor(current).steps.push(step);
  }
  for (const event of otel) {
    const section = sectionFor(event.conversationId ?? current);
    section.otel.push(event);
    const step = toOtelStep(event);
    if (step) section.steps.push(step);
  }
  if (bySession.size === 0) sectionFor(rootSessionId);

  return [...bySession.entries()]
    .map(([sessionId, section]) => ({
      sessionId,
      steps: sortByTime(section.steps),
      modelUsage: toModelUsage(section.otel),
    }))
    .sort((a, b) => (a.steps[0]?.timestamp ?? '').localeCompare(b.steps[0]?.timestamp ?? ''));
};
