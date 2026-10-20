/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { BuiltinSkillBoundedTool } from '@kbn/agent-builder-server/skills';
import { z } from '@kbn/zod/v4';
import { ToolResultType, ToolType } from '@kbn/agent-builder-common';
import { getToolResultId } from '@kbn/agent-builder-server/tools';

import type { EndpointAppContextService } from '../../../../../endpoint/endpoint_app_context_services';
import { SCAN_TOOL_ID } from '../..';
import {
  buildResponseActionComment,
  MAX_ACTION_COMMENT_LENGTH,
  MAX_FILE_PATH_LENGTH,
  dispatchErrorResult,
  summarizeActionErrors,
  waitForActionCompletion,
} from '../types';
import { hostTargetFields, requireHostTarget } from '../services/resolve_target';
import { buildDispatchConfirmation, prepareDispatch } from '../services/dispatch_action';

// Code points that are invisible or misleading when rendered inside the
// confirmation card's Markdown code span: control characters (C0, DEL, C1 — a
// newline inside a code span renders as a space, so `/tmp/a\nb` would display
// as `/tmp/a b` while the real path is what gets dispatched), bidi controls
// (RTLO U+202E can visually reverse a filename — a spoofing vector on an
// approval card), zero-width characters, and the backtick that would break the
// code span itself. Everything else — including backslashes in Windows paths —
// is left exactly as typed.
const INVISIBLE_PATH_CODE_POINTS = new Set<number>([
  0x200e,
  0x200f, // LRM, RLM
  ...range(0x202a, 0x202e), // bidi LRE..PDF, incl. RTLO
  ...range(0x2066, 0x2069), // bidi LRI..PDI
  0x200b,
  0x200c,
  0x200d, // zero-width space, ZWNJ, ZWJ
  0xfeff, // BOM / zero-width no-break space
]);

function range(from: number, to: number): number[] {
  return Array.from({ length: to - from + 1 }, (_, i) => from + i);
}

function isControlCodePoint(cp: number): boolean {
  return cp <= 0x1f || cp === 0x7f || (cp >= 0x80 && cp <= 0x9f);
}

function escapeForCodeSpan(cp: number): string {
  if (cp === 0x0a) return '\\n';
  if (cp === 0x0d) return '\\r';
  if (cp === 0x09) return '\\t';
  return `\\u{${cp.toString(16).toUpperCase().padStart(4, '0')}}`;
}

/**
 * Renders a tool path for the human confirmation card: wrapped in plain double
 * quotes (so leading/trailing whitespace stays visible) with every invisible or
 * misleading code point shown as an escape. Ordinary characters — including
 * backslashes in Windows paths — are kept literal; the dispatched path is never
 * altered by this helper.
 */
export function formatPathForConfirmation(path: string): string {
  let formatted = '';
  for (const ch of path) {
    const cp = ch.codePointAt(0) ?? ch.charCodeAt(0);
    if (
      isControlCodePoint(cp) ||
      cp === 0x60 /* backtick breaks the code span */ ||
      INVISIBLE_PATH_CODE_POINTS.has(cp)
    ) {
      formatted += escapeForCodeSpan(cp);
    } else {
      formatted += ch;
    }
  }
  return `"${formatted}"`;
}

const scanHostSchema = z
  .object({
    ...hostTargetFields('The hostname of the endpoint to scan for malware.'),
    path: z
      .string()
      .min(1)
      .max(MAX_FILE_PATH_LENGTH)
      // Mirrors the HTTP route (`ScanActionRequestSchema`): reject whitespace-only
      // input but keep the path literal. No `.trim()`: a trailing space names a
      // different file on Linux/macOS.
      .refine((value) => value.trim().length > 0, 'path cannot be an empty string')
      .describe('The absolute file or folder path on the endpoint to scan for malware.'),
    comment: z
      .string()
      .min(1)
      .max(MAX_ACTION_COMMENT_LENGTH)
      .optional()
      .describe('An optional comment explaining why the scan is being performed.'),
  })
  .refine(requireHostTarget.check, { message: requireHostTarget.message });

/**
 * Malware scan action. `scan` only detects malware on the provided path using
 * the endpoint's existing Elastic Defend policy — it does not execute or modify
 * anything on the host. It is nonetheless classified as a write action and
 * therefore always requires an explicit human confirmation step before the
 * skill dispatches it (see the skill system instructions).
 */
