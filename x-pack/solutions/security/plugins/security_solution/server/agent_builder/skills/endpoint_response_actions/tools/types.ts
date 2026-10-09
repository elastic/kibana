/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import pRetry from 'p-retry';
import type { Logger } from '@kbn/logging';
import type { RunContext } from '@kbn/agent-builder-server';
import { getAgentFromRunContext } from '@kbn/agent-builder-server';
import { getToolResultId } from '@kbn/agent-builder-server/tools';
import { ToolResultType } from '@kbn/agent-builder-common';
import type { ResponseActionAgentType } from '../../../../../common/endpoint/service/response_actions/constants';
import { RESPONSE_ACTIONS_SUPPORTED_INTEGRATION_TYPES } from '../../../../../common/endpoint/service/response_actions/constants';
import type { HostInfo, ActionDetails } from '../../../../../common/endpoint/types';
import type { EndpointAppContextService } from '../../../../endpoint/endpoint_app_context_services';
import { getActionDetailsById } from '../../../../endpoint/services/actions';

export type { HostInfo };

/**
 * Schema bounds shared across the response-action tools. These limits keep
 * user/LLM input from generating oversized KQL queries, action payloads, or
 * chat responses while staying generous enough for real hostnames and paths.
 */
export const MAX_HOSTNAME_LENGTH = 256;
export const MAX_HOSTNAME_FILTER_LENGTH = 256;
/** Fleet agent IDs are UUIDs/ULIDs; generous bound for schema validation. */
export const MAX_AGENT_ID_LENGTH = 64;
/** Bounds file/directory path arguments (e.g. execute, runscript). */
export const MAX_FILE_PATH_LENGTH = 4096;
/** Bounds the free-text comment recorded on dispatched response actions. */
export const MAX_ACTION_COMMENT_LENGTH = 2048;

/**
 * Endpoints returned per page by `list_endpoints`. The tool exposes a `page`
 * parameter and reports `total`/`hasMore`, so a fleet larger than one page can
 * still be enumerated instead of being silently truncated.
 */
export const LIST_ENDPOINTS_PAGE_SIZE = 50;

/**
 * Bounds applied to response-action `outputs` before they reach the model.
 *
 * `outputs` is unbounded by design: `execute`/`runscript` carry stdout/stderr
 * that can reach tens of MB, and `get-processes` returns one entry per process.
 * Forwarding it raw lets a single lookup exhaust the conversation context, so
 * the tool returns a summary plus a bounded sample and reports what it dropped.
 */
export const MAX_OUTPUT_AGENTS = 10;
export const MAX_OUTPUT_ENTRIES_PER_AGENT = 20;
export const MAX_OUTPUT_STRING_LENGTH = 2000;

/**
 * Bounds for the object-valued part of an output. `ActionResponseOutput.content`
 * is an object (`{ canceled_by?, ...TOutputContent }`) whose `entries`, stdout
 * and stderr live one level deeper than the flat shape, so bounding only
 * top-level strings leaves the multi-MB payload unbounded. Nesting is walked to
 * a fixed depth and any value beyond it is serialized and truncated.
 */
export const MAX_OUTPUT_DEPTH = 4;
export const MAX_OUTPUT_OBJECT_KEYS = 50;

/**
 * Parameter keys reported for one action. `parameters` is a flat bag of
 * action input (hosts, comment, script body, timeout...), so a modest key cap
 * is enough; the size risk is in the VALUES, not the key count — a
 * CrowdStrike `runscript` carries a 65,536-character `raw` script and an
 * 8,192-character `commandLine`.
 */
export const MAX_PARAMETER_KEYS = 50;

/**
 * Hosts and per-agent states reported for one action. A fan-out action carries
 * one entry per targeted agent, so a batch isolate injects thousands of records
 * into the model context unless they are bounded.
 */
export const MAX_ACTION_HOSTS = 50;
export const MAX_AGENT_STATE_ENTRIES = MAX_OUTPUT_AGENTS;

/**
 * Cumulative serialized budget for the whole `agentState` summary — bounds the
 * combined per-agent error payloads that individually pass their own bounds.
 */
export const MAX_AGENT_STATE_TOTAL_CHARS = 24_000;

/**
 * Errors reported for one action. `getActionCompletionInfo` appends every
 * unsuccessful agent response's errors into this aggregate array, so a large
 * failed fan-out can carry thousands of entries (with arbitrarily long text)
 * even after hosts, outputs and agentState are capped.
 */
