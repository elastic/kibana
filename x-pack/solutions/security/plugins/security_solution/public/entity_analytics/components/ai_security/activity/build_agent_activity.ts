/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AgentIdentity } from '../types';
import { firstString, isMockRow, toBoolean, toNumber, toStringArray } from '../utils';
import type {
  ActivitySection,
  ActivityStep,
  AgentActivity,
  AgentRun,
  LaunchMode,
  ModelUsage,
  OtelMatch,
  OtelRecord,
  ProcessRecord,
  ProcessStep,
  SideEffects,
} from './types';

/** A descendant can outlive the agent process, so a run's window reaches a little past its last step. */
const RUN_END_MARGIN_MS = 5 * 60_000;
const MAX_PARENT_DEPTH = 100;

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

type EsqlRecord = Record<string, unknown>;

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

const getLaunchMode = ({ entryMetaType, interactive }: ProcessRecord): LaunchMode => {
  if (entryMetaType === 'init') return 'scheduled';
  if (interactive === true) return 'interactive';
  if (entryMetaType) return 'scripted';
  return 'unknown';
};

const PRINT_FLAGS: readonly string[] = ['-p', '--print'];

/**
 * The prompt of a headless launch (`claude -p "<prompt>"`, `cursor-agent -p "<prompt>"`). Ordered
 * arguments are read first. Without them the command line is used, which has no quoting, so the
 * prompt is taken up to the next flag.
 */
export const parseHeadlessPrompt = (
  args: readonly string[] | undefined,
  commandLine: string | undefined
): { readonly isHeadless: boolean; readonly prompt?: string } => {
  if (args && args.length > 0) {
    const index = args.findIndex((arg) => PRINT_FLAGS.includes(arg));
    if (index >= 0) {
      const next = args[index + 1];
      return { isHeadless: true, prompt: next && !next.startsWith('-') ? next : undefined };
    }
    return { isHeadless: false };
  }
  if (!commandLine) return { isHeadless: false };
  const match = commandLine.match(/(?:^|\s)(?:-p|--print)(?:\s+(.*?))?(?=\s--?[a-zA-Z]|$)/);
  if (!match) return { isHeadless: false };
  const prompt = match[1]?.trim();
  return { isHeadless: true, prompt: prompt && !prompt.startsWith('-') ? prompt : undefined };
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
  truncated = false,
}: BuildAgentActivityParams): AgentActivity => {
  const own = mergeProcessEvents(ownEvents);
  const all = mergeProcessEvents([...ownEvents, ...descendantEvents]);
  const ownIds = new Set(own.keys());

  const rootOfOwn = (entityId: string): string => {
    let current = entityId;
    for (let depth = 0; depth < MAX_PARENT_DEPTH; depth++) {
      const parent = own.get(current)?.parentEntityId;
      if (!parent || !ownIds.has(parent) || parent === current) return current;
      current = parent;
    }
    return current;
  };

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
    const { root } = draft;
    const members = sortByTime(draft.members);
    const { isHeadless, prompt } = parseHeadlessPrompt(
      rootArgs?.get(root.entityId) ?? root.args,
      root.commandLine
    );
    const sections = buildSections(members.map(toProcessStep), draft.otel, root.sessionId);
    const lastTimestamp = members.length ? members[members.length - 1].timestamp : root.timestamp;
    return {
      id: root.entityId,
      root,
      start: root.timestamp,
      end: lastTimestamp,
      launchMode: getLaunchMode(root),
      isHeadless,
      headlessPrompt: prompt,
      sessionIds: [...sessionsOf(draft)],
      sections,
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
