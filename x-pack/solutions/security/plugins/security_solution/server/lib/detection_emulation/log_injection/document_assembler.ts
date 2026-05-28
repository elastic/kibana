/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Document Assembler — Phase 1 + 2
 *
 * The new core engine that replaces the hardcoded generator.ts. Takes
 * inverted rule constraints (from query_inverter) and produces full
 * ECS documents by:
 *
 * 1. Applying constraint values to the document skeleton
 * 2. Filling missing required ECS fields with realistic defaults
 * 3. Building causal chains (process trees) via causal_chain
 * 4. Spreading timestamps realistically
 * 5. Ensuring consistent host/user/agent across correlated events
 */

import { v4 as uuidv4 } from 'uuid';
import type { InvertedRule, InvertedEvent, FieldConstraint } from './query_inverter';
import { buildCausalChain, buildSequenceChains, selectAncestry } from './causal_chain';

// ─── Types ─────────────────────────────────────────────────────────────

export interface AssemblerOptions {
  scenarioId: string;
  scenarioFingerprint: string;
  hostId: string;
  hostName: string;
  userName: string;
  os?: 'windows' | 'linux' | 'macos';
  /** Base timestamp. Defaults to now. */
  timestamp?: string;
  /** Whether to include causal chain (parent process tree). Default: true. */
  includeCausalChain?: boolean;
}

export interface AssembledDocument {
  '@timestamp': string;
  event: {
    category: string[];
    type: string[];
    kind: 'event';
    dataset: 'emulation.synthetic';
    module: 'emulation';
    action?: string;
  };
  process: {
    name: string;
    pid: number;
    entity_id: string;
    executable: string;
    command_line: string;
    working_directory: string;
    args: string[];
    parent: {
      name: string;
      pid: number;
      entity_id: string;
    };
  };
  host: { id: string; name: string; os: { type: string } };
  user: { name: string };
  agent: { type: 'endpoint' };
  kibana: {
    alert: {
      emulation: {
        id: string;
        mode: 'log_injection';
        scenarioFingerprint: string;
      };
    };
  };
  // Dynamic ECS fields from constraints
  file?: Record<string, unknown>;
  network?: Record<string, unknown>;
  destination?: Record<string, unknown>;
  source?: Record<string, unknown>;
  dns?: Record<string, unknown>;
  registry?: Record<string, unknown>;
  [key: string]: unknown;
}

// ─── ECS defaults by event category ────────────────────────────────────

interface CategoryDefaults {
  event: { type: string[] };
  process: { name: string; parent: string };
}

const CATEGORY_DEFAULTS: Record<string, CategoryDefaults> = {
  process: {
    event: { type: ['start'] },
    process: { name: 'cmd.exe', parent: 'explorer.exe' },
  },
  file: {
    event: { type: ['creation'] },
    process: { name: 'explorer.exe', parent: 'userinit.exe' },
  },
  network: {
    event: { type: ['connection'] },
    process: { name: 'chrome.exe', parent: 'explorer.exe' },
  },
  registry: {
    event: { type: ['change'] },
    process: { name: 'reg.exe', parent: 'cmd.exe' },
  },
  dns: {
    event: { type: ['query'] },
    process: { name: 'svchost.exe', parent: 'services.exe' },
  },
  authentication: {
    event: { type: ['start'] },
    process: { name: 'lsass.exe', parent: 'wininit.exe' },
  },
};

const FALLBACK_DEFAULTS: CategoryDefaults = {
  event: { type: ['info'] },
  process: { name: 'unknown', parent: 'unknown' },
};

// ─── Constraint application ────────────────────────────────────────────

/**
 * Apply field constraints to a document object by setting nested fields.
 * E.g., constraint { field: 'process.name', value: 'cmd.exe' }
 * sets doc.process.name = 'cmd.exe'.
 */
function applyConstraints(
  doc: Record<string, unknown>,
  constraints: FieldConstraint[]
): void {
  for (const c of constraints) {
    if (c.negated || c.operator === '!=' || c.operator === 'exists') continue;

    let value: unknown;
    if (c.operator === '==' || c.operator === 'wildcard') {
      value = resolveWildcard(c.value);
    } else if (c.operator === 'in' && Array.isArray(c.value)) {
      // Pick first value from the list
      value = c.value[0];
    } else if (c.operator === 'like' || c.operator === 'regex') {
      value = resolvePattern(c.value, c.operator);
    } else {
      // Range operators — use the boundary value
      value = c.value;
    }

    if (value !== undefined && value !== null) {
      setNestedField(doc, c.field, value);
    }
  }
}