export const MAX_ACTION_ERRORS = 20;

/**
 * Cumulative character budget for a single action's `outputs` summary. The
 * per-dimension caps above still allow the dimensions to sum to well over a
 * megabyte, so the accumulated summary is measured as it is built and further
 * agents are dropped once the budget is exceeded (`summaryTruncated`).
 */
export const MAX_OUTPUT_TOTAL_CHARS = 64_000;

/**
 * Tool-result token budget for `get_response_action_status`. The default
 * guardrail (20k tokens) swaps an over-size payload for a truncated preview,
 * which would hide the structured truncation counters the model relies on.
 *
 * Guarantees (4 characters per token):
 * - `outputs` never exceeds `MAX_OUTPUT_TOTAL_CHARS` (64k): later agents are
 *   dropped and the always-kept first agent is shrunk to fit, reporting what
 *   it lost in `truncatedFields` (`retainedOverBudget` only when `agentId`
 *   alone is over budget).
 * - `agentState` is held to `MAX_AGENT_STATE_TOTAL_CHARS` (24k), except that
 *   one over-budget entry is kept and flagged `agentStateRetainedOverBudget`.
 *
 * Sizing assumption (not a guarantee): `parameters` and `errors` are capped
 * per key / per entry, not in total. With every value a maximum-length string
 * they add `MAX_PARAMETER_KEYS * MAX_OUTPUT_STRING_LENGTH` (100k) and
 * `MAX_ACTION_ERRORS * MAX_OUTPUT_STRING_LENGTH` (40k) chars, so
 * 64k + 24k + 100k + 40k = 228k chars = 57k tokens, and 60_000 tokens (240k
 * chars) leaves ~3k tokens for `hosts` and the envelope. Nested values, a
 * single `agentState` entry and `hosts` have no total cap, so a pathological
 * record can still exceed the budget and get the platform's truncated
 * preview; the budget covers the realistic worst case, not an adversarial
 * one. `types.test.ts` pins the derivation.
 */
export const GET_RESPONSE_ACTION_STATUS_MAX_RESULT_TOKENS = 60_000;

/**
 * Typed error codes for all response-action tools. Keeping a closed union lets
 * the AI agent branch on the failure cause and gives the frontend a stable
 * contract instead of free-text messages.
 */
export type ResponseActionErrorType =
  | 'insufficient_privileges'
  | 'invalid_argument'
  | 'unknown_error';

/**
 * Builds a typed error result. The optional `extra` fields are merged at the
 * top level of `data` so existing consumers (e.g. `insufficientPrivilegesResult`)
 * can keep the `privilege` field where tests already expect it.
 */
export function responseActionErrorResult(
  error: ResponseActionErrorType,
  message: string,
  extra?: Record<string, unknown>
) {
  return {
    results: [
      {
        tool_result_id: getToolResultId(),
        type: ToolResultType.error as const,
        data: {
          error,
          message,
          ...extra,
        },
      },
    ],
  };
}

/**
 * Standard tool result returned when the caller lacks the endpoint privilege
 * required to read response-action state. The agent-dispatched path reuses the
 * platform's internal (automated) response-actions client, which does not run
 * the per-user privilege checks the HTTP routes enforce — so each tool must
 * assert the caller's endpoint authz (via `getEndpointAuthz(request)`) itself
 * and return this when the privilege is absent, mirroring the route's
 * `withEndpointAuthz(...)` gate.
 */
export function insufficientPrivilegesResult(privilege: string) {
  return responseActionErrorResult(
    'insufficient_privileges',
    `Insufficient privileges: this action requires the '${privilege}' endpoint privilege. Ask an administrator to grant it, or perform the action from the Security UI.`,
    { privilege }
  );
}

/**
 * Reason codes that explain why an endpoint lookup produced a "not found" result.
 *
 * - endpoint_not_found: the host name was resolved to zero fleet agents.
 * - ambiguous_hostname: several live fleet agents share the host name; the
 *   result carries `candidates` so the caller can ask for an agent ID.
 */
export type HostLookupReason = 'endpoint_not_found' | 'ambiguous_hostname';

