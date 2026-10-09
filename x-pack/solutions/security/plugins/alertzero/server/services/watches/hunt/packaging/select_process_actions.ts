/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ALERTZERO_ACTION_ISOLATE_HOST_WORKFLOW_ID,
  ALERTZERO_ACTION_KILL_PROCESS_WORKFLOW_ID,
  ALERTZERO_ACTION_MEMORY_DUMP_WORKFLOW_ID,
  ALERTZERO_ACTION_SUSPEND_PROCESS_WORKFLOW_ID,
} from '@kbn/workflows/managed';
import { describeProcess } from './proposal_copy';
import type { CurrentRunHost, CurrentRunState, ProcessSelector } from './types';

export type ProcessActionKind = 'kill' | 'suspend' | 'memory_dump';

export type ProcessRule =
  | 'protected_system_process'
  | 'stale'
  | 'destructive_technique'
  | 'critical_ioc_match'
  | 'suspend_and_dump'
  | 'suspend_only';

export interface ProcessDecision {
  rule: ProcessRule;
  actions: ProcessActionKind[];
  /** One sentence for the proposal's Why list, opening with `Rule:`. */
  why: string;
  /** Present when the rule held something back, for the Analyst recommendation. */
  heldBack?: string;
}

export type HostRule =
  | 'lateral_or_c2_technique'
  | 'multiple_processes'
  | 'critical_severity'
  | 'isolation_unsupported'
  | 'not_warranted';

export interface HostDecision {
  rule: HostRule;
  isolate: boolean;
  why: string;
  heldBack?: string;
}

/** Workflow id → what the table calls it. Anything not here keeps the generic fan-out. */
export const DEFEND_ACTION_KINDS: Readonly<Record<string, ProcessActionKind | 'isolate'>> = {
  [ALERTZERO_ACTION_KILL_PROCESS_WORKFLOW_ID]: 'kill',
  [ALERTZERO_ACTION_SUSPEND_PROCESS_WORKFLOW_ID]: 'suspend',
  [ALERTZERO_ACTION_MEMORY_DUMP_WORKFLOW_ID]: 'memory_dump',
  [ALERTZERO_ACTION_ISOLATE_HOST_WORKFLOW_ID]: 'isolate',
};

/**
 * Matched case-insensitively on the basename of `processName`, then, when the selector carries
 * an executable path, only if that path is where the real system binary lives. A look-alike
 * `lsass.exe` running from a temp folder is not the system process and must not be shielded
 * from kill/suspend. With no path, the name alone decides.
 */
const WINDOWS_SYSTEM_DIR = '\\windows\\system32\\';
export const PROTECTED_PROCESS_DIRS: Readonly<Record<string, readonly string[]>> = {
  'lsass.exe': [WINDOWS_SYSTEM_DIR],
  'csrss.exe': [WINDOWS_SYSTEM_DIR],
  'wininit.exe': [WINDOWS_SYSTEM_DIR],
  'winlogon.exe': [WINDOWS_SYSTEM_DIR],
  'services.exe': [WINDOWS_SYSTEM_DIR],
  'smss.exe': [WINDOWS_SYSTEM_DIR],
  systemd: ['/usr/lib/systemd/', '/lib/systemd/', '/usr/sbin/', '/sbin/'],
  launchd: ['/sbin/'],
};
export const PROTECTED_PROCESS_NAMES = Object.keys(PROTECTED_PROCESS_DIRS);
export const PROTECTED_PIDS = [1, 4] as const;
/** Data destruction / impact techniques where suspending is not enough. */
export const DESTRUCTIVE_TECHNIQUES = ['T1486', 'T1485', 'T1490', 'T1489', 'T1561'] as const;
/** Lateral movement, C2, and exfiltration techniques that warrant cutting the host off. */
export const ISOLATE_TECHNIQUES = ['T1021', 'T1071', 'T1041', 'T1048', 'T1570'] as const;
export const STALE_PROCESS_AGE_MS = 7 * 24 * 60 * 60 * 1000;
export const MIN_PROCESSES_FOR_ISOLATE = 2;
export const MEMDUMP_PROCESS_CAPABILITY = 'memdump_process';
/** Endpoint rejects isolate/release on a host that does not report this. */
export const ISOLATION_CAPABILITY = 'isolation';

