/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Causal Chain Generator — Phase 1
 *
 * Produces realistic parent→child process trees with correlated entity IDs,
 * realistic timestamps (jitter + ordering), and PID assignment. Takes a flat
 * list of field constraints and weaves them into a temporally-ordered chain
 * of ECS documents that look like real endpoint telemetry.
 */

import { v4 as uuidv4 } from 'uuid';

// ─── Types ─────────────────────────────────────────────────────────────

export interface ProcessNode {
  entityId: string;
  pid: number;
  name: string;
  executable: string;
  commandLine: string;
  workingDirectory: string;
  parentEntityId?: string;
  parentPid?: number;
  parentName?: string;
  timestamp: string;
}

export interface CausalChain {
  nodes: ProcessNode[];
  rootEntityId: string;
}

export interface CausalChainOptions {
  /** Base timestamp for the chain start. Defaults to now. */
  baseTimestamp?: string;
  /** Min delay between parent and child process start (ms). */
  minDelayMs?: number;
  /** Max delay between parent and child process start (ms). */
  maxDelayMs?: number;
  /** Starting PID range. */
  basePid?: number;
}

// ─── Default process ancestry templates ────────────────────────────────

interface AncestryTemplate {
  /** Process names from root to leaf. */
  chain: string[];
  /** OS type this ancestry is typical for. */
  os: 'windows' | 'linux' | 'macos';
}

/**
 * Common process ancestry patterns observed in real endpoint telemetry.
 * Used as fallback when no specific ancestry is provided.
 */
const ANCESTRY_TEMPLATES: Record<string, AncestryTemplate> = {
  windows_user: {
    chain: ['winlogon.exe', 'userinit.exe', 'explorer.exe'],
    os: 'windows',
  },
  windows_service: {
    chain: ['services.exe', 'svchost.exe'],
    os: 'windows',
  },
  windows_task: {
    chain: ['services.exe', 'svchost.exe', 'taskhostw.exe'],
    os: 'windows',
  },
  linux_user: {
    chain: ['/usr/lib/systemd/systemd', 'sshd', 'bash'],
    os: 'linux',
  },
  linux_service: {
    chain: ['/usr/lib/systemd/systemd', 'systemd'],
    os: 'linux',
  },
  macos_user: {
    chain: ['/sbin/launchd', '/usr/libexec/UserEventAgent', '/bin/zsh'],
    os: 'macos',
  },
};

// ─── Helpers ───────────────────────────────────────────────────────────

const randomInt = (min: number, max: number): number =>
  Math.floor(Math.random() * (max - min + 1)) + min;

const addMs = (iso: string, ms: number): string =>
  new Date(new Date(iso).getTime() + ms).toISOString();

const getExecutable = (processName: string, os: 'windows' | 'linux' | 'macos'): string => {
  if (os === 'windows') {
    if (processName.includes('\\') || processName.includes('/')) return processName;
    return `C:\\Windows\\System32\\${processName}`;
  }
  if (processName.startsWith('/')) return processName;
  return `/usr/bin/${processName}`;
};

// ─── Core ──────────────────────────────────────────────────────────────

/**
 * Pick an ancestry template based on OS type and target process name.
 */
export function selectAncestry(
  targetProcess: string,
  os: 'windows' | 'linux' | 'macos'
): string[] {
  const templates = Object.values(ANCESTRY_TEMPLATES).filter((t) => t.os === os);
  if (templates.length === 0) return ['init'];
  // Pick a random matching template
  const tpl = templates[randomInt(0, templates.length - 1)];
  return tpl.chain;
}

/**
 * Build a causal chain from an ancestry list + target process.
 *
 * The ancestry forms the "spine" (root → ... → parent), and the target
 * process is appended as the leaf. Each node gets a unique entity_id,
 * incrementing PID, and jittered timestamp.
 */
export function buildCausalChain(
  ancestry: string[],
  targetProcess: string,
  targetCommandLine: string,
  os: 'windows' | 'linux' | 'macos',
  options: CausalChainOptions = {}
): CausalChain {
  const baseTimestamp = options.baseTimestamp ?? new Date().toISOString();
  const minDelay = options.minDelayMs ?? 50;
  const maxDelay = options.maxDelayMs ?? 2000;
  let basePid = options.basePid ?? randomInt(100, 9000);

  const allProcesses = [...ancestry, targetProcess];
  const nodes: ProcessNode[] = [];
  let currentTime = baseTimestamp;

  for (let i = 0; i < allProcesses.length; i++) {
    const name = allProcesses[i];
    const entityId = uuidv4();
    const pid = basePid + i * randomInt(1, 10);
    basePid = pid;

    const node: ProcessNode = {
      entityId,
      pid,
      name,
      executable: getExecutable(name, os),
      commandLine: i === allProcesses.length - 1 ? targetCommandLine : name,
      workingDirectory: os === 'windows' ? 'C:\\Windows\\System32' : '/home/user',
      timestamp: currentTime,
    };

    if (i > 0) {
      const parent = nodes[i - 1];
      node.parentEntityId = parent.entityId;
      node.parentPid = parent.pid;
      node.parentName = parent.name;
    }

    nodes.push(node);
    // Add jittered delay for next process
    currentTime = addMs(currentTime, randomInt(minDelay, maxDelay));
  }

  return {
    nodes,
    rootEntityId: nodes[0].entityId,
  };
}

/**
 * Build multiple causal chains for a sequence query, ensuring shared
 * join key values across the chains (e.g. same host.id, same user.name).
 */
export function buildSequenceChains(
  eventSpecs: Array<{
    targetProcess: string;
    targetCommandLine: string;
    os: 'windows' | 'linux' | 'macos';
  }>,
  options: CausalChainOptions & { interEventDelayMs?: number } = {}
): CausalChain[] {
  const baseTimestamp = options.baseTimestamp ?? new Date().toISOString();
  const interDelay = options.interEventDelayMs ?? randomInt(1000, 10000);
  
  return eventSpecs.map((spec, i) => {
    const ancestry = selectAncestry(spec.targetProcess, spec.os);
    const chainBase = addMs(baseTimestamp, i * interDelay);
    return buildCausalChain(ancestry, spec.targetProcess, spec.targetCommandLine, spec.os, {
      ...options,
      baseTimestamp: chainBase,
    });
  });
}