/**
 * Shared return shape for the endpoint-status tool when the host could not be
 * found. All host-lookup tools use a consistent `found` + `reason` pattern so
 * the AI agent can branch on the cause of a not-found outcome.
 *
 * `reason` is deliberately narrowed to `endpoint_not_found` rather than the
 * full `HostLookupReason`: the ambiguity outcome carries `candidates` instead
 * of a resolved status, so it is modelled separately (see
 * `AmbiguousHostnameResult` in `get_endpoint_status`). Typing this interface
 * with the wider union would claim that an ambiguous response carries the
 * `status`/`isolated`/`lastSeen` fields below, which it does not — a consumer
 * narrowing on `HostLookupReason` would then read those fields off a payload
 * that never had them.
 */
export interface EndpointNotFoundResult {
  /**
   * Stable marker letting the frontend identify response-action tool
   * results without colliding with the many other skills that also return
   * `ToolResultType.other`.
   */
  kind: 'response_action_result';
  /** Set when the lookup was by hostname. */
  hostName?: string;
  /** Set when the lookup was by agent ID only. */
  agentId?: string;
  found: false;
  reason: 'endpoint_not_found';
  /** Human-readable explanation for the agent's response text. */
  message: string;
}

/**
 * Builds a consistent "endpoint not found" data object for tools that return
 * `ToolResultType.other`. Carries no status, isolation, or last-seen fields:
 * no host was observed, so reporting e.g. `isolated: false` would let a chat
 * answer claim a host is not isolated when nothing was found at all.
 */
export function endpointNotFoundData(
  lookup: { hostName: string } | { agentId: string }
): EndpointNotFoundResult {
  const base = {
    kind: 'response_action_result' as const,
    found: false as const,
    reason: 'endpoint_not_found' as const,
  };
  if ('hostName' in lookup) {
    return {
      ...base,
      hostName: lookup.hostName,
      message: `No endpoint found with hostname '${lookup.hostName}'.`,
    };
  }
  return {
    ...base,
    agentId: lookup.agentId,
    message: `No endpoint found with agent ID '${lookup.agentId}'.`,
  };
}

/**
 * Bounds one value of an output payload, whatever its shape.
 *
 * Returns the bounded value plus the paths that were truncated, so the model
 * is told what it is not seeing rather than silently receiving a partial
 * payload. Nested objects (`ActionResponseOutput.content`) and arrays are
 * walked; anything deeper than `MAX_OUTPUT_DEPTH` is serialized and truncated
 * as a string.
 */
function boundOutputValue(value: unknown, path: string, depth = 0): BoundedOutputValue {
  if (typeof value === 'string') {
    if (value.length > MAX_OUTPUT_STRING_LENGTH) {
      return {
        value: `${value.slice(0, MAX_OUTPUT_STRING_LENGTH)}… [truncated, ${
          value.length - MAX_OUTPUT_STRING_LENGTH
        } more characters]`,
        truncatedPaths: [path],
      };
    }

    return { value, truncatedPaths: [] };
  }

  if (Array.isArray(value)) {
    // Depth is checked here as well, not just in the object branch: a deeply
    // nested array would otherwise recurse past MAX_OUTPUT_DEPTH and can
    // overflow the stack on endpoint-provided payloads before any size bound
    // applies. Serialize-and-truncate, same as an over-deep object.
    if (depth >= MAX_OUTPUT_DEPTH) {
      return boundOutputValue(JSON.stringify(value) ?? String(value), path, depth + 1);
    }

    const kept = value
      .slice(0, MAX_OUTPUT_ENTRIES_PER_AGENT)
      .map((item, index) => boundOutputValue(item, `${path}[${index}]`, depth + 1));
    const dropped = value.length - kept.length;

    return {
      value: [
        ...kept.map((bounded) => bounded.value),
        ...(dropped > 0 ? [`… [truncated, ${dropped} more items]`] : []),
      ],
      truncatedPaths: [
        ...kept.flatMap((bounded) => bounded.truncatedPaths),
        ...(dropped > 0 ? [path] : []),
      ],
    };
  }

  if (value && typeof value === 'object') {
    if (depth >= MAX_OUTPUT_DEPTH) {
      return boundOutputValue(JSON.stringify(value) ?? String(value), path, depth + 1);
    }

    const entries = Object.entries(value as Record<string, unknown>);
    const kept = entries
      .slice(0, MAX_OUTPUT_OBJECT_KEYS)
      .map(
        ([key, entryValue]) =>
          [key, boundOutputValue(entryValue, `${path}.${key}`, depth + 1)] as const
      );

    return {
      value: Object.fromEntries(kept.map(([key, bounded]) => [key, bounded.value])),
      truncatedPaths: [
        ...kept.flatMap(([, bounded]) => bounded.truncatedPaths),
        ...(entries.length > kept.length ? [path] : []),
      ],
    };
  }

  return { value, truncatedPaths: [] };
}

