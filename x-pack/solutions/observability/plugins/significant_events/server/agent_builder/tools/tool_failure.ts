/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isBoom } from '@hapi/boom';
import { getAgentFromRunContext, type RunContext } from '@kbn/agent-builder-server';
import { normalizeAgentIdForTelemetry } from '@kbn/agent-builder-server/telemetry';
import { SavedObjectsErrorHelpers, type KibanaRequest, type Logger } from '@kbn/core/server';
import {
  FEATURE_IDENTIFICATION_AGENT_ID,
  KI_QUERY_GENERATION_AGENT_ID,
  SIGNIFICANT_EVENTS_DISCOVERY_AGENT_ID,
} from '../../../common/constants';
import { SignificantEventsPausedError } from '../../lib/errors/significant_events_paused_error';
import { SourceDisabledError as RuleBackedSourceDisabledError } from '../../lib/errors/source_disabled_error';
import { SourceWriteConflictError } from '../../lib/errors/source_write_conflict_error';
import { StatusError } from '../../lib/errors/status_error';
import type { AgentToolFailureCode, EbtTelemetryClient } from '../../lib/telemetry/ebt';
import { getWorkflowExecutionIdFromRequest } from '../../lib/telemetry/ebt/workflow_execution_id';
import { SourceDisabledError, UnknownSourceSlugError } from '../utils/resolve_source_slugs';
import { BulkWriteError, trackTelemetryBestEffort } from './bulk_write';

export interface ToolFailure {
  code: AgentToolFailureCode;
  /** The tool refused the call because of its arguments, so it is kept out of the error log. */
  inputRejected: boolean;
  statusCode?: number;
  unresolvedCount?: number;
}

// Elasticsearch errors are left out on purpose: a 400 from it can be this plugin's own bad query.
const getThrownStatusCode = (error: unknown): number | undefined => {
  if (error instanceof StatusError) {
    return error.statusCode;
  }
  return isBoom(error) ? error.output.statusCode : undefined;
};

const classifyStatusCode = (statusCode: number | undefined): ToolFailure => {
  switch (statusCode) {
    case 400:
    case 422:
      return { code: 'bad_request', inputRejected: true, statusCode };
    case 404:
      return { code: 'not_found', inputRejected: true, statusCode };
    case 401:
    case 403:
      return { code: 'forbidden', inputRejected: false, statusCode };
    case 409:
      return { code: 'conflict', inputRejected: false, statusCode };
    default:
      return { code: 'internal_error', inputRejected: false, statusCode };
  }
};

/** Names why a tool call failed without quoting anything the caller sent. */
export const classifyToolFailure = (error: unknown): ToolFailure => {
  if (error instanceof UnknownSourceSlugError) {
    return {
      code: 'unknown_source',
      inputRejected: true,
      statusCode: error.statusCode,
      unresolvedCount: error.slugs.length,
    };
  }
  if (error instanceof SourceDisabledError || error instanceof RuleBackedSourceDisabledError) {
    return { code: 'source_disabled', inputRejected: true, statusCode: error.statusCode };
  }
  if (error instanceof SignificantEventsPausedError) {
    return { code: 'paused', inputRejected: false, statusCode: error.statusCode };
  }
  if (error instanceof SourceWriteConflictError) {
    // The other reasons are contention on the source knowledge, which the caller did not cause.
    return {
      code: error.reason,
      inputRejected: error.reason === 'source_disabled',
      statusCode: error.statusCode,
    };
  }
  if (error instanceof BulkWriteError) {
    if (error.code !== 'validation_error') {
      return { code: error.code, inputRejected: false };
    }
    return {
      code: error.details?.reason ?? 'validation_error',
      inputRejected: true,
      unresolvedCount: error.details?.count,
    };
  }
  const failure = classifyStatusCode(getThrownStatusCode(error));
  // Saved objects errors are Elasticsearch and storage failures surfaced as 4xx.
  return SavedObjectsErrorHelpers.isSavedObjectsClientError(error)
    ? { ...failure, inputRejected: false }
    : failure;
};

/** Replaces the message of a refused call, which quotes caller-sent slugs and ids, with its code. */
export const toTelemetryErrorMessage = (failure: ToolFailure, message: string): string =>
  failure.inputRejected ? failure.code : message;

const OWN_AGENT_IDS: ReadonlySet<string> = new Set([
  SIGNIFICANT_EVENTS_DISCOVERY_AGENT_ID,
  KI_QUERY_GENERATION_AGENT_ID,
  FEATURE_IDENTIFICATION_AGENT_ID,
]);

// Agent Builder hashes every id it does not ship, this plugin's agents included; keep those readable.
const getTelemetryAgentId = (runContext: RunContext | undefined): string | undefined => {
  const agentId = runContext ? getAgentFromRunContext(runContext)?.agentId : undefined;
  return agentId && OWN_AGENT_IDS.has(agentId) ? agentId : normalizeAgentIdForTelemetry(agentId);
};

const getToolCallId = (runContext: RunContext | undefined): string | undefined => {
  const current = runContext?.stack.at(-1);
  return current?.type === 'tool' ? current.toolCallId : undefined;
};

/** Logs a failed tool call, at debug and without caller values when it was refused, and reports it to telemetry. */
export const reportToolFailure = ({
  error,
  toolId,
  errorLogMessage,
  errorLogLevel = 'error',
  logger,
  telemetry,
  request,
  runContext,
  itemCount,
  inputRejected,
}: {
  error: unknown;
  toolId: string;
  errorLogMessage: string;
  errorLogLevel?: 'error' | 'warn';
  logger: Logger;
  telemetry: EbtTelemetryClient;
  request: KibanaRequest;
  runContext?: RunContext;
  itemCount?: number;
  inputRejected?: boolean;
}): ToolFailure => {
  const classified = classifyToolFailure(error);
  const failure = inputRejected === undefined ? classified : { ...classified, inputRejected };
  if (failure.inputRejected) {
    logger.debug(`${toolId} refused the call: ${failure.code}`);
  } else {
    logger[errorLogLevel](errorLogMessage);
    if (error instanceof Error && error.stack) {
      logger.debug(error.stack);
    }
  }

  trackTelemetryBestEffort({
    logger,
    description: `${toolId} failure telemetry`,
    track: () =>
      telemetry.trackAgentToolFailed(
        {
          workflow_execution_id: getWorkflowExecutionIdFromRequest(request),
          tool_id: toolId,
          error_code: failure.code,
          input_rejected: failure.inputRejected,
          agent_id: getTelemetryAgentId(runContext),
          tool_call_id: getToolCallId(runContext),
          status_code: failure.statusCode,
          item_count: itemCount,
          unresolved_count: failure.unresolvedCount,
        },
        request
      ),
  });

  return failure;
};
