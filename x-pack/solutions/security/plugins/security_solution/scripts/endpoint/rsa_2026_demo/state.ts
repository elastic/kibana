/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { readFile, writeFile, unlink } from 'fs/promises';
import { homedir } from 'os';
import { join } from 'path';

export interface Rsa2026DemoStateV1 {
  version: 1;
  updatedAt: string;
  vmNames: string[];
  agentIds: string[];
  agentPolicyIds: string[];
  detectionRuleIds: string[];
  workflowIds: string[];
  connectorIds: string[];
}

export const DEFAULT_RSA_2026_STATE_FILE = join(homedir(), '.kbn-rsa-2026-demo-state.json');

const unique = (values: string[]) => Array.from(new Set(values.filter(Boolean)));

export const loadRsa2026DemoState = async (
  stateFile: string = DEFAULT_RSA_2026_STATE_FILE
): Promise<Rsa2026DemoStateV1 | undefined> => {
  try {
    const raw = await readFile(stateFile, 'utf-8');
    const parsed = JSON.parse(raw) as Partial<Rsa2026DemoStateV1>;

    if (parsed.version !== 1) return;

    return {
      version: 1,
      updatedAt: parsed.updatedAt ?? new Date().toISOString(),
      vmNames: unique(parsed.vmNames ?? []),
      agentIds: unique(parsed.agentIds ?? []),
      agentPolicyIds: unique(parsed.agentPolicyIds ?? []),
      detectionRuleIds: unique(parsed.detectionRuleIds ?? []),
      workflowIds: unique(parsed.workflowIds ?? []),
      connectorIds: unique(parsed.connectorIds ?? []),
    };
  } catch {
    // State file doesn't exist or is invalid JSON — return undefined
  }
};

export const saveRsa2026DemoState = async (
  state: Rsa2026DemoStateV1,
  stateFile: string = DEFAULT_RSA_2026_STATE_FILE
): Promise<void> => {
  const normalized: Rsa2026DemoStateV1 = {
    version: 1,
    updatedAt: new Date().toISOString(),
    vmNames: unique(state.vmNames),
    agentIds: unique(state.agentIds),
    agentPolicyIds: unique(state.agentPolicyIds),
    detectionRuleIds: unique(state.detectionRuleIds),
    workflowIds: unique(state.workflowIds),
    connectorIds: unique(state.connectorIds),
  };

  await writeFile(stateFile, `${JSON.stringify(normalized, null, 2)}\n`, {
    encoding: 'utf-8',
    mode: 0o600,
  });
};

export const updateRsa2026DemoState = async (
  patch: Partial<Omit<Rsa2026DemoStateV1, 'version' | 'updatedAt'>>,
  stateFile: string = DEFAULT_RSA_2026_STATE_FILE
): Promise<Rsa2026DemoStateV1> => {
  const current =
    (await loadRsa2026DemoState(stateFile)) ??
    ({
      version: 1,
      updatedAt: new Date().toISOString(),
      vmNames: [],
      agentIds: [],
      agentPolicyIds: [],
      detectionRuleIds: [],
      workflowIds: [],
      connectorIds: [],
    } satisfies Rsa2026DemoStateV1);

  const next: Rsa2026DemoStateV1 = {
    version: 1,
    updatedAt: new Date().toISOString(),
    vmNames: unique([...(current.vmNames ?? []), ...(patch.vmNames ?? [])]),
    agentIds: unique([...(current.agentIds ?? []), ...(patch.agentIds ?? [])]),
    agentPolicyIds: unique([...(current.agentPolicyIds ?? []), ...(patch.agentPolicyIds ?? [])]),
    detectionRuleIds: unique([
      ...(current.detectionRuleIds ?? []),
      ...(patch.detectionRuleIds ?? []),
    ]),
    workflowIds: unique([...(current.workflowIds ?? []), ...(patch.workflowIds ?? [])]),
    connectorIds: unique([...(current.connectorIds ?? []), ...(patch.connectorIds ?? [])]),
  };

  await saveRsa2026DemoState(next, stateFile);
  return next;
};

export const deleteRsa2026DemoState = async (
  stateFile: string = DEFAULT_RSA_2026_STATE_FILE
): Promise<void> => {
  try {
    await unlink(stateFile);
  } catch {
    // ignore
  }
};