const basename = (path: string): string => path.split(/[\\/]/).pop() ?? path;

/** `T1021.002` matches `T1021`: compare on the id before the first `.`. */
const techniqueRoot = (techniqueId: string): string => techniqueId.split('.')[0].toUpperCase();

/** Every technique this process's refs were attributed to; empty for a plain sample ref. */
export const attributedTechniqueIds = (selector: ProcessSelector): string[] =>
  selector.techniqueIds?.length
    ? selector.techniqueIds
    : selector.techniqueId
    ? [selector.techniqueId]
    : [];

/**
 * The first of `techniqueIds` that is in `techniques` and confirmed by Tier 2, comparing roots on
 * both sides: `T1486` is confirmed by `T1486.001`. Confirmed means executed Tier 2 behaviors with
 * a hit, never the report's own SKI list.
 */
const findConfirmedAmong = (
  techniqueIds: readonly string[],
  techniques: readonly string[],
  state: CurrentRunState
): string | undefined =>
  techniqueIds.find(
    (id) =>
      techniques.includes(techniqueRoot(id)) &&
      state.evidence.tier2Confirmed.some((t) => techniqueRoot(t.techniqueId) === techniqueRoot(id))
  );

/**
 * Kill needs evidence tied to this process: one of its own attributed techniques must be
 * destructive and confirmed. An unattributed process never inherits the run's destructive
 * technique, because kill is irreversible and nothing says this process did it.
 */
const findDestructiveTechniqueFor = (
  selector: ProcessSelector,
  state: CurrentRunState
): string | undefined =>
  findConfirmedAmong(attributedTechniqueIds(selector), DESTRUCTIVE_TECHNIQUES, state);