export const scanHostTool = (
  endpointAppContextService: EndpointAppContextService
): BuiltinSkillBoundedTool => {
  return {
    id: SCAN_TOOL_ID,
    type: ToolType.builtin,
    description: `Scans a file or folder path on a host (identified by hostname, exact IP address, or agent ID; retry ambiguous_hostname or ambiguous_ip with the selected agent ID) for malware using the endpoint's existing Elastic Defend policy. The action is dispatched through the Elastic Defend Response Actions service. Requires explicit analyst confirmation before dispatch.`,
    schema: scanHostSchema,
    // HITL gate enforced by the framework, not skill prose: the runner prompts
    // the analyst for confirmation before every dispatch.
    confirmation: {
      askUser: 'always',
      getConfirmation: async ({ toolParams, context }) =>
        buildDispatchConfirmation(
          {
            action: 'scan',
            params: {
              hostName: toolParams.hostName as string | undefined,
              ip: toolParams.ip as string | undefined,
              agentId: toolParams.agentId as string | undefined,
            },
            context,
            endpointAppContextService,
            requiredPrivilege: 'canWriteScanOperations',
          },
          {
            title: 'Run malware scan?',
            color: 'warning',
            confirmText: 'Run scan',
            comment: toolParams.comment as string | undefined,
            describe: (host) => {
              // Quoted with invisible characters escaped so what the analyst
              // approves is exactly what gets dispatched (see
              // `formatPathForConfirmation`).
              const shownPath =
                typeof toolParams.path === 'string'
                  ? formatPathForConfirmation(toolParams.path)
                  : 'the specified path';
              return `This will scan \`${shownPath}\` on ${host} for malware.`;
            },
          }
        ),
    },
    handler: async (params, context) => {
      const { logger, request, runContext, spaceId } = context;
      // Set just before the client call: from there on a throw does not mean
      // nothing was sent (see `dispatchErrorResult`).
      let dispatchAttempted = false;
      try {
        const requestedHostName = params.hostName as string | undefined;
        const requestedAgentId = params.agentId as string | undefined;
        const requestedIp = params.ip as string | undefined;
        const path = params.path as string;
        const comment = params.comment as string | undefined;

        const prepared = await prepareDispatch({
          action: 'scan',
          params: { hostName: requestedHostName, ip: requestedIp, agentId: requestedAgentId },
          context,
          endpointAppContextService,
          requiredPrivilege: 'canWriteScanOperations',
        });
        if (prepared.kind === 'result') {
          return prepared.result;
        }
        const { target } = prepared;

        const hostName = target.hostLabel;
        const { agentId, agentType } = target.endpoint;
        const endpointIds = [agentId];

        const responseActionsClient = endpointAppContextService.getInternalResponseActionsClient({
          spaceId,
          request,
          agentType,
          // Analyst-initiated via chat (gated behind HITL confirmation), not a
          // system/rule-triggered action — RESPONSE_ACTIONS_SUPPORT_MAP gates
          // `scan` per agent type/action-type combination (see
          // is_response_action_supported.ts); `manual` is what a human
          // confirming in chat maps to.
          isAutomated: false,
        });

        dispatchAttempted = true;
        const dispatchedAction = await responseActionsClient.scan(
          {
            endpoint_ids: endpointIds,
            comment: buildResponseActionComment(
              `Malware scan requested via AI agent: ${hostName}`,
              runContext,
              comment
            ),
            parameters: { path },
          },
          { hosts: { [endpointIds[0]]: { name: hostName } } }
        );

        // Offline write actions are durably queued. Polling cannot complete
        // until the endpoint reconnects, so return the write-time snapshot and
        // action ID immediately; online scans still wait for the real outcome.
        const actionDetails =
          target.endpoint.status === 'offline'
            ? dispatchedAction
            : await waitForActionCompletion(
                endpointAppContextService,
                spaceId,
                dispatchedAction.id,
                logger,
                dispatchedAction
              );

        return {
          results: [
            {
              tool_result_id: getToolResultId(),
              type: ToolResultType.other,
              data: {
                kind: 'response_action_result' as const,
                action: 'scan' as const,
                hostName,
                found: true,
                path,
                actionId: actionDetails.id,
                status: actionDetails.status,
                wasSuccessful: actionDetails.wasSuccessful,
                ...(target.endpoint.status === 'offline'
                  ? {
                      queued: true,
                      message:
                        'The action is queued and will execute when the endpoint reconnects.',
                    }
                  : summarizeActionErrors(actionDetails.errors) ?? {}),
                hosts: actionDetails.hosts,
                comment,
              },
            },
          ],
        };
      } catch (error) {
        logger.error(error);
        return dispatchErrorResult('scanning host', error, { dispatchAttempted });
      }
    },
  };
};