/**
 * Resolve wildcard patterns into concrete values.
 * "* -EncodedCommand *" → "test -EncodedCommand test"
 */
function resolveWildcard(value: unknown): unknown {
  if (typeof value !== 'string') return value;
  if (!value.includes('*')) return value;
  // Replace leading/trailing * with realistic filler
  return value.replace(/^\*/, 'test').replace(/\*$/, 'test').replace(/\*/g, 'data');
}

/**
 * Resolve like/regex patterns into concrete matching values.
 */
function resolvePattern(value: unknown, type: 'like' | 'regex'): string {
  if (typeof value === 'string') {
    if (type === 'like') {
      // like uses ? (single) and * (multi) wildcards
      return value.replace(/\*/g, 'test').replace(/\?/g, 'x');
    }
    // For regex, return a simple string that would match common patterns
    return 'test_value';
  }
  if (Array.isArray(value)) return String(value[0] ?? 'test');
  return 'test';
}

/**
 * Set a nested field on an object. E.g., setNestedField(obj, 'a.b.c', 1)
 * creates obj.a.b.c = 1.
 */
function setNestedField(obj: Record<string, unknown>, path: string, value: unknown): void {
  const parts = path.split('.');
  let current: any = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    const key = parts[i];
    if (current[key] === undefined || typeof current[key] !== 'object') {
      current[key] = {};
    }
    current = current[key];
  }
  current[parts[parts.length - 1]] = value;
}

/**
 * Read a nested field from an object.
 */
function getNestedField(obj: Record<string, unknown>, path: string): unknown {
  const parts = path.split('.');
  let current: any = obj;
  for (const part of parts) {
    if (current === undefined || current === null) return undefined;
    current = current[part];
  }
  return current;
}

// ─── Core assembler ────────────────────────────────────────────────────

function inferOs(constraints: FieldConstraint[]): 'windows' | 'linux' | 'macos' {
  for (const c of constraints) {
    if (c.field === 'host.os.type' && typeof c.value === 'string') {
      if (['windows', 'linux', 'macos'].includes(c.value)) return c.value as any;
    }
    // Heuristic: .exe extension → Windows
    if (c.field === 'process.name' && typeof c.value === 'string') {
      if (c.value.endsWith('.exe')) return 'windows';
      if (c.value.startsWith('/')) return 'linux';
    }
    if (c.field === 'process.executable' && typeof c.value === 'string') {
      if (c.value.includes('\\')) return 'windows';
      if (c.value.startsWith('/')) return 'linux';
    }
  }
  return 'windows';
}

/**
 * Assemble documents for a single inverted event (one rule condition).
 */