/**
 * Arrays nested under `ActionResponseOutput.content` that are capped per item
 * and reported with their own total/dropped counters.
 * `GetProcessesActionOutputContent.entries` holds one record per process,
 * `ResponseActionGetFileOutputContent.contents` one per file in the archive.
 */
const OUTPUT_LIST_FIELDS = [
  { key: 'entries', total: 'totalEntries', truncated: 'entriesTruncated' },
  { key: 'contents', total: 'totalContents', truncated: 'contentsTruncated' },
] as const;

/** Paths kept in `truncatedFields` when an agent summary had to be reduced to its minimum. */
const MAX_FITTED_TRUNCATED_FIELDS = 20;

/**
 * Shrinks one agent summary until it serializes within `budget` characters.
 *
 * Two passes, each naming what it touched in `truncatedFields` so the model is
 * told what it is not seeing:
 * 1. every field whose serialized form is longer than `MAX_OUTPUT_STRING_LENGTH`
 *    is replaced by its truncated JSON string, largest first, until it fits;
 * 2. if that is not enough, fields are dropped from the end (the earliest keys
 *    survive) until it fits.
 *
 * `agentId` and the list counters are never touched. When the path list itself
 * is what is over budget (path text follows the endpoint's own key names), it
 * is cut to a bounded sample, so the result can exceed `budget` only when
 * `agentId` alone does.
 */
function fitAgentSummaryToBudget(
  summary: ActionOutputAgentSummary,
  budget: number
): ActionOutputAgentSummary {
  const sizeOf = (value: unknown) => JSON.stringify(value).length;
  if (sizeOf(summary) <= budget) {
    return summary;
  }

  const protectedKeys = new Set<string>([
    'agentId',
    'truncatedFields',
    ...OUTPUT_LIST_FIELDS.flatMap(({ total, truncated }) => [total, truncated]),
  ]);
  const fitted: Record<string, unknown> = { ...summary };
  const touched: string[] = [];
  const withPaths = () => ({
    ...fitted,
    truncatedFields: [...new Set([...(summary.truncatedFields ?? []), ...touched])],
  });
  const fits = () => sizeOf(withPaths()) <= budget;

  const keys = Object.keys(summary).filter((key) => !protectedKeys.has(key));

  // Pass 1: shorten, largest first.
  const bySize = [...keys].sort((x, y) => sizeOf(summary[y]) - sizeOf(summary[x]));
  for (const key of bySize) {
    const serialized = JSON.stringify(fitted[key]);
    if (serialized.length > MAX_OUTPUT_STRING_LENGTH) {
      fitted[key] = `${serialized.slice(0, MAX_OUTPUT_STRING_LENGTH)}… [truncated, ${
        serialized.length - MAX_OUTPUT_STRING_LENGTH
      } more characters]`;
      touched.push(key);
      if (fits()) {
        return withPaths() as ActionOutputAgentSummary;
      }
    }
  }

  // Pass 2: drop, last key first.
  for (const key of [...keys].reverse()) {
    delete fitted[key];
    if (!touched.includes(key)) {
      touched.push(key);
    }
    if (fits()) {
      return withPaths() as ActionOutputAgentSummary;
    }
  }

  const minimal = withPaths();
  minimal.truncatedFields = minimal.truncatedFields
    .slice(0, MAX_FITTED_TRUNCATED_FIELDS)
    .map((path) => path.slice(0, MAX_OUTPUT_STRING_LENGTH));

  return minimal as ActionOutputAgentSummary;
}

/**
 * Bounds an action's raw `outputs` payload into a model-safe summary.
 *
 * The raw payload is unbounded (`execute`/`runscript` stdout/stderr, one
 * `get-processes` entry per process), so it is summarized rather than
 * forwarded: per-agent entry counts and truncation flags are always reported,
 * and only a bounded sample of entries is included. Bounding is recursive —
 * the real production shape nests the payload under `content`, so a
 * top-level-only bound leaves it unbounded.
 */
