/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { estypes } from '@elastic/elasticsearch';
import { getSetAlertTagsRequestMock } from '../../../../../common/api/detection_engine/alert_tags/mocks';
import { DETECTION_ENGINE_ALERT_TAGS_URL } from '../../../../../common/constants';
import { requestContextMock, serverMock, requestMock } from '../__mocks__';
import type { SecuritySolutionRequestHandlerContextMock } from '../__mocks__/request_context';
import { getSuccessfulSignalUpdateResponse } from '../__mocks__/request_responses';
import { setAlertTagsRoute } from './set_alert_tags_route';
import type { SecuritySolutionEventBus } from '../../../../events/event_bus';
import { MAX_TAG_LENGTH, MAX_TAGS_PER_OPERATION } from '../../../../../common/workflows/triggers';

describe('setAlertTagsRoute', () => {
  let server: ReturnType<typeof serverMock.create>;
  let request: ReturnType<typeof requestMock.create>;
  let context: SecuritySolutionRequestHandlerContextMock;

  beforeEach(() => {
    jest.clearAllMocks();
    server = serverMock.create();
    ({ context } = requestContextMock.createTools());
    setAlertTagsRoute(server.router);
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  describe('happy path', () => {
    test('returns 200 when adding/removing empty arrays of tags', async () => {
      request = requestMock.create({
        method: 'post',
        path: DETECTION_ENGINE_ALERT_TAGS_URL,
        body: getSetAlertTagsRequestMock(['tag-1'], ['tag-2'], ['test-id']),
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
    test('returns 400 if duplicate tags are in both the add and remove arrays', async () => {
      request = requestMock.create({
        method: 'post',
        path: DETECTION_ENGINE_ALERT_TAGS_URL,
        body: getSetAlertTagsRequestMock(['tag-1'], ['tag-1'], ['test-id']),
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
          `Duplicate tags [\"tag-1\"] were found in the tags_to_add and tags_to_remove parameters.`,
        ],
        status_code: 400,
      });
    });

    test('returns 400 if no alert ids are provided', async () => {
      request = requestMock.create({
        method: 'post',
        path: DETECTION_ENGINE_ALERT_TAGS_URL,
        body: getSetAlertTagsRequestMock(['tag-1'], ['tag-2']),
      });

      const result = server.validate(request);

      expect(result.badRequest).toHaveBeenCalled();
    });
  });

  describe('500s', () => {
    test('returns 500 if asCurrentUser throws error', async () => {
      request = requestMock.create({
        method: 'post',
        path: DETECTION_ENGINE_ALERT_TAGS_URL,
        body: getSetAlertTagsRequestMock(['tag-1'], ['tag-2'], ['test-id']),
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
    let mockEventBus: { emitAlertTagsChanged: jest.Mock };

    beforeEach(() => {
      server = serverMock.create();
      mockEventBus = { emitAlertTagsChanged: jest.fn() };
      setAlertTagsRoute(server.router, mockEventBus as unknown as SecuritySolutionEventBus);
      // alert-1 already has 'tag-remove' but not 'tag-add', so the delta matches
      // the assertions in the main emission test below.
      context.core.elasticsearch.client.asCurrentUser.search.mockResolvedValue({
        hits: {
          hits: [
            {
              _id: 'alert-1',
              _index: '.alerts-security.alerts-default-default',
              _source: { 'kibana.alert.workflow_tags': ['tag-remove'] },
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

    test('emits alertTagsChanged after a successful update', async () => {
      request = requestMock.create({
        method: 'post',
        path: DETECTION_ENGINE_ALERT_TAGS_URL,
        body: getSetAlertTagsRequestMock(['tag-add'], ['tag-remove'], ['alert-1']),
      });
      await server.inject(request, requestContextMock.convertContext(context));
      await new Promise((r) => setTimeout(r, 0));
      expect(mockEventBus.emitAlertTagsChanged).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          alertIds: ['alert-1'],
          tagsAdded: ['tag-add'],
          tagsRemoved: ['tag-remove'],
          truncated: false,
        })
      );
    });

    test('does not emit when tag validation fails', async () => {
      request = requestMock.create({
        method: 'post',
        path: DETECTION_ENGINE_ALERT_TAGS_URL,
        body: getSetAlertTagsRequestMock(['dup'], ['dup'], ['alert-1']),
      });
      await server.inject(request, requestContextMock.convertContext(context));
      await new Promise((r) => setTimeout(r, 0));
      expect(mockEventBus.emitAlertTagsChanged).not.toHaveBeenCalled();
    });

    test('computes actual delta — only emits tags that would change at least one document', async () => {
      // Encoding WHY: the event must not report 'existing-tag' as added because alert-1
      // already has it; only 'new-tag' is genuinely absent and should appear in tagsAdded.
      context.core.elasticsearch.client.asCurrentUser.search.mockResolvedValueOnce({
        hits: {
          hits: [
            {
              _id: 'alert-1',
              _index: '.alerts-security.alerts-default-default',
              _source: { 'kibana.alert.workflow_tags': ['existing-tag'] },
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
        path: DETECTION_ENGINE_ALERT_TAGS_URL,
        body: getSetAlertTagsRequestMock(['existing-tag', 'new-tag'], [], ['alert-1']),
      });
      await server.inject(request, requestContextMock.convertContext(context));
      await new Promise((r) => setTimeout(r, 0));
      expect(mockEventBus.emitAlertTagsChanged).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ tagsAdded: ['new-tag'], tagsRemoved: [] })
      );
    });

    test('emits when the only changed tag is beyond the operation cap', async () => {
      // Encoding WHY: the change predicate must use the full request arrays, not the capped
      // ones. If the first MAX_TAGS_PER_OPERATION tags are already on the alert (all no-ops)
      // but a tag beyond the cap is genuinely absent, the trigger must still fire. Without
      // this, the trigger is suppressed even though the mutation ran and changed the document.
      const existingTags = Array.from({ length: MAX_TAGS_PER_OPERATION }, (_, i) => `tag-${i}`);
      const overCapTag = `tag-${MAX_TAGS_PER_OPERATION}`;
      context.core.elasticsearch.client.asCurrentUser.search.mockResolvedValueOnce({
        hits: {
          hits: [
            {
              _id: 'alert-1',
              _index: '.alerts-security.alerts-default-default',
              _source: { 'kibana.alert.workflow_tags': existingTags },
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
        path: DETECTION_ENGINE_ALERT_TAGS_URL,
        body: getSetAlertTagsRequestMock([...existingTags, overCapTag], [], ['alert-1']),
      });
      await server.inject(request, requestContextMock.convertContext(context));
      await new Promise((r) => setTimeout(r, 0));
      expect(mockEventBus.emitAlertTagsChanged).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          alertIds: ['alert-1'],
          // All capped tags are already present → capped delta is empty; the over-cap tag
          // that triggered the event cannot appear in the payload due to the cap.
          tagsAdded: [],
          truncated: true,
        })
      );
    });

    test('emits when the only changed tag is over-length — fires trigger with empty payload and truncated=true', async () => {
      // Encoding WHY: raw request arrays drive change detection so an over-length tag that
      // would genuinely change a document still triggers the event; the length filter applies
      // only to the schema-bounded payload, leaving tagsAdded empty and truncated=true.
      const overLengthTag = 'x'.repeat(MAX_TAG_LENGTH + 1);
      // Default beforeEach mock: alert-1 has ['tag-remove'] and not overLengthTag → would change.
      request = requestMock.create({
        method: 'post',
        path: DETECTION_ENGINE_ALERT_TAGS_URL,
        body: getSetAlertTagsRequestMock([overLengthTag], [], ['alert-1']),
      });
      await server.inject(request, requestContextMock.convertContext(context));
      await new Promise((r) => setTimeout(r, 0));
      expect(mockEventBus.emitAlertTagsChanged).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          alertIds: ['alert-1'],
          tagsAdded: [],
          tagsRemoved: [],
          truncated: true,
        })
      );
    });

    test('does not emit when the prefetch fails', async () => {
      // Encoding WHY: if fetchAllAlertIdIndexWithSource throws, the actual delta is unknown.
      // Emitting the capped request arrays as tagsAdded/tagsRemoved would publish intent
      // as observed fact, violating the fact-style payload contract. Suppress the event instead.
      context.core.elasticsearch.client.asCurrentUser.search.mockRejectedValueOnce(
        new Error('ES unavailable')
      );
      request = requestMock.create({
        method: 'post',
        path: DETECTION_ENGINE_ALERT_TAGS_URL,
        body: getSetAlertTagsRequestMock(['new-tag'], [], ['alert-1']),
      });
      await server.inject(request, requestContextMock.convertContext(context));
      await new Promise((r) => setTimeout(r, 0));
      expect(mockEventBus.emitAlertTagsChanged).not.toHaveBeenCalled();
    });
  });
});