function assembleEvent(
  event: InvertedEvent,
  options: AssemblerOptions
): AssembledDocument {
  const category = event.eventCategory !== 'any' ? event.eventCategory : 'process';
  const defaults = CATEGORY_DEFAULTS[category] ?? FALLBACK_DEFAULTS;
  const os = options.os ?? inferOs(event.constraints);
  const timestamp = options.timestamp ?? new Date().toISOString();

  // Start with skeleton
  const processName = extractStringConstraint(event.constraints, 'process.name') ?? defaults.process.name;
  const parentName = extractStringConstraint(event.constraints, 'process.parent.name') ?? defaults.process.parent;
  const commandLine = extractStringConstraint(event.constraints, 'process.command_line') ?? processName;

  // Build causal chain if enabled
  let processEntityId = uuidv4();
  let processPid = Math.floor(Math.random() * 65535) + 1;
  let parentEntityId = uuidv4();
  let parentPid = Math.floor(Math.random() * 65535) + 1;
  let finalTimestamp = timestamp;

  if (options.includeCausalChain !== false) {
    const ancestry = selectAncestry(processName, os);
    const chain = buildCausalChain(ancestry, processName, commandLine, os, {
      baseTimestamp: timestamp,
    });
    const leaf = chain.nodes[chain.nodes.length - 1];
    const parent = chain.nodes.length > 1 ? chain.nodes[chain.nodes.length - 2] : undefined;
    processEntityId = leaf.entityId;
    processPid = leaf.pid;
    finalTimestamp = leaf.timestamp;
    if (parent) {
      parentEntityId = parent.entityId;
      parentPid = parent.pid;
    }
  }

  const doc: AssembledDocument = {
    '@timestamp': finalTimestamp,
    event: {
      category: [category],
      type: defaults.event.type,
      kind: 'event',
      dataset: 'emulation.synthetic',
      module: 'emulation',
    },
    process: {
      name: processName,
      pid: processPid,
      entity_id: processEntityId,
      executable: os === 'windows'
        ? `C:\\Windows\\System32\\${processName}`
        : `/usr/bin/${processName}`,
      command_line: commandLine,
      working_directory: os === 'windows' ? 'C:\\Users\\user' : '/home/user',
      args: commandLine.split(' '),
      parent: {
        name: parentName,
        pid: parentPid,
        entity_id: parentEntityId,
      },
    },
    host: { id: options.hostId, name: options.hostName, os: { type: os } },
    user: { name: options.userName },
    agent: { type: 'endpoint' },
    kibana: {
      alert: {
        emulation: {
          id: options.scenarioId,
          mode: 'log_injection',
          scenarioFingerprint: options.scenarioFingerprint,
        },
      },
    },
  };

  // Apply all constraints from the inverted query
  applyConstraints(doc as unknown as Record<string, unknown>, event.constraints);

  return doc;
}

/**
 * Extract a string constraint value for a given field.
 */
function extractStringConstraint(constraints: FieldConstraint[], field: string): string | undefined {
  const c = constraints.find(
    (cc) => cc.field === field && (cc.operator === '==' || cc.operator === 'wildcard') && typeof cc.value === 'string'
  );
  if (!c) return undefined;
  return resolveWildcard(c.value) as string;
}

// ─── Public API ────────────────────────────────────────────────────────

/**
 * Assemble ECS documents for an inverted rule.
 *
 * For single-event rules: produces 1 document.
 * For EQL sequences: produces N documents (one per sequence term),
 *   with correlated join key values and ordered timestamps.
 */
export function assembleDocuments(
  rule: InvertedRule,
  options: AssemblerOptions
): AssembledDocument[] {
  if (rule.events.length <= 1) {
    // Single-event rule
    return [assembleEvent(rule.events[0], options)];
  }

  // Sequence: produce one doc per event, with shared join key values
  const docs: AssembledDocument[] = [];
  const baseTimestamp = options.timestamp ?? new Date().toISOString();
  const baseMs = new Date(baseTimestamp).getTime();

  // Generate shared join key values
  const sharedJoinValues: Record<string, unknown> = {};
  for (const key of rule.sequenceJoinKeys) {
    sharedJoinValues[key] = getSharedJoinValue(key, options);
  }

  for (let i = 0; i < rule.events.length; i++) {
    const event = rule.events[i];
    // Offset each event by a few seconds
    const eventTimestamp = new Date(baseMs + i * (2000 + Math.random() * 5000)).toISOString();
    const doc = assembleEvent(event, {
      ...options,
      timestamp: eventTimestamp,
    });

    // Apply shared join key values
    for (const [key, value] of Object.entries(sharedJoinValues)) {
      setNestedField(doc as unknown as Record<string, unknown>, key, value);
    }

    // Apply per-term join keys (they must match across events with same position)
    for (const key of event.joinKeys) {
      if (!(key in sharedJoinValues)) {
        if (!sharedJoinValues[key]) {
          sharedJoinValues[key] = getSharedJoinValue(key, options);
        }
        setNestedField(doc as unknown as Record<string, unknown>, key, sharedJoinValues[key]);
      }
    }

    docs.push(doc);
  }

  return docs;
}

/**
 * Generate a reasonable value for a join key field.
 */
function getSharedJoinValue(field: string, options: AssemblerOptions): unknown {
  switch (field) {
    case 'host.id':
      return options.hostId;
    case 'host.name':
      return options.hostName;
    case 'user.name':
      return options.userName;
    case 'process.entity_id':
      return uuidv4();
    case 'process.parent.entity_id':
      return uuidv4();
    default:
      // For unknown join keys, generate a stable ID
      return uuidv4();
  }
}