export function summarizeActionOutputs(outputs: unknown): ActionOutputsSummary | undefined {
  if (!outputs || typeof outputs !== 'object') {
    return undefined;
  }

  const byAgent = outputs as Record<string, unknown>;
  const agentIds = Object.keys(byAgent);
  const includedAgentIds = agentIds.slice(0, MAX_OUTPUT_AGENTS);

  // Cumulative budget across the whole summary: the per-agent and per-entry
  // caps still allow the dimensions to sum to far more than one summary
  // should weigh, so agents are dropped once the serialized total exceeds
  // `MAX_OUTPUT_TOTAL_CHARS`.
  let retainedSize = 0;
  let summaryTruncated = false;

  const agents: ActionOutputAgentSummary[] = [];
  for (const agentId of includedAgentIds) {
    const record = (byAgent[agentId] ?? {}) as Record<string, unknown>;
    const truncatedFields: string[] = [];
    const bounded: Record<string, unknown> = {};
    const lists: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(record)) {
      if (key === 'content' && value && typeof value === 'object' && !Array.isArray(value)) {
        // The stored shape is `{ type, content: { ...TOutputContent } }`: the
        // per-process `entries` (get-processes) and `contents` (get-file) live
        // under `content`, so they are lifted out and capped per item below
        // instead of going through `boundOutputValue`, which would append a
        // marker string into the list.
        const rest: Record<string, unknown> = {};
        for (const [contentKey, contentValue] of Object.entries(value)) {
          if (OUTPUT_LIST_FIELDS.some((field) => field.key === contentKey)) {
            lists[contentKey] = contentValue;
          } else {
            rest[contentKey] = contentValue;
          }
        }
        // Everything lifted out leaves nothing to report under `content`, so
        // the key is omitted rather than returned as an empty `{}`.
        if (Object.keys(rest).length > 0 || Object.keys(value).length === 0) {
          const boundedContent = boundOutputValue(rest, key);
          bounded[key] = boundedContent.value;
          truncatedFields.push(...boundedContent.truncatedPaths);
        }
      } else {
        const boundedValue = boundOutputValue(value, key);
        bounded[key] = boundedValue.value;
        truncatedFields.push(...boundedValue.truncatedPaths);
      }
    }

    // Each kept item is bounded individually rather than by bounding the
    // array: a marker element would change the shape callers already read,
    // and the drop count is reported separately (`entriesTruncated`,
    // `contentsTruncated`).
    const listSummary: Record<string, unknown> = {};
    for (const { key, total, truncated } of OUTPUT_LIST_FIELDS) {
      const list = lists[key];
      if (Array.isArray(list)) {
        const kept = list.slice(0, MAX_OUTPUT_ENTRIES_PER_AGENT).map((item, index) => {
          const boundedItem = boundOutputValue(item, `${key}[${index}]`);
          truncatedFields.push(...boundedItem.truncatedPaths);

          return boundedItem.value;
        });
        listSummary[key] = kept;
        listSummary[total] = list.length;
        if (list.length > kept.length) {
          listSummary[truncated] = list.length - kept.length;
        }
      } else if (key in lists) {
        // Not an array: keep the value rather than silently dropping it.
        const boundedValue = boundOutputValue(lists[key], key);
        listSummary[key] = boundedValue.value;
        truncatedFields.push(...boundedValue.truncatedPaths);
      }
    }

    let summary: ActionOutputAgentSummary = {
      agentId,
      ...bounded,
      ...listSummary,
      ...(truncatedFields.length ? { truncatedFields } : {}),
    };

    // The first agent is always kept (a too-big sample beats none), so it is
    // fitted to the budget here instead of being allowed to exceed it: the
    // per-value bounds do not cap the TOTAL size of a nested payload.
    if (agents.length === 0) {
      summary = fitAgentSummaryToBudget(summary, MAX_OUTPUT_TOTAL_CHARS);
    }

    const summarySize = JSON.stringify(summary).length;
    if (retainedSize + summarySize > MAX_OUTPUT_TOTAL_CHARS && agents.length > 0) {
      summaryTruncated = true;
      break;
    }

    retainedSize += summarySize;
    agents.push(summary);
  }

  const agentsTruncated = agentIds.length - agents.length;

  return {
    agents,
    totalAgents: agentIds.length,
    ...(retainedSize > MAX_OUTPUT_TOTAL_CHARS ? { retainedOverBudget: true as const } : {}),
    ...(summaryTruncated ? { summaryTruncated: true as const } : {}),
    ...(agentsTruncated > 0 ? { agentsTruncated } : {}),
  };
}

