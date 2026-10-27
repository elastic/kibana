/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';
import { httpServerMock } from '@kbn/core/server/mocks';
import { toEventOrigin } from './event_origin';

const UI_HEADERS = {
  'kbn-version': '9.0.0',
  referer: 'http://localhost:5601/app/slos',
  'x-elastic-internal-origin': 'kibana',
};

const executionContextHeader = (context: object) => encodeURIComponent(JSON.stringify(context));

const createRequest = (
  headers: Record<string, string> = {},
  { isFakeRequest = false }: { isFakeRequest?: boolean } = {}
): KibanaRequest => ({
  ...httpServerMock.createKibanaRequest({ headers }),
  isFakeRequest,
});

describe('toEventOrigin', () => {
  describe('channel', () => {
    it('is `system` for a fake request', () => {
      expect(toEventOrigin('user', createRequest({}, { isFakeRequest: true }))).toEqual({
        actor: 'user',
        channel: 'system',
      });
    });

    it('is `system` for a fake request even when it carries the UI headers', () => {
      const request = createRequest(UI_HEADERS, { isFakeRequest: true });

      expect(toEventOrigin('user', request).channel).toBe('system');
    });

    it('is `ui` when kbn-version, referer, and x-elastic-internal-origin are all present', () => {
      expect(toEventOrigin('user', createRequest(UI_HEADERS)).channel).toBe('ui');
    });

    it.each(Object.keys(UI_HEADERS))('is `api` when %s is missing', (missingHeader) => {
      const headers = Object.fromEntries(
        Object.entries(UI_HEADERS).filter(([header]) => header !== missingHeader)
      );

      expect(toEventOrigin('user', createRequest(headers)).channel).toBe('api');
    });

    it('is `api` for a request with no UI headers', () => {
      expect(toEventOrigin('user', createRequest({ authorization: 'ApiKey abc' }))).toEqual({
        actor: 'user',
        channel: 'api',
      });
    });
  });

  describe('app', () => {
    it('is read from the execution context of a UI request', () => {
      const request = createRequest({
        ...UI_HEADERS,
        'x-kbn-context': executionContextHeader({ name: 'slo', type: 'application' }),
      });

      expect(toEventOrigin('user', request)).toEqual({
        actor: 'user',
        channel: 'ui',
        app: 'slo',
      });
    });

    it('is ignored for an API request carrying an execution context', () => {
      const request = createRequest({
        'x-kbn-context': executionContextHeader({ name: 'slo' }),
      });

      expect(toEventOrigin('user', request)).toEqual({ actor: 'user', channel: 'api' });
    });

    it('is omitted when the execution context header is malformed', () => {
      const request = createRequest({ ...UI_HEADERS, 'x-kbn-context': '%not-json' });

      expect(toEventOrigin('user', request)).toEqual({ actor: 'user', channel: 'ui' });
    });

    it('is omitted when the execution context name is not a valid app id', () => {
      const request = createRequest({
        ...UI_HEADERS,
        'x-kbn-context': executionContextHeader({ name: 'not a valid app!' }),
      });

      expect(toEventOrigin('user', request)).toEqual({ actor: 'user', channel: 'ui' });
    });

    it('is omitted when the execution context name is too long', () => {
      const request = createRequest({
        ...UI_HEADERS,
        'x-kbn-context': executionContextHeader({ name: 'a'.repeat(65) }),
      });

      expect(toEventOrigin('user', request)).toEqual({ actor: 'user', channel: 'ui' });
    });
  });
});
