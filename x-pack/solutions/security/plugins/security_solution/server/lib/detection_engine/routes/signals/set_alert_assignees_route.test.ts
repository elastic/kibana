/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { estypes } from '@elastic/elasticsearch';
import { getSetAlertAssigneesRequestMock } from '../../../../../common/api/detection_engine/alert_assignees/mocks';
import { DETECTION_ENGINE_ALERT_ASSIGNEES_URL } from '../../../../../common/constants';
import { requestContextMock, serverMock, requestMock } from '../__mocks__';
import type { SecuritySolutionRequestHandlerContextMock } from '../__mocks__/request_context';
import { getSuccessfulSignalUpdateResponse } from '../__mocks__/request_responses';
import { setAlertAssigneesRoute } from './set_alert_assignees_route';
import type { SecuritySolutionEventBus } from '../../../../events/event_bus';
import {
  MAX_ASSIGNEE_UID_LENGTH,
  MAX_ASSIGNEES_PER_OPERATION,
} from '../../../../../common/workflows/triggers';

describe('setAlertAssigneesRoute', () => {
  let server: ReturnType<typeof serverMock.create>;
  let request: ReturnType<typeof requestMock.create>;
  let context: SecuritySolutionRequestHandlerContextMock;

  beforeEach(() => {
    jest.clearAllMocks();
    server = serverMock.create();
    ({ context } = requestContextMock.createTools());
    setAlertAssigneesRoute(server.router);
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  describe('happy path', () => {
    test('returns 200 when adding/removing empty arrays of assignees', async () => {
      request = requestMock.create({
        method: 'post',
        path: DETECTION_ENGINE_ALERT_ASSIGNEES_URL,
        body: getSetAlertAssigneesRequestMock(['assignee-id-1'], ['assignee-id-2'], ['alert-id']),
      });

      context.core.elasticsearch.client.asCurrentUser.bulk.mockResponse({
        errors: false,
        took: 0,
        items: [{ update: { result: 'updated', status: 200, _index: 'test-index' } }],
      });

      const response = await server.inject(request, requestContextMock.convertContext(context));

      expect(response.status).toEqual(200);
    });
  });

  describe('validation', () => {
    test('returns 400 if duplicate assignees are in both the add and remove arrays', async () => {
      request = requestMock.create({
        method: 'post',
        path: DETECTION_ENGINE_ALERT_ASSIGNEES_URL,
        body: getSetAlertAssigneesRequestMock(['assignee-id-1'], ['assignee-id-1'], ['test-id']),
      });

      context.core.elasticsearch.client.asCurrentUser.updateByQuery.mockResponse(
        getSuccessfulSignalUpdateResponse()
      );

      const response = await server.inject(request, requestContextMock.convertContext(context));

      context.core.elasticsearch.client.asCurrentUser.updateByQuery.mockRejectedValue(
        new Error('Test error')
      );

      expect(response.body).toEqual({
        message: [
          `Duplicate assignees [\"assignee-id-1\"] were found in the add and remove parameters.`,
        ],
        status_code: 400,
      });
    });

    test('rejects if no alert ids are provided', async () => {
      request = requestMock.create({
        method: 'post',
        path: DETECTION_ENGINE_ALERT_ASSIGNEES_URL,
        body: getSetAlertAssigneesRequestMock(['assignee-id-1'], ['assignee-id-2']),
      });

      const result = server.validate(request);

      expect(result.badRequest).toHaveBeenCalledWith(
        'ids: Too small: expected array to have >=1 items'
      );
    });

    test('rejects if empty string provided as an alert id', async () => {
      request = requestMock.create({
        method: 'post',
        path: DETECTION_ENGINE_ALERT_ASSIGNEES_URL,
        body: getSetAlertAssigneesRequestMock(['assignee-id-1'], ['assignee-id-2'], ['']),
      });

      const result = server.validate(request);

      expect(result.badRequest).toHaveBeenCalledWith(
        'ids.0: Too small: expected string to have >=1 characters, ids.0: No empty strings allowed'
      );
    });
  });

  describe('500s', () => {
    test('returns 500 if asCurrentUser throws error', async () => {
      request = requestMock.create({
        method: 'post',
        path: DETECTION_ENGINE_ALERT_ASSIGNEES_URL,
        body: getSetAlertAssigneesRequestMock(['assignee-id-1'], ['assignee-id-2'], ['test-id']),
      });

      context.core.elasticsearch.client.asCurrentUser.updateByQuery.mockRejectedValue(
        new Error('Test error')
      );

      const response = await server.inject(request, requestContextMock.convertContext(context));

      expect(response.body).toEqual({
        message: 'Test error',
        status_code: 500,
      });
    });
  });

  describe('workflow trigger emission', () => {
    let mockEventBus: { emitAlertAssigneesChanged: jest.Mock };

    beforeEach(() => {
      server = serverMock.create();
      mockEventBus = { emitAlertAssigneesChanged: jest.fn() };
      setAlertAssigneesRoute(server.router, mockEventBus as unknown as SecuritySolutionEventBus);
      // alert-1 has no current assignees, so adding 'user-1' would change it.
      context.core.elasticsearch.client.asCurrentUser.search.mockResolvedValue({
        hits: {
          hits: [
            {
              _id: 'alert-1',
              _index: '.alerts-security.alerts-default-default',
              _source: { 'kibana.alert.workflow_assignee_ids': [] },
            },
          ],
          total: { value: 1, relation: 'eq' },
          max_score: null,
        },
        took: 1,
        timed_out: false,
        _shards: { total: 1, successful: 1, skipped: 0, failed: 0 },
      } as estypes.SearchResponse);
    });

    test('emits alertAssigneesChanged after a successful update', async () => {
      request = requestMock.create({
        method: 'post',
        path: DETECTION_ENGINE_ALERT_ASSIGNEES_URL,
        body: getSetAlertAssigneesRequestMock(['user-1'], [], ['alert-1']),
      });
      await server.inject(request, requestContextMock.convertContext(context));
      await new Promise((r) => setTimeout(r, 0));
      expect(mockEventBus.emitAlertAssigneesChanged).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          alertIds: ['alert-1'],
          assigneesAdded: ['user-1'],
          assigneesRemoved: [],
          truncated: false,
        })
      );
    });

    test('does not emit when validation fails', async () => {
      request = requestMock.create({
        method: 'post',
        path: DETECTION_ENGINE_ALERT_ASSIGNEES_URL,
        body: getSetAlertAssigneesRequestMock(['user-1'], ['user-1'], ['alert-1']),
      });
      await server.inject(request, requestContextMock.convertContext(context));
      await new Promise((r) => setTimeout(r, 0));
      expect(mockEventBus.emitAlertAssigneesChanged).not.toHaveBeenCalled();
    });

    test('computes actual delta — only emits assignees that would change at least one document', async () => {
      // Encoding WHY: the event must not report 'existing-uid' as added because alert-1
      // already has it; only 'new-uid' is genuinely absent and should appear in assigneesAdded.
      context.core.elasticsearch.client.asCurrentUser.search.mockResolvedValueOnce({
        hits: {
          hits: [
            {
              _id: 'alert-1',
              _index: '.alerts-security.alerts-default-default',
              _source: { 'kibana.alert.workflow_assignee_ids': ['existing-uid'] },
            },
          ],
          total: { value: 1, relation: 'eq' },
          max_score: null,
        },
        took: 1,
        timed_out: false,
        _shards: { total: 1, successful: 1, skipped: 0, failed: 0 },
      } as estypes.SearchResponse);
      request = requestMock.create({
        method: 'post',
        path: DETECTION_ENGINE_ALERT_ASSIGNEES_URL,
        body: getSetAlertAssigneesRequestMock(['existing-uid', 'new-uid'], [], ['alert-1']),
      });
      await server.inject(request, requestContextMock.convertContext(context));
      await new Promise((r) => setTimeout(r, 0));
      expect(mockEventBus.emitAlertAssigneesChanged).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ assigneesAdded: ['new-uid'], assigneesRemoved: [] })
      );
    });

    test('emits when the only changed assignee is beyond the operation cap', async () => {
      // Encoding WHY: the change predicate must use the full request arrays, not the capped
      // ones. If the first MAX_ASSIGNEES_PER_OPERATION assignees are already on the alert
      // (all no-ops) but an assignee beyond the cap is genuinely absent, the trigger must
      // still fire. Without this, the trigger is suppressed even though the mutation ran.
      const existingUids = Array.from(
        { length: MAX_ASSIGNEES_PER_OPERATION },
        (_, i) => `uid-${i}`
      );
      const overCapUid = `uid-${MAX_ASSIGNEES_PER_OPERATION}`;
      context.core.elasticsearch.client.asCurrentUser.search.mockResolvedValueOnce({
        hits: {
          hits: [
            {
              _id: 'alert-1',
              _index: '.alerts-security.alerts-default-default',
              _source: { 'kibana.alert.workflow_assignee_ids': existingUids },
            },
          ],
          total: { value: 1, relation: 'eq' },
          max_score: null,
        },
        took: 1,
        timed_out: false,
        _shards: { total: 1, successful: 1, skipped: 0, failed: 0 },
      } as estypes.SearchResponse);
      request = requestMock.create({
        method: 'post',
        path: DETECTION_ENGINE_ALERT_ASSIGNEES_URL,
        body: getSetAlertAssigneesRequestMock([...existingUids, overCapUid], [], ['alert-1']),
      });
      await server.inject(request, requestContextMock.convertContext(context));
      await new Promise((r) => setTimeout(r, 0));
      expect(mockEventBus.emitAlertAssigneesChanged).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          alertIds: ['alert-1'],
          assigneesAdded: [],
          truncated: true,
        })
      );
    });

    test('emits when the only changed assignee is over-length — fires trigger with empty payload and truncated=true', async () => {
      // Encoding WHY: raw request arrays drive change detection so an over-length UID that
      // would genuinely change a document still triggers the event; the length filter applies
      // only to the schema-bounded payload, leaving assigneesAdded empty and truncated=true.
      const overLengthUid = 'x'.repeat(MAX_ASSIGNEE_UID_LENGTH + 1);
      // Default beforeEach mock: alert-1 has [] — does not have overLengthUid → would change.
      request = requestMock.create({
        method: 'post',
        path: DETECTION_ENGINE_ALERT_ASSIGNEES_URL,
        body: getSetAlertAssigneesRequestMock([overLengthUid], [], ['alert-1']),
      });
      await server.inject(request, requestContextMock.convertContext(context));
      await new Promise((r) => setTimeout(r, 0));
      expect(mockEventBus.emitAlertAssigneesChanged).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          alertIds: ['alert-1'],
          assigneesAdded: [],
          assigneesRemoved: [],
          truncated: true,
        })
      );
    });

    test('does not emit when the prefetch fails', async () => {
      // Encoding WHY: if fetchAllAlertIdIndexWithSource throws, the actual delta is unknown.
      // Emitting the capped request arrays as assigneesAdded/assigneesRemoved would publish
      // intent as observed fact, violating the fact-style payload contract. Suppress instead.
      context.core.elasticsearch.client.asCurrentUser.search.mockRejectedValueOnce(
        new Error('ES unavailable')
      );
      request = requestMock.create({
        method: 'post',
        path: DETECTION_ENGINE_ALERT_ASSIGNEES_URL,
        body: getSetAlertAssigneesRequestMock(['new-assignee'], [], ['alert-1']),
      });
      await server.inject(request, requestContextMock.convertContext(context));
      await new Promise((r) => setTimeout(r, 0));
      expect(mockEventBus.emitAlertAssigneesChanged).not.toHaveBeenCalled();
    });
  });
});