/**
 * Bounds `ActionDetails.hosts` — one entry per targeted agent — into a record
 * that keeps the tool's existing shape while reporting how many hosts were
 * dropped.
 */
export function summarizeActionHosts(hosts: unknown): ActionHostsSummary | undefined {
  if (!hosts || typeof hosts !== 'object') {
    return undefined;
  }

  const byAgentId = Object.entries(hosts as Record<string, unknown>);
  const kept = byAgentId.slice(0, MAX_ACTION_HOSTS);

  return {
    hosts: Object.fromEntries(
      kept.map(([agentId, host]) => [agentId, boundOutputValue(host, agentId).value])
    ),
    totalHosts: byAgentId.length,
    ...(byAgentId.length > kept.length ? { hostsTruncated: byAgentId.length - kept.length } : {}),
  };
}

/**
 * Bounds `ActionDetails.agentState` — one entry per targeted agent, which is
 * what makes per-host completion visible for a fan-out action — and reports
 * how many per-agent states were dropped.
 */
export function summarizeAgentState(agentState: unknown): AgentStateSummary | undefined {
  if (!agentState || typeof agentState !== 'object') {
    return undefined;
  }

  const byAgentId = Object.entries(agentState as Record<string, unknown>);
  const kept = byAgentId.slice(0, MAX_AGENT_STATE_ENTRIES);

  const retained = Object.fromEntries(
    kept.map(([agentId, state]) => [agentId, boundOutputValue(state, agentId).value])
  );
  let cumulativeDropped = 0;
  while (
    JSON.stringify(retained).length > MAX_AGENT_STATE_TOTAL_CHARS &&
    Object.keys(retained).length > 1
  ) {
    const ids = Object.keys(retained);
    delete retained[ids[ids.length - 1]];
    cumulativeDropped++;
  }

  const totalDropped = byAgentId.length - Object.keys(retained).length;
  const retainedOverBudget = JSON.stringify(retained).length > MAX_AGENT_STATE_TOTAL_CHARS;

  return {
    agentState: retained,
    ...(retainedOverBudget ? { agentStateRetainedOverBudget: true as const } : {}),
    agentStateTotal: byAgentId.length,
    ...(totalDropped > 0
      ? {
          agentStateTruncated: totalDropped,
          ...(cumulativeDropped > 0 ? { agentStateTruncatedByBudget: cumulativeDropped } : {}),
        }
      : {}),
  };
}

/**
 * Bounds `ActionDetails.errors` — the aggregate list of error strings from
 * every unsuccessful agent in a fan-out — and reports how many were dropped.
 * Entries are additionally string-truncated through the same value bounder the
 * other output fields use, since one agent's error text is unbounded.
 */
export function summarizeActionErrors(errors: unknown): ActionErrorsSummary | undefined {
  if (!Array.isArray(errors)) {
    return undefined;
  }

  const kept = errors.slice(0, MAX_ACTION_ERRORS);

  return {
    errors: kept.map((entry, index) => boundOutputValue(entry, `errors[${index}]`).value),
    totalErrors: errors.length,
    ...(errors.length > kept.length ? { errorsTruncated: errors.length - kept.length } : {}),
  };
}

interface BoundedOutputValue {
  value: unknown;
  truncatedPaths: string[];
}

export interface ActionHostsSummary {
  hosts: Record<string, unknown>;
  totalHosts: number;
  hostsTruncated?: number;
}

export interface AgentStateSummary {
  agentState: Record<string, unknown>;
  /**
   * The `agentState` counters carry the `agentState` prefix because the
   * summary is spread next to `hosts` and `outputs`, which report their own
   * (different) agent counts.
   */
  agentStateTotal: number;
  agentStateTruncated?: number;
  /** How many agents were dropped specifically by the cumulative budget (subset of `agentStateTruncated`). */
  agentStateTruncatedByBudget?: number;
  /**
   * Set when the single retained entry still exceeds `MAX_AGENT_STATE_TOTAL_CHARS`.
   * Kept deliberately (a too-big sample beats none) — consumers should not
   * read an absent `agentStateTruncatedByBudget` as "within budget".
   */
  agentStateRetainedOverBudget?: true;
}