const isProtectedProcess = (selector: ProcessSelector): boolean => {
  if (selector.pid !== undefined && (PROTECTED_PIDS as readonly number[]).includes(selector.pid)) {
    return true;
  }
  const name = basename(selector.processName).toLowerCase();
  // Own keys only: a process named `constructor` or `toString` must not resolve to an
  // inherited `Object.prototype` member.
  if (!Object.hasOwn(PROTECTED_PROCESS_DIRS, name)) {
    return false;
  }
  const dirs = PROTECTED_PROCESS_DIRS[name];
  if (!selector.processExecutable) {
    return true;
  }
  const executable = selector.processExecutable.toLowerCase().replace(/\//g, '\\');
  const posix = selector.processExecutable.toLowerCase();
  return dirs.some((dir) => executable.includes(dir) || posix.includes(dir));
};

/** Last seen before the window opened, or more than `STALE_PROCESS_AGE_MS` before it closed. */
export const isStale = (selector: ProcessSelector, state: CurrentRunState): boolean => {
  if (!selector.observedAt || !state.huntWindow) {
    return false;
  }
  const observedAt = Date.parse(selector.observedAt);
  const from = Date.parse(state.huntWindow.from);
  const to = Date.parse(state.huntWindow.to);
  if ([observedAt, from, to].some(Number.isNaN)) {
    return false;
  }
  return observedAt < from || to - observedAt > STALE_PROCESS_AGE_MS;
};

/**
 * One primary response per process. Evaluated in order, first match wins; pure, no I/O.
 */
export const selectProcessActions = ({
  selector,
  host,
  state,
}: {
  selector: ProcessSelector;
  host: CurrentRunHost;
  state: CurrentRunState;
}): ProcessDecision => {
  const process = describeProcess(selector);
  const canDump = host.capabilities.includes(MEMDUMP_PROCESS_CAPABILITY);

  if (isStale(selector, state)) {
    return {
      rule: 'stale',
      actions: [],
      why: `Rule: stale process; ${process} was last seen ${selector.observedAt}, outside the response window`,
      heldBack: `No action was proposed for ${process} on ${host.name}: it was last seen ${selector.observedAt}, outside the response window`,
    };
  }

  if (isProtectedProcess(selector)) {
    return {
      rule: 'protected_system_process',
      actions: canDump ? ['memory_dump'] : [],
      why: `Rule: protected system process; ${process} must not be killed or suspended, so ${
        canDump ? 'only a memory dump is proposed' : 'no process action is proposed'
      }`,
      heldBack: canDump
        ? `Kill and suspend were not proposed for ${process} on ${host.name}: it is a protected system process, so only a memory dump is proposed`
        : `No action was proposed for ${process} on ${host.name}: it is a protected system process and the endpoint does not report ${MEMDUMP_PROCESS_CAPABILITY}`,
    };
  }

  const destructive = findDestructiveTechniqueFor(selector, state);
  if (destructive) {
    return {
      rule: 'destructive_technique',
      actions: ['kill'],
      why: `Rule: destructive technique; ${destructive} was confirmed in this finding, so the process is killed rather than suspended`,
    };
  }

  if (state.severity === 'critical' && selector.iocMatched) {
    return {
      rule: 'critical_ioc_match',
      actions: ['kill'],
      why: `Rule: critical IOC match; severity is critical and ${process} was the Tier 1 IOC match, so it is killed rather than suspended`,
    };
  }

  if (canDump) {
    return {
      rule: 'suspend_and_dump',
      actions: ['suspend', 'memory_dump'],
      why: `Rule: default response; the endpoint reports ${MEMDUMP_PROCESS_CAPABILITY}, so a memory dump is proposed alongside the suspend`,
    };
  }

  return {
    rule: 'suspend_only',
    actions: ['suspend'],
    why: `Rule: default response; the endpoint does not report ${MEMDUMP_PROCESS_CAPABILITY}, so suspend is the only process action proposed`,
  };
};

/**
 * Whether isolate host is warranted, on evidence local to this host. Evaluated in order, first
 * match wins; pure, no I/O.
 * `activeProcessCount` is the number of non-stale selectors on this host (protected processes
 * count: a system process being implicated is suspicious). `hostTechniqueIds` are the techniques
 * those selectors were attributed to. Nothing here reads run-wide technique or severity alone: a
 * host with no live evidence of its own is never isolated for another host's behavior.
 */
const selectWarrantedHostAction = ({
  host,
  state,
  activeProcessCount,
  hostTechniqueIds,
}: {
  host: CurrentRunHost;
  state: CurrentRunState;
  activeProcessCount: number;
  hostTechniqueIds: readonly string[];
}): HostDecision => {
  const isolateTechnique = findConfirmedAmong(hostTechniqueIds, ISOLATE_TECHNIQUES, state);
  if (isolateTechnique) {
    return {
      rule: 'lateral_or_c2_technique',
      isolate: true,
      why: `Rule: lateral movement, C2, or exfiltration technique; ${isolateTechnique} was confirmed on this host`,
    };
  }

  if (activeProcessCount >= MIN_PROCESSES_FOR_ISOLATE) {
    return {
      rule: 'multiple_processes',
      isolate: true,
      why: `Rule: multiple suspicious processes; ${activeProcessCount} suspicious processes were observed on this host`,
    };
  }

  if (state.severity === 'critical' && activeProcessCount >= 1) {
    return {
      rule: 'critical_severity',
      isolate: true,
      why: `Rule: critical severity; the finding's severity is critical and this host has suspicious process activity`,
    };
  }

  return {
    rule: 'not_warranted',
    isolate: false,
    why: 'Rule: isolate not warranted',
    heldBack: `Isolate host ${host.name} was not proposed: ${activeProcessCount} suspicious ${
      activeProcessCount === 1 ? 'process' : 'processes'
    }, no lateral movement, C2, or exfiltration technique confirmed on this host, severity ${
      state.severity
    }`,
  };
};

/**
 * Whether isolate host is proposed: warranted by the table above, and supported by the endpoint.
 * A warranted isolate on a host that does not report `isolation` is held back rather than minted,
 * since Endpoint would reject it after an analyst approved it.
 */
export const selectHostActions = (args: {
  host: CurrentRunHost;
  state: CurrentRunState;
  activeProcessCount: number;
  hostTechniqueIds: readonly string[];
}): HostDecision => {
  const decision = selectWarrantedHostAction(args);
  if (!decision.isolate || args.host.capabilities.includes(ISOLATION_CAPABILITY)) {
    return decision;
  }
  return {
    rule: 'isolation_unsupported',
    isolate: false,
    why: decision.why,
    heldBack: `Isolate host ${
      args.host.name
    } was not proposed: it was warranted (${decision.why.replace(
      /^Rule: /,
      ''
    )}) but the endpoint does not report ${ISOLATION_CAPABILITY}`,
  };
};
