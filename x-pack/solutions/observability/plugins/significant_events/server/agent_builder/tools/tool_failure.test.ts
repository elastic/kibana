/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { badRequest, conflict, forbidden, notFound } from '@hapi/boom';
import { errors } from '@elastic/elasticsearch';
import type { RunContext } from '@kbn/agent-builder-server';
import { toCustomHashedId } from '@kbn/agent-builder-server/telemetry';
import { SavedObjectsErrorHelpers } from '@kbn/core/server';
import { httpServerMock } from '@kbn/core-http-server-mocks';
import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import { setWorkflowEventChainContext } from '@kbn/workflows-extensions/server';
import { SignificantEventsPausedError } from '../../lib/errors/significant_events_paused_error';
import { SourceDisabledError as RuleBackedSourceDisabledError } from '../../lib/errors/source_disabled_error';
import { SourceWriteConflictError } from '../../lib/errors/source_write_conflict_error';
import { StatusError } from '../../lib/errors/status_error';
import type { EbtTelemetryClient } from '../../lib/telemetry/ebt';
import { SourceDisabledError, UnknownSourceSlugError } from '../utils/resolve_source_slugs';
import { createBulkWriteOutcomeUnknownError, createBulkWriteValidationError } from './bulk_write';
import {
  classifyToolFailure,
  reportToolFailure,
  toTelemetryErrorMessage,
  type ToolFailure,
} from './tool_failure';

const TOOL_ID = 'platform.sig_events.events_write';

const createTelemetry = () => ({ trackAgentToolFailed: jest.fn() });

const report = ({
  error,
  telemetry = createTelemetry(),
  runContext,
  errorLogLevel,
}: {
  error: unknown;
  telemetry?: { trackAgentToolFailed: jest.Mock };
  runContext?: RunContext;
  errorLogLevel?: 'error' | 'warn';
}) => {
  const logger = loggingSystemMock.createLogger();
  const failure = reportToolFailure({
    error,
    toolId: TOOL_ID,
    errorLogMessage: 'Error running events_write: raw message',
    errorLogLevel,
    logger,
    telemetry: telemetry as unknown as EbtTelemetryClient,
    request: httpServerMock.createKibanaRequest({ spaceId: 'space-a' }),
    runContext,
  });
  return { failure, logger, telemetry };
};

describe('classifyToolFailure', () => {
  it.each<{ label: string; error: unknown; expected: ToolFailure }>([
    {
      label: 'an unknown source slug, with how many were unknown',
      error: new UnknownSourceSlugError(['uiam', 'agentless']),
      expected: {
        code: 'unknown_source',
        inputRejected: true,
        statusCode: 404,
        unresolvedCount: 2,
      },
    },
    {
      label: 'a disabled source named by the caller',
      error: new SourceDisabledError('checkout'),
      expected: { code: 'source_disabled', inputRejected: true, statusCode: 400 },
    },
    {
      label: 'a disabled source refused by the rule-backed query write',
      error: new RuleBackedSourceDisabledError('source-1'),
      expected: { code: 'source_disabled', inputRejected: true, statusCode: 409 },
    },
    {
      label: 'a disabled source refused by the knowledge write',
      error: new SourceWriteConflictError('source_disabled', 'The source is disabled'),
      expected: { code: 'source_disabled', inputRejected: true, statusCode: 409 },
    },
    {
      label: 'a knowledge write that lost the lease',
      error: new SourceWriteConflictError('lease_held', 'Source knowledge is being updated'),
      expected: { code: 'lease_held', inputRejected: false, statusCode: 409 },
    },
    {
      label: 'a paused space',
      error: new SignificantEventsPausedError(),
      expected: { code: 'paused', inputRejected: false, statusCode: 409 },
    },
    {
      label: 'a bulk validation error by its reason',
      error: createBulkWriteValidationError('feature_id "a", "b" is not a Knowledge Indicator id', {
        reason: 'unresolved_feature_reference',
        count: 2,
      }),
      expected: { code: 'unresolved_feature_reference', inputRejected: true, unresolvedCount: 2 },
    },
    {
      label: 'a bulk validation error with no reason',
      error: createBulkWriteValidationError('Duplicate bulk write key'),
      expected: { code: 'validation_error', inputRejected: true },
    },
    {
      label: 'a write whose outcome is unknown',
      error: createBulkWriteOutcomeUnknownError('bulk response did not align'),
      expected: { code: 'outcome_unknown', inputRejected: false },
    },
    {
      label: 'a 400',
      error: badRequest('Nothing to update'),
      expected: { code: 'bad_request', inputRejected: true, statusCode: 400 },
    },
    {
      label: 'a 404',
      error: notFound('No such source'),
      expected: { code: 'not_found', inputRejected: true, statusCode: 404 },
    },
    {
      label: 'a missing privilege',
      error: forbidden('Managing significant events requires the nightshift manage privilege'),
      expected: { code: 'forbidden', inputRejected: false, statusCode: 403 },
    },
    {
      label: 'a conflict',
      error: conflict('Another source operation is in progress'),
      expected: { code: 'conflict', inputRejected: false, statusCode: 409 },
    },
    {
      label: 'an unmapped status as an internal error',
      error: new StatusError('Too many requests', 429),
      expected: { code: 'internal_error', inputRejected: false, statusCode: 429 },
    },
    {
      label: 'an Elasticsearch 400 as an internal error, not a refused call',
      error: new errors.ResponseError({
        statusCode: 400,
        body: { error: { type: 'verification_exception' } },
        warnings: [],
        headers: {},
        meta: {} as never,
      }),
      expected: { code: 'internal_error', inputRejected: false },
    },
    {
      label: 'a saved objects 404 as not a refused call',
      error: SavedObjectsErrorHelpers.createGenericNotFoundError('nightshift-source', 'abc'),
      expected: { code: 'not_found', inputRejected: false, statusCode: 404 },
    },
  ])('classifies $label', ({ error, expected }) => {
    expect(classifyToolFailure(error)).toEqual(expected);
  });
});