export interface ActionErrorsSummary {
  errors: unknown[];
  totalErrors: number;
  errorsTruncated?: number;
}

/**
 * Bounds `ActionDetails.parameters` before it reaches the model.
 *
 * `parameters` is not touched by the outputs bounding path, but it is not
 * small: a CrowdStrike `runscript` action permits a 65,536-character `raw`
 * script plus an 8,192-character `commandLine`. Returning it verbatim means
 * every status poll of such an action injects tens of thousands of characters
 * into the conversation before the separately bounded outputs are even added.
 * Values go through the same bounder as `outputs`, and the paths that were
 * shortened are reported rather than silently trimmed.
 */
export function summarizeActionParameters(
  parameters: unknown
): ActionParametersSummary | undefined {
  if (!parameters || typeof parameters !== 'object') {
    return undefined;
  }

  const entries = Object.entries(parameters as Record<string, unknown>);
  const kept = entries.slice(0, MAX_PARAMETER_KEYS);

  const truncatedFields: string[] = [];
  const bounded: Record<string, unknown> = {};

  for (const [key, value] of kept) {
    const boundedValue = boundOutputValue(value, key);
    bounded[key] = boundedValue.value;
    truncatedFields.push(...boundedValue.truncatedPaths);
  }

  return {
    parameters: bounded,
    totalParameters: entries.length,
    ...(entries.length > kept.length ? { parametersTruncated: entries.length - kept.length } : {}),
    ...(truncatedFields.length ? { truncatedParameterFields: truncatedFields } : {}),
  };
}

export interface ActionParametersSummary {
  parameters: Record<string, unknown>;
  totalParameters: number;
  parametersTruncated?: number;
  /** Parameter paths whose value was shortened by the output bounds. */
  truncatedParameterFields?: string[];
}

export interface ActionOutputAgentSummary {
  agentId: string;
  /** Lifted from `content.entries` (get-processes), capped at `MAX_OUTPUT_ENTRIES_PER_AGENT`. */
  entries?: unknown[];
  totalEntries?: number;
  entriesTruncated?: number;
  /** Lifted from `content.contents` (get-file), capped at `MAX_OUTPUT_ENTRIES_PER_AGENT`. */
  contents?: unknown[];
  totalContents?: number;
  contentsTruncated?: number;
  /**
   * Paths whose value was shortened, named as they appear in THIS agent
   * summary (`stdout`, `content.stdout`, `entries[1].command`) — the lifted
   * `entries`/`contents` lists sit at the top level of the summary, not under
   * `content`, so the paths never mention `content.entries`.
   */
  truncatedFields?: string[];
  [key: string]: unknown;
}

export interface ActionOutputsSummary {
  agents: ActionOutputAgentSummary[];
  totalAgents: number;
  agentsTruncated?: number;
  /** Set when further agents were dropped because the cumulative `MAX_OUTPUT_TOTAL_CHARS` budget was exceeded. */
  summaryTruncated?: true;
  /**
   * Set when the retained agents still exceed `MAX_OUTPUT_TOTAL_CHARS`. The
   * first agent is always kept but is shrunk to fit (`fitAgentSummaryToBudget`),
   * so this fires only when its `agentId` alone is over budget.
   */
  retainedOverBudget?: true;
}

/**
 * Resolves the response-actions `agentType` for a Fleet agent from its
 * installed integration packages, mirroring
 * `RESPONSE_ACTIONS_SUPPORTED_INTEGRATION_TYPES` — the same map the REST API
 * consults, except the REST API gets `agent_type` as an explicit request
 * field while these chat-driven tools only resolve a hostname to a Fleet
 * agent. The installed package list is the only signal available to tell
 * Elastic Defend apart from a 3rd-party EDR (SentinelOne, CrowdStrike,
 * Microsoft Defender for Endpoint), so this keeps multi-vendor parity with
 * the REST API instead of hardcoding `'endpoint'`.
 *
 * Defaults to `endpoint` when no known integration package is found, since
 * that keeps prior single-vendor behavior for hosts without a resolvable
 * package list.
 */
export function resolveAgentTypeFromPackages(packages: string[] = []): ResponseActionAgentType {
  for (const [agentType, packageNames] of Object.entries(
    RESPONSE_ACTIONS_SUPPORTED_INTEGRATION_TYPES
  )) {
    if (packageNames.some((packageName) => packages.includes(packageName))) {
      return agentType as ResponseActionAgentType;
    }
  }

  return 'endpoint';
}

