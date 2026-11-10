/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getSuccessfulSignalUpdateResponse } from '../../__mocks__/request_responses';
import type { SecuritySolutionRequestHandlerContextMock } from '../../__mocks__/request_context';
import { requestContextMock } from '../../__mocks__';
import { getUpdateAlertTagsScript, updateAlertsTags } from './update_alerts_tags';

describe('updateAlertsTags', () => {
  let context: SecuritySolutionRequestHandlerContextMock;

  const defaultArgs = {
    index: '.alerts-security.alerts-default',
    ids: ['somefakeid1', 'somefakeid2'],
    tags: {
      tags_to_add: ['tag1', 'tag2'],
      tags_to_remove: [],
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    ({ context } = requestContextMock.createTools());
    context.core.elasticsearch.client.asCurrentUser.updateByQuery.mockResponse(
      getSuccessfulSignalUpdateResponse()
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  it('returns the updateByQuery response', async () => {
    const result = await updateAlertsTags({
      ...defaultArgs,
      context: requestContextMock.convertContext(context),
    });

    expect(result).toEqual(getSuccessfulSignalUpdateResponse());
  });

  it('queries by the provided IDs', async () => {
    await updateAlertsTags({
      ...defaultArgs,
      context: requestContextMock.convertContext(context),
    });

    expect(context.core.elasticsearch.client.asCurrentUser.updateByQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        index: '.alerts-security.alerts-default',
        query: {
          bool: {
            filter: { terms: { _id: ['somefakeid1', 'somefakeid2'] } },
          },
        },
      })
    );
  });

  it('updates on multiple indices pattern', async () => {
    const index = [
      '.alerts-security.alerts-default',
      '.alerts-security.attack.discovery.alerts-default',
    ];

    await updateAlertsTags({
      ...defaultArgs,
      context: requestContextMock.convertContext(context),
      index,
    });

    expect(context.core.elasticsearch.client.asCurrentUser.updateByQuery).toHaveBeenCalledWith(
      expect.objectContaining({ index })
    );
  });

  it('rejects when updateByQuery throws', async () => {
    context.core.elasticsearch.client.asCurrentUser.updateByQuery.mockRejectedValue(
      new Error('Test error')
    );

    await expect(
      updateAlertsTags({
        ...defaultArgs,
        context: requestContextMock.convertContext(context),
      })
    ).rejects.toThrow('Test error');
  });

  describe('audit events', () => {
    it('logs one alert_update intent event per id before updateByQuery', async () => {
      const auditLogger = context.securitySolution.getAuditLogger();

      await updateAlertsTags({
        ...defaultArgs,
        context: requestContextMock.convertContext(context),
      });

      expect(auditLogger?.log).toHaveBeenNthCalledWith(1, {
        message: 'User is updating alert [id=somefakeid1]',
        event: {
          action: 'alert_update',
          category: ['database'],
          type: ['change'],
          outcome: 'unknown',
        },
        error: undefined,
      });
      expect(auditLogger?.log).toHaveBeenNthCalledWith(2, {
        message: 'User is updating alert [id=somefakeid2]',
        event: {
          action: 'alert_update',
          category: ['database'],
          type: ['change'],
          outcome: 'unknown',
        },
        error: undefined,
      });
    });

    it('logs a bulk failure for partial Elasticsearch responses', async () => {
      const auditLogger = context.securitySolution.getAuditLogger();
      context.core.elasticsearch.client.asCurrentUser.updateByQuery.mockResponse({
        ...getSuccessfulSignalUpdateResponse(),
        failures: [
          {
            id: 'alert-1',
            index: '.alerts-security.alerts-default',
            cause: { type: 'illegal_argument_exception', reason: 'document rejected' },
            status: 400,
          },
        ],
      });

      await updateAlertsTags({
        ...defaultArgs,
        context: requestContextMock.convertContext(context),
      });

      expect(auditLogger?.log).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Failed attempt to update alerts',
          event: expect.objectContaining({ action: 'alert_update', outcome: 'failure' }),
          error: expect.objectContaining({ message: 'Alert update had 1 document failure(s)' }),
        })
      );
    });

    it('logs a failure event per id and rethrows when updateByQuery rejects', async () => {
      const auditLogger = context.securitySolution.getAuditLogger();
      context.core.elasticsearch.client.asCurrentUser.updateByQuery.mockRejectedValue(
        new Error('Test error')
      );

      await expect(
        updateAlertsTags({
          ...defaultArgs,
          context: requestContextMock.convertContext(context),
        })
      ).rejects.toThrow('Test error');

      expect(auditLogger?.log).toHaveBeenCalledWith({
        message: 'Failed attempt to update alert [id=somefakeid1]',
        event: {
          action: 'alert_update',
          category: ['database'],
          type: ['change'],
          outcome: 'failure',
        },
        error: {
          code: 'Error',
          message: 'Test error',
        },
      });
    });

    it('does not throw when getAuditLogger returns undefined', async () => {
      context.securitySolution.getAuditLogger.mockReturnValue(undefined);

      await expect(
        updateAlertsTags({
          ...defaultArgs,
          context: requestContextMock.convertContext(context),
        })
      ).resolves.toEqual(getSuccessfulSignalUpdateResponse());
    });
  });

  describe('getUpdateAlertTagsScript', () => {
    it('deduplicates and maps the tags to add/remove', () => {
      const script = getUpdateAlertTagsScript({
        tags_to_add: ['new-tag', 'new-tag'],
        tags_to_remove: ['old-tag'],
      });

      expect(script.params).toEqual({ tagsToAdd: ['new-tag'], tagsToRemove: ['old-tag'] });
    });
  });
});
