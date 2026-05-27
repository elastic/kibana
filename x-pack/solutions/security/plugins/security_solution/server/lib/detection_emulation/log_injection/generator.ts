/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EmulationPayload } from '../payloads';

// ─── Per-technique ECS field templates ───────────────────────────────────────

interface TechniqueTemplate {
  event: { category: string[]; type: string[] };
  process: { name: string; parent: { name: string } };
}

const DEFAULT_TEMPLATE: TechniqueTemplate = {
  event: { category: ['process'], type: ['start'] },
  process: { name: 'cmd.exe', parent: { name: 'explorer.exe' } },
};

// One entry per Wave-1 payload. Values are chosen to satisfy the field presence
// requirements of the associated Elastic prebuilt rules.
const TECHNIQUE_TEMPLATES: Record<string, TechniqueTemplate> = {
  'T1059.001': {
    event: { category: ['process'], type: ['start'] },
    process: { name: 'powershell.exe', parent: { name: 'cmd.exe' } },
  },
  'T1059.003': {
    event: { category: ['process'], type: ['start'] },
    process: { name: 'cmd.exe', parent: { name: 'explorer.exe' } },
  },
  'T1059.004': {
    event: { category: ['process'], type: ['start'] },
    process: { name: 'sh', parent: { name: 'bash' } },
  },
  'T1218.005': {
    event: { category: ['process'], type: ['start'] },
    process: { name: 'mshta.exe', parent: { name: 'explorer.exe' } },
  },
  'T1218.011': {
    event: { category: ['process'], type: ['start'] },
    process: { name: 'rundll32.exe', parent: { name: 'cmd.exe' } },
  },
  'T1053.005': {
    event: { category: ['process'], type: ['start'] },
    process: { name: 'schtasks.exe', parent: { name: 'cmd.exe' } },
  },
  'T1547.001': {
    event: { category: ['registry'], type: ['change'] },
    process: { name: 'reg.exe', parent: { name: 'cmd.exe' } },
  },
  T1057: {
    event: { category: ['process'], type: ['start'] },
    process: { name: 'tasklist.exe', parent: { name: 'cmd.exe' } },
  },
  'T1003.001': {
    event: { category: ['process'], type: ['start'] },
    process: { name: 'tasklist.exe', parent: { name: 'cmd.exe' } },
  },
  'T1070.004': {
    event: { category: ['file'], type: ['deletion'] },
    process: { name: 'cmd.exe', parent: { name: 'cmd.exe' } },
  },
  'T1071.001': {
    event: { category: ['network'], type: ['connection'] },
    process: { name: 'powershell.exe', parent: { name: 'cmd.exe' } },
  },
  T1112: {
    event: { category: ['registry'], type: ['change'] },
    process: { name: 'reg.exe', parent: { name: 'cmd.exe' } },
  },
};

// ─── Public types ─────────────────────────────────────────────────────────────

export interface GenerateDocsInput {
  scenarioId: string;
  scenarioFingerprint: string;
  payloads: EmulationPayload[];
  hostId: string;
  hostName: string;
  userName: string;
  /** ISO 8601 — defaults to `new Date().toISOString()`. */
  timestamp?: string;
}

export interface EcsEmulationDocument {
  '@timestamp': string;
  event: {
    category: string[];
    type: string[];
    kind: 'event';
    dataset: 'emulation.synthetic';
    module: 'emulation';
  };
  process: {
    name: string;
    command_line: string;
    parent: { name: string };
  };
  host: { id: string; name: string; os: { type: 'windows' | 'linux' | 'macos' } };
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
}

// ─── Core ─────────────────────────────────────────────────────────────────────

/** T1059.004 (Unix Shell) is the only Wave-1 technique that targets Linux/macOS. */
const LINUX_TECHNIQUES = new Set(['T1059.004']);

const resolveOsType = (techniqueId: string): 'windows' | 'linux' | 'macos' =>
  LINUX_TECHNIQUES.has(techniqueId) ? 'linux' : 'windows';

const resolveCommandLine = (payload: EmulationPayload): string => {
  const cmd = payload.parameters?.command;
  if (typeof cmd === 'string' && cmd.length > 0) return cmd;
  // running-processes and similar built-in commands have no command string;
  // fall back to the process name from the template.
  return TECHNIQUE_TEMPLATES[payload.techniqueId]?.process.name ?? 'cmd.exe';
};

/**
 * Generates one ECS document per payload.
 *
 * Each document is structurally identical to what an endpoint agent would
 * produce for that technique, so Detection Engine rules fire without needing
 * any awareness of the log-injection mode.
 */
export const generateDocs = (input: GenerateDocsInput): EcsEmulationDocument[] => {
  const { scenarioId, scenarioFingerprint, payloads, hostId, hostName, userName } = input;
  const timestamp = input.timestamp ?? new Date().toISOString();

  return payloads.map((payload): EcsEmulationDocument => {
    const tpl = TECHNIQUE_TEMPLATES[payload.techniqueId] ?? DEFAULT_TEMPLATE;
    return {
      '@timestamp': timestamp,
      event: {
        ...tpl.event,
        kind: 'event',
        dataset: 'emulation.synthetic' as const,
        module: 'emulation' as const,
      },
      process: {
        name: tpl.process.name,
        command_line: resolveCommandLine(payload),
        parent: tpl.process.parent,
      },
      host: { id: hostId, name: hostName, os: { type: resolveOsType(payload.techniqueId) } },
      user: { name: userName },
      agent: { type: 'endpoint' },
      kibana: {
        alert: {
          emulation: {
            id: scenarioId,
            mode: 'log_injection',
            scenarioFingerprint,
          },
        },
      },
    };
  });
};
