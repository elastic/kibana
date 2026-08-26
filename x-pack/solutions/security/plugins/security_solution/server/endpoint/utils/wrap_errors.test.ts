/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AgentNotFoundError } from '@kbn/fleet-plugin/server';
import {
  AgentPolicyNotFoundError,
  PackagePolicyNotFoundError,
} from '@kbn/fleet-plugin/server/errors';
import { errors } from '@elastic/elasticsearch';
import { EndpointError } from '../../../common/endpoint/errors';
import { NotFoundError } from '../errors';
import { catchAndWrapError, wrapErrorIfNeeded } from './wrap_errors';

describe('wrapErrorIfNeeded', () => {
  it('returns the same instance when already an EndpointError', () => {
    const original = new EndpointError('already wrapped');
    expect(wrapErrorIfNeeded(original)).toBe(original);
  });

  it('wraps a plain Error in EndpointError', () => {
    const original = new Error('plain error');
    const result = wrapErrorIfNeeded(original);

    expect(result).toBeInstanceOf(EndpointError);
    expect(result.message).toBe('plain error');
    expect(result.meta).toBe(original);
  });

  it('applies messagePrefix to a plain Error', () => {
    const original = new Error('something went wrong');
    const result = wrapErrorIfNeeded(original, 'context');

    expect(result).toBeInstanceOf(EndpointError);
    expect(result.message).toBe('context: something went wrong');
  });

  describe('Fleet Not Found errors', () => {
    it('wraps AgentNotFoundError in NotFoundError', () => {
      const original = new AgentNotFoundError('agent not found');
      const result = wrapErrorIfNeeded(original);

      expect(result).toBeInstanceOf(NotFoundError);
      expect(result.message).toBe('agent not found');
      expect(result.meta).toBe(original);
    });

    it('wraps AgentPolicyNotFoundError in NotFoundError', () => {
      const original = new AgentPolicyNotFoundError('policy not found');
      const result = wrapErrorIfNeeded(original);

      expect(result).toBeInstanceOf(NotFoundError);
      expect(result.message).toBe('policy not found');
    });

    it('wraps PackagePolicyNotFoundError in NotFoundError', () => {
      const original = new PackagePolicyNotFoundError('package policy not found');
      const result = wrapErrorIfNeeded(original);

      expect(result).toBeInstanceOf(NotFoundError);
      expect(result.message).toBe('package policy not found');
    });

    it('applies messagePrefix to Fleet Not Found errors', () => {
      const original = new AgentNotFoundError('agent-123');
      const result = wrapErrorIfNeeded(original, 'fetch agent');

      expect(result).toBeInstanceOf(NotFoundError);
      expect(result.message).toBe('fetch agent: agent-123');
    });
  });

  describe('Elasticsearch errors', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const buildResponseError = (body: any, statusCode = 404) =>
      new errors.ResponseError({
        body,
        statusCode,
        headers: {},
        warnings: null,
        // @ts-expect-error
        meta: {
          body,
          statusCode,
          headers: {},
          context: {},
          request: {
            params: { method: 'GET', path: '/_search', querystring: {}, body: undefined },
            options: {},
            id: 'test-request',
          },
          attempts: 1,
          aborted: false,
        } as unknown as errors.ResponseError['meta'],
      });

    it('wraps ElasticsearchClientError in EndpointError', () => {
      const esError = buildResponseError({ error: { type: 'index_not_found_exception' } });
      const result = wrapErrorIfNeeded(esError);

      expect(result).toBeInstanceOf(EndpointError);
    });

    it('builds a descriptive message from ES response reason fields', () => {
      const esError = buildResponseError({
        error: {
          type: 'index_not_found_exception',
          reason: 'no such index [.fleet-agents]',
          index: '.fleet-agents',
        },
      });
      const result = wrapErrorIfNeeded(esError);

      expect(result.message).toContain('no such index [.fleet-agents]');
    });

    it('applies messagePrefix to ES errors', () => {
      const esError = buildResponseError({
        error: { type: 'search_phase_execution_exception', reason: 'shard failed' },
      });
      const result = wrapErrorIfNeeded(esError, 'search failed');

      expect(result.message).toMatch(/^search failed:/);
    });

    it('populates debug.es_request with request parameters', () => {
      const esError = buildResponseError({ error: { reason: 'not found' } });
      const result = wrapErrorIfNeeded(esError);

      expect(result.debug).toBeDefined();
      expect(result.debug.es_request).toMatchObject({
        method: 'GET',
        path: '/_search',
      });
    });
  });
});

describe('catchAndWrapError', () => {
  it('rejects with an EndpointError wrapping the original error', async () => {
    const original = new Error('async failure');
    await expect(Promise.reject(original).catch(catchAndWrapError)).rejects.toBeInstanceOf(
      EndpointError
    );
  });

  it('rejects with the same EndpointError when already one', async () => {
    const original = new EndpointError('already wrapped');
    await expect(Promise.reject(original).catch(catchAndWrapError)).rejects.toBe(original);
  });

  describe('withMessage', () => {
    it('rejects with an EndpointError whose message includes the custom prefix', async () => {
      const original = new Error('downstream failure');
      await expect(
        Promise.reject(original).catch(catchAndWrapError.withMessage('custom prefix'))
      ).rejects.toMatchObject({
        message: 'custom prefix: downstream failure',
      });
    });

    it('wraps Fleet Not Found errors in NotFoundError with prefix', async () => {
      const original = new AgentNotFoundError('not found');
      await expect(
        Promise.reject(original).catch(catchAndWrapError.withMessage('get agent'))
      ).rejects.toBeInstanceOf(NotFoundError);
    });
  });
});
