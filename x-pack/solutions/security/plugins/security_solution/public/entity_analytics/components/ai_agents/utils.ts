/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RiskSeverity } from '../../../../common/search_strategy';
import type { CriticalityLevelWithUnassigned } from '../../../../common/entity_analytics/asset_criticality/types';
import { AI_AGENT_ID_PREFIX, POC_MOCK_TAG } from './constants';
import type { AgentIdentity } from './types';

/** ES|QL and `_source` return a keyword as a string or an array; this reads either as an array. */
export const toStringArray = (value: unknown): string[] => {
  if (value == null) return [];
  const values = Array.isArray(value) ? value : [value];
  return values.filter((item): item is string => typeof item === 'string' && item !== '');
};

export const firstString = (value: unknown): string | undefined => toStringArray(value)[0];

export const toNumber = (value: unknown): number | undefined => {
  const single = Array.isArray(value) ? value[0] : value;
  if (typeof single === 'number' && Number.isFinite(single)) return single;
  if (typeof single === 'string' && single !== '' && Number.isFinite(Number(single))) {
    return Number(single);
  }
  return undefined;
};

/** Reads a boolean that may be mapped (`true`) or loaded from `_source` as a keyword (`"true"`). */
export const toBoolean = (value: unknown): boolean | undefined => {
  const single = Array.isArray(value) ? value[0] : value;
  if (typeof single === 'boolean') return single;
  if (single === 'true') return true;
  if (single === 'false') return false;
  return undefined;
};

/** The row's `tags` mark it as generated from a published schema rather than collected. */
export const isMockRow = (row: Record<string, unknown>): boolean =>
  toStringArray(row.tags).includes(POC_MOCK_TAG);

const RISK_LEVELS: readonly string[] = ['Unknown', 'Low', 'Moderate', 'High', 'Critical'];
export const toRiskLevel = (value: unknown): RiskSeverity | undefined => {
  const level = firstString(value);
  return level && RISK_LEVELS.includes(level) ? (level as RiskSeverity) : undefined;
};

const CRITICALITY_LEVELS: readonly string[] = [
  'low_impact',
  'medium_impact',
  'high_impact',
  'extreme_impact',
  'unassigned',
];
export const toCriticality = (value: unknown): CriticalityLevelWithUnassigned | undefined => {
  const level = firstString(value);
  return level && CRITICALITY_LEVELS.includes(level)
    ? (level as CriticalityLevelWithUnassigned)
    : undefined;
};

/**
 * Splits an install ID into its fields. The agent name and host ID never hold `@`, so anything
 * after the second `@` is the OS user name.
 */
export const parseAgentId = (entityId: string): AgentIdentity | undefined => {
  if (!entityId.startsWith(AI_AGENT_ID_PREFIX)) return undefined;
  const [agentName, hostId, ...userParts] = entityId.slice(AI_AGENT_ID_PREFIX.length).split('@');
  const userName = userParts.join('@');
  if (!agentName || !hostId || !userName) return undefined;
  return { entityId, agentName, hostId, userName };
};

/**
 * The version from a native install path: `~/.local/share/claude/versions/<version>` for Claude
 * Code, `~/.local/share/cursor-agent/versions/<version>/node` for Cursor CLI and
 * `/opt/homebrew/Caskroom/claude-code/<version>/claude` for Homebrew. npm, Windows and the Cursor
 * IDE have no version in the path.
 */
export const parseAgentVersion = (executable: string | undefined): string | undefined => {
  if (!executable) return undefined;
  const match =
    executable.match(/\/versions\/([^/]+)(?:\/node)?$/) ??
    executable.match(/\/Caskroom\/claude-code\/([^/]+)\/claude$/);
  return match?.[1];
};

/** The local user row an install runs as: `user:<os user>@<host.id>@local`. */
export const getLocalUserEntityId = ({ userName, hostId }: AgentIdentity): string =>
  `user:${userName}@${hostId}@local`;

export const getHostEntityId = ({ hostId }: Pick<AgentIdentity, 'hostId'>): string =>
  `host:${hostId}`;

const AGENT_DISPLAY_NAMES: Readonly<Record<string, string>> = {
  claude_code: 'Claude Code',
  cursor: 'Cursor',
};

/** Product name for `process.ai_agent.name`, falling back to the raw value. */
export const getAgentDisplayName = (agentName: string): string =>
  AGENT_DISPLAY_NAMES[agentName] ?? agentName;

export const isClaudeCode = (agentName: string): boolean => agentName === 'claude_code';

/**
 * The command inside a Claude Code tool shell, which wraps each Bash tool call as
 * `bash -c source <shell snapshot> && ... && eval '<command>' < /dev/null && pwd -P >| <cwd file>`.
 */
export const getToolShellCommand = (commandLine: string | undefined): string | undefined => {
  if (!commandLine?.includes('shell-snapshots')) return undefined;
  const match = commandLine.match(/&& eval '((?:[^']|'\\'')*)'/);
  return match?.[1].replace(/'\\''/g, "'");
};
