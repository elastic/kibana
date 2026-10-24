/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { attachmentTools, internalTools } from '@kbn/agent-builder-common';

/**
 * What an Agent Builder internal tool does for the agent:
 * - `runtime`: agent scaffolding (planning, skill loading, attachment bookkeeping, user
 *   interaction). It does not read or change user data.
 * - `data_access`: reads data or acts on the user's behalf (files, shell, APIs, sub-agents).
 */
export type InternalToolKind = 'runtime' | 'data_access';

/**
 * Typed against Agent Builder's `internalTools`, so adding an internal tool there is a compile
 * error here until it is classified.
 */
const internalToolKinds = {
  runSubagent: 'data_access',
  sendMessageToAgent: 'data_access',
  sleep: 'runtime',
  writeTodos: 'runtime',
  loadSkill: 'runtime',
  searchRelevantSkills: 'runtime',
  askUserQuestion: 'runtime',
  readFile: 'data_access',
  listFiles: 'data_access',
  bash: 'data_access',
  setConversationMetadata: 'runtime',
  discoverApis: 'data_access',
  describeApi: 'data_access',
  describeApiType: 'data_access',
  executeApi: 'data_access',
} as const satisfies Record<keyof typeof internalTools, InternalToolKind>;

const internalToolKindById = new Map<string, InternalToolKind>(
  (Object.keys(internalTools) as Array<keyof typeof internalTools>).map((key) => [
    internalTools[key],
    internalToolKinds[key],
  ])
);

const attachmentToolIds = new Set<string>(Object.values(attachmentTools));

/** Legacy filestore tool ids still found in historical tool calls; they read data. */
const LEGACY_FILESTORE_TOOL_IDS = new Set([
  'filestore.read',
  'filestore.ls',
  'filestore.grep',
  'filestore.glob',
]);

/**
 * Returns the kind of an internal tool, or `undefined` when the id is not an internal tool.
 * Known attachment tools are runtime tools; legacy filestore tools access data. Any other id,
 * including an unknown `attachments.*` id, is unclassified so callers surface it instead of
 * silently dropping it.
 */
export const getInternalToolKind = (toolName: string): InternalToolKind | undefined => {
  if (attachmentToolIds.has(toolName)) {
    return 'runtime';
  }
  if (LEGACY_FILESTORE_TOOL_IDS.has(toolName)) {
    return 'data_access';
  }
  return internalToolKindById.get(toolName);
};
