/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { platformCoreTools } from '@kbn/agent-builder-common';
import { ToolType } from '@kbn/agent-builder-common/tools/definition';
import { describeZodSchema } from '@kbn/agent-builder-server';
import type { InternalToolDefinition, ToolRegistry } from '@kbn/agent-builder-server';

/** The part of the Agent Builder tool registry the sandbox needs. */
export type SandboxToolRegistry = Pick<ToolRegistry, 'list'>;

/** A parameter of a tool or sub-action the sandbox can call. */
export interface SandboxCallableField {
  name: string;
  type: string;
  required: boolean;
  description?: string;
}

export interface SandboxCallableTool {
  id: string;
  description: string;
  fields: SandboxCallableField[];
}

/** Tool types whose handlers only touch Kibana and Elasticsearch, never a third party. */
const CALLABLE_TOOL_TYPES: readonly ToolType[] = [
  ToolType.builtin,
  ToolType.esql,
  ToolType.index_search,
];

/**
 * Read-only tools that still make no sense from a script: they produce UI artifacts, start
 * workflows or attach to the conversation, so their result is not data a script can use.
 */
const NOT_SCRIPTABLE_TOOL_IDS: ReadonlySet<string> = new Set([
  platformCoreTools.createVisualization,
  platformCoreTools.createDiscoverSession,
  platformCoreTools.generateWorkflow,
  platformCoreTools.executeWorkflow,
  platformCoreTools.smlAttach,
  platformCoreTools.executeConnectorSubAction,
]);

/**
 * A tool joins the sandbox allowlist when running it from code the agent wrote is as safe as the
 * agent calling it directly: it declares itself read-only and non-destructive, needs no
 * confirmation, and is not one of the sandbox's own tools.
 */
export const isSandboxCallableTool = (tool: InternalToolDefinition): boolean =>
  CALLABLE_TOOL_TYPES.includes(tool.type) &&
  tool.annotations?.readOnlyHint === true &&
  tool.annotations.destructiveHint !== true &&
  (tool.confirmation?.askUser ?? 'never') === 'never' &&
  !tool.confirmation?.getConfirmation &&
  !NOT_SCRIPTABLE_TOOL_IDS.has(tool.id) &&
  !tool.id.startsWith('nightshift_sandbox_');

/** The ids of every tool a sandbox command may call for the user of the registry's request. */
export const listSandboxCallableToolIds = async (
  registry: SandboxToolRegistry
): Promise<string[]> => (await registry.list()).filter(isSandboxCallableTool).map(({ id }) => id);

/** The callable tools with their parameters, to describe them to the agent. */
export const describeSandboxCallableTools = async (
  registry: SandboxToolRegistry
): Promise<SandboxCallableTool[]> => {
  const tools = (await registry.list()).filter(isSandboxCallableTool);
  return Promise.all(
    tools.map(async ({ id, description, getSchema }) => ({
      id,
      description,
      fields: describeZodSchema(await getSchema()),
    }))
  );
};