describe('toTelemetryErrorMessage', () => {
  it('reports the code of a refused call', () => {
    const error = new UnknownSourceSlugError(['uiam']);

    expect(toTelemetryErrorMessage(classifyToolFailure(error), error.message)).toBe(
      'unknown_source'
    );
  });

  it('keeps the message of any other failure', () => {
    const error = new Error('index_not_found_exception');

    expect(toTelemetryErrorMessage(classifyToolFailure(error), error.message)).toBe(
      'index_not_found_exception'
    );
  });
});

describe('reportToolFailure', () => {
  it('logs a refused call at debug only, without the values it named', () => {
    const { logger } = report({ error: new UnknownSourceSlugError(['motel-ingest-collector']) });

    expect(logger.error).not.toHaveBeenCalled();
    expect(logger.warn).not.toHaveBeenCalled();
    expect(logger.debug).toHaveBeenCalledTimes(1);
    expect(logger.debug).toHaveBeenCalledWith(`${TOOL_ID} refused the call: unknown_source`);
  });

  it('logs any other failure at error, with its stack at debug', () => {
    const { logger } = report({ error: new Error('index_not_found_exception') });

    expect(logger.error).toHaveBeenCalledWith('Error running events_write: raw message');
    expect(logger.debug).toHaveBeenCalledWith(expect.stringContaining('index_not_found_exception'));
  });

  it('logs at warn when the tool asks for it', () => {
    const { logger } = report({ error: new Error('boom'), errorLogLevel: 'warn' });

    expect(logger.warn).toHaveBeenCalledWith('Error running events_write: raw message');
    expect(logger.error).not.toHaveBeenCalled();
  });

  it('reports one event with the code, the caller and the batch size, and no caller value', () => {
    const telemetry = createTelemetry();
    const request = httpServerMock.createKibanaRequest({ spaceId: 'space-a' });
    setWorkflowEventChainContext(request, { depth: 0, sourceExecutionId: 'discovery-run' });

    reportToolFailure({
      error: createBulkWriteValidationError(
        'feature_id "topolvm" is not a Knowledge Indicator id',
        {
          reason: 'unresolved_feature_reference',
          count: 1,
        }
      ),
      toolId: TOOL_ID,
      errorLogMessage: 'unused',
      logger: loggingSystemMock.createLogger(),
      telemetry: telemetry as unknown as EbtTelemetryClient,
      request,
      runContext: {
        runId: 'run-1',
        stack: [
          { type: 'agent', agentId: 'significant-events.discovery' },
          { type: 'tool', toolId: TOOL_ID, toolCallId: 'call-1' },
        ],
      },
      itemCount: 5,
    });

    expect(telemetry.trackAgentToolFailed).toHaveBeenCalledTimes(1);
    expect(telemetry.trackAgentToolFailed).toHaveBeenCalledWith(
      {
        workflow_execution_id: 'discovery-run',
        tool_id: TOOL_ID,
        error_code: 'unresolved_feature_reference',
        input_rejected: true,
        agent_id: 'significant-events.discovery',
        tool_call_id: 'call-1',
        status_code: undefined,
        item_count: 5,
        unresolved_count: 1,
      },
      expect.anything()
    );
  });

  it('hashes the id of an agent this plugin does not own', () => {
    const { telemetry } = report({
      error: new UnknownSourceSlugError(['uiam']),
      runContext: { runId: 'run-1', stack: [{ type: 'agent', agentId: 'acme-prod-oncall' }] },
    });

    expect(telemetry.trackAgentToolFailed).toHaveBeenCalledWith(
      expect.objectContaining({ agent_id: toCustomHashedId('acme-prod-oncall') }),
      expect.anything()
    );
  });

  it('still returns the classification when telemetry throws', () => {
    const telemetry = createTelemetry();
    telemetry.trackAgentToolFailed.mockImplementation(() => {
      throw new Error('analytics down');
    });

    const { failure, logger } = report({ error: new UnknownSourceSlugError(['uiam']), telemetry });

    expect(failure.code).toBe('unknown_source');
    expect(logger.warn).toHaveBeenCalledWith(
      `Failed to track ${TOOL_ID} failure telemetry: analytics down`
    );
  });
});