/**
 * Builds the comment recorded on a dispatched response action so its entry in
 * the Response Actions audit log links back to the originating agent
 * conversation. The conversation id (falling back to the always-present run id
 * used for tracing) is the correlation anchor; the endpoint action document has
 * no structured "source conversation" field, so the free-text comment — the
 * established place for analyst context — carries it.
 *
 * The conversation id lives on the agent entry of the run-context stack, so it
 * is resolved via `getAgentFromRunContext`. An analyst-supplied comment is
 * preserved and the anchor is appended to it.
 */
export function buildResponseActionComment(
  defaultComment: string,
  runContext: RunContext,
  analystComment?: string
): string {
  const base = analystComment ?? defaultComment;
  const correlationId = getAgentFromRunContext(runContext)?.conversationId ?? runContext.runId;
  return correlationId ? `${base} [AI agent conversation: ${correlationId}]` : base;
}

/**
 * Retry/timeout budget for {@link waitForActionCompletion}. Elastic Defend
 * dispatches a fleet action and returns immediately — the endpoint agent
 * typically takes anywhere from a few seconds up to ~90s to check in, execute
 * the action, and write its response back. Without polling, a tool returns
 * whatever status was true the instant the action document was written
 * (almost always `pending`), which is what the chat UI showed for
 * `running-processes`, `isolate`, `unisolate`, and `scan` before this fix.
 *
 * 300ms → 480ms → 768ms → ... doubling, capped at 5s, for up to ~85s total —
 * long enough to observe real completions without holding the agent turn
 * open indefinitely (the agent-builder execution runner's own idle/overall
 * timeouts, `FOLLOW_EXECUTION_IDLE_TIMEOUT_MS` / `FOLLOW_EXECUTION_TIMEOUT_MS`,
 * are both several minutes, so this budget sits comfortably inside them).
 */
const ACTION_COMPLETION_POLL_CONFIG = {
  retries: 20,
  minTimeout: 300,
  maxTimeout: 5000,
  factor: 1.6,
};

/**
 * Polls `getActionDetailsById` until the dispatched response action reaches
 * a terminal state (`successful`, `failed`, or `canceled`) or the retry
 * budget is exhausted, then returns whatever the latest fetch produced.
 *
 * This mirrors the polling pattern the Microsoft Defender for Endpoint
 * client already uses (`p-retry` in `ms_defender_endpoint_actions_client.ts`)
 * and the polling the console UI does client-side via
 * `useConsoleActionSubmitter` (`ACTION_DETAILS_REFRESH_INTERVAL`) — the agent
 * tools had neither, so they surfaced the action's write-time snapshot
 * instead of its outcome.
 *
 * Never throws: on error or exhausted retries it returns the last known
 * `ActionDetails` (still `pending`) so the tool can report an honest,
 * non-final status rather than failing the whole tool call.
 */
export async function waitForActionCompletion<T extends ActionDetails = ActionDetails>(
  endpointAppContextService: EndpointAppContextService,
  spaceId: string,
  actionId: string,
  logger: Logger
): Promise<T> {
  let lastKnown: T | undefined;

  try {
    return await pRetry(
      async () => {
        const actionDetails = await getActionDetailsById<T>(
          endpointAppContextService,
          spaceId,
          actionId,
          // bypassSpaceValidation is safe here: the action was already
          // validated to be in the caller's space before dispatch (see
          // endpoint_lookup.ts -> ensureInCurrentSpace). Polling just reads
          // back the action we already dispatched.
          { bypassSpaceValidation: true }
        );
        lastKnown = actionDetails;

        if (!actionDetails.isCompleted) {
          throw new Error(`Action [${actionId}] is still pending`);
        }

        return actionDetails;
      },
      {
        ...ACTION_COMPLETION_POLL_CONFIG,
        onFailedAttempt: ({ attemptNumber, retriesLeft }) => {
          logger.debug(
            `Waiting for action [${actionId}] to complete (attempt ${attemptNumber}, ${retriesLeft} retries left)`
          );
        },
      }
    );
  } catch (error) {
    if (lastKnown) {
      return lastKnown;
    }

    logger.error(`Failed to fetch completion status for action [${actionId}]: ${error.message}`);
    throw error;
  }
}
