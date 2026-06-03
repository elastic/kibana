/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ToolPolicyConfirmationDefinition } from '@kbn/agent-builder-server/tools/builtin';

/**
 * Per-family confirmation message builder shared by the four
 * `runXxxCommand` tools. Centralises:
 *   - the title format (so all four families look identical in the UI)
 *   - the body — endpoint count, command, optional `parameters` digest
 *   - the destructive/non-destructive split (drives `color: 'danger' | 'warning'`)
 *
 * Why this lives in its own file: the per-family tool files would
 * otherwise each ship ~25 lines of identical formatting, drifting on
 * the next refactor. Keeping it here means the UX stays consistent
 * and PROD-2 (audit-context follow-up) can extend the body once.
 *
 * NOT i18n'd — matches the existing convention in this folder
 * (validate_rule_tool.ts, with_command_gates.ts both use plain
 * English error strings). When this folder gains an i18n surface,
 * promote alongside.
 */

/**
 * Commands whose side effects are non-recoverable from the endpoint's
 * perspective. The dialog renders the confirm button red instead of
 * yellow. Mirrors the workflow-execute-step `DESTRUCTIVE_STEP_TYPES`
 * pattern but scoped to the EDR command surface.
 *
 * Notes:
 *   - `kill-process` / `suspend-process` interrupt user-mode work.
 *   - `isolate` severs network — recoverable via `unisolate` but
 *     visible to anyone monitoring the box.
 *   - `execute` / `runscript` run arbitrary code on the host.
 *   - `memory-dump` exfiltrates raw memory pages — privacy / data-class
 *     impact for the operator.
 *   - `upload` writes attacker-controllable content to the endpoint
 *     filesystem.
 */
const DESTRUCTIVE_COMMANDS = new Set<string>([
  'kill-process',
  'suspend-process',
  'isolate',
  'execute',
  'runscript',
  'memory-dump',
  'upload',
]);

const FAMILY_LABELS = {
  process: 'process-family',
  file: 'file-family',
  network: 'network-family',
  execution: 'execution-family',
} as const;

export type EmulationCommandFamily = keyof typeof FAMILY_LABELS;

export interface BuildEmulationConfirmationInput {
  family: EmulationCommandFamily;
  emulationId: string;
  command: string;
  endpointIds: readonly string[];
  /**
   * Opaque per-command params from the boundary schema. Rendered as a
   * one-line JSON digest so the operator can see exactly what would
   * dispatch (e.g. `{ "pid": 4242 }` for `kill-process`). Keys with
   * obvious size (e.g. `file` blob for upload) are summarised rather
   * than dumped raw.
   */
  parameters?: Record<string, unknown>;
}

const isLikelyBlob = (value: unknown): boolean => typeof value === 'string' && value.length > 240;

/**
 * Render `parameters` as a compact, human-readable line suitable for
 * the confirmation dialog. Strings >240 chars (e.g. base64-encoded
 * file uploads) are summarised as `[<N> bytes]` so the dialog stays
 * legible.
 */
const formatParameters = (parameters?: Record<string, unknown>): string | undefined => {
  if (!parameters || Object.keys(parameters).length === 0) {
    return undefined;
  }
  const safe: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(parameters)) {
    safe[key] = isLikelyBlob(value) ? `[${(value as string).length} bytes]` : value;
  }
  try {
    return JSON.stringify(safe);
  } catch {
    return '[unserialisable parameters]';
  }
};

const formatEndpointList = (endpointIds: readonly string[]): string => {
  if (endpointIds.length === 1) {
    return `\`${endpointIds[0]}\``;
  }
  if (endpointIds.length <= 3) {
    return endpointIds.map((id) => `\`${id}\``).join(', ');
  }
  const head = endpointIds
    .slice(0, 3)
    .map((id) => `\`${id}\``)
    .join(', ');
  return `${head} (+${endpointIds.length - 3} more)`;
};

/**
 * Build the {@link ToolPolicyConfirmationDefinition} surfaced by the
 * agent-builder framework when an LLM invokes one of the four
 * per-family tools with `confirmation: { askUser: 'once' }`.
 *
 * The framework calls this with the literal `toolParams` the LLM
 * proposed (post-schema-validation, pre-handler), so the operator
 * sees the exact arguments before approving.
 */
export const buildEmulationConfirmation = (
  input: BuildEmulationConfirmationInput
): ToolPolicyConfirmationDefinition => {
  const { family, emulationId, command, endpointIds, parameters } = input;
  const isDestructive = DESTRUCTIVE_COMMANDS.has(command);
  const familyLabel = FAMILY_LABELS[family];
  const endpointSummary = formatEndpointList(endpointIds);
  const paramsLine = formatParameters(parameters);

  const messageLines: string[] = [
    `**Command:** \`${command}\` (${familyLabel})`,
    `**Endpoints (${endpointIds.length}):** ${endpointSummary}`,
    `**Emulation ID:** \`${emulationId}\``,
  ];
  if (paramsLine) {
    messageLines.push(`**Parameters:** \`${paramsLine}\``);
  }
  messageLines.push(
    '',
    isDestructive
      ? 'This action is **destructive** and will run on the listed endpoints. Cancel if anything looks wrong.'
      : 'This action will run on the listed endpoints. Cancel if anything looks wrong.'
  );

  return {
    title: `Run \`${command}\` on ${endpointIds.length} endpoint${
      endpointIds.length === 1 ? '' : 's'
    }`,
    message: messageLines.join('\n'),
    confirm_text: isDestructive ? 'Run anyway' : 'Run',
    cancel_text: 'Cancel',
    color: isDestructive ? ('danger' as const) : ('warning' as const),
  };
};
