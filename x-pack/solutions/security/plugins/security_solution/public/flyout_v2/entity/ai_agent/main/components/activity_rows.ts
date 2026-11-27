/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  ActivityStep,
  ProcessStep,
  ToolCallStep,
} from '../../../../../entity_analytics/components/ai_security/activity/types';
import { getToolShellCommand } from '../../../../../entity_analytics/components/ai_security/utils';

export type ActivityRow =
  | { readonly kind: 'step'; readonly step: ActivityStep }
  | {
      readonly kind: 'tool_call';
      readonly step: ToolCallStep;
      /** The processes the tool call ran, without the tool shell that wrapped them. */
      readonly children: readonly ProcessStep[];
    };

const commandOf = ({ process }: ProcessStep): string | undefined =>
  (getToolShellCommand(process.commandLine) ?? process.commandLine)?.trim();

const isInSubtree = ({ process }: ProcessStep, subtree: ReadonlySet<string>): boolean =>
  (!!process.parentEntityId && subtree.has(process.parentEntityId)) ||
  process.ancestry.some((id) => subtree.has(id));

const isToolShell = ({ process }: ProcessStep): boolean =>
  getToolShellCommand(process.commandLine) !== undefined;

/**
 * The process a tool call ran: the newest match at or before the call, otherwise the first. A
 * tool shell wins over a process with the same command, because that process runs inside it.
 */
const findToolProcess = (
  toolCall: ToolCallStep,
  processes: readonly ProcessStep[],
  consumed: ReadonlySet<string>
): ProcessStep | undefined => {
  const command = toolCall.commandLine?.trim();
  if (!command) return undefined;
  const allMatches = processes.filter(
    (step) => !consumed.has(step.process.entityId) && commandOf(step) === command
  );
  const shells = allMatches.filter(isToolShell);
  const matches = shells.length > 0 ? shells : allMatches;
  const before = matches.filter((step) => step.timestamp <= toolCall.timestamp);
  return before[before.length - 1] ?? matches[0];
};

/**
 * Turns a section's steps into rows. Each tool call becomes one row with the processes it ran
 * nested under it, and a tool shell whose command matches the call is dropped. An OTel prompt
 * whose text is the run's headless prompt is dropped, because the run already shows it.
 */
export const buildActivityRows = (
  steps: readonly ActivityStep[],
  headlessPrompt?: string
): ActivityRow[] => {
  const hiddenPrompt = headlessPrompt?.trim();
  const visible = steps.filter(
    (step) => !(step.kind === 'prompt' && hiddenPrompt && step.text?.trim() === hiddenPrompt)
  );
  const processes = visible.filter((step): step is ProcessStep => step.kind === 'process');
  const consumed = new Set<string>();
  const children = new Map<ToolCallStep, ProcessStep[]>();

  const toolCalls = visible.filter((step): step is ToolCallStep => step.kind === 'tool_call');
  for (const toolCall of toolCalls) {
    const anchor = findToolProcess(toolCall, processes, consumed);
    if (anchor) {
      const subtree = new Set([anchor.process.entityId]);
      const nested: ProcessStep[] = isToolShell(anchor) ? [] : [anchor];
      for (const candidate of processes) {
        const { entityId } = candidate.process;
        if (!subtree.has(entityId) && !consumed.has(entityId) && isInSubtree(candidate, subtree)) {
          subtree.add(entityId);
          nested.push(candidate);
        }
      }
      subtree.forEach((id) => consumed.add(id));
      children.set(toolCall, nested);
    }
  }

  return visible.flatMap((step): ActivityRow[] => {
    if (step.kind === 'process' && consumed.has(step.process.entityId)) return [];
    if (step.kind === 'tool_call') {
      return [{ kind: 'tool_call', step, children: children.get(step) ?? [] }];
    }
    return [{ kind: 'step', step }];
  });
};

/**
 * The run's command line with the headless prompt replaced by an ellipsis (`claude -p …`), since
 * the prompt is shown on its own. Without a known prompt, everything after `-p` is cut.
 */
export const getRootCommandLabel = (
  commandLine: string | undefined,
  headlessPrompt: string | undefined
): string | undefined => {
  if (!commandLine) return undefined;
  if (headlessPrompt && commandLine.includes(headlessPrompt)) {
    return commandLine.replace(headlessPrompt, '…');
  }
  return commandLine.replace(/((?:^|\s)(?:-p|--print))\s.*$/, '$1 …');
};
