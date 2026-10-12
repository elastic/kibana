/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServerMock, loggingSystemMock } from '@kbn/core/server/mocks';
import { EXECUTIVE_BRIEF_INFERENCE_FEATURE_ID } from '../../../../../common/entity_analytics/executive_brief/constants';
import { resolveConnector } from './resolve_connector';
import type { ResolveConnectorParams } from './resolve_connector';

const connector = (connectorId: string) => ({ connectorId, name: connectorId });

describe('resolveConnector', () => {
  const request = httpServerMock.createKibanaRequest();
  const logger = loggingSystemMock.createLogger();
  let inference: { getConnectorById: jest.Mock; getDefaultConnector: jest.Mock };
  let getForFeature: jest.Mock;

  const resolve = (overrides: Partial<ResolveConnectorParams> = {}) =>
    resolveConnector({
      request,
      logger,
      inference: inference as unknown as ResolveConnectorParams['inference'],
      searchInferenceEndpoints: {
        endpoints: { getForFeature },
      } as unknown as ResolveConnectorParams['searchInferenceEndpoints'],
      ...overrides,
    });

  beforeEach(() => {
    inference = {
      getConnectorById: jest.fn(async (id: string) => connector(id)),
      getDefaultConnector: jest.fn().mockResolvedValue(connector('default')),
    };
    getForFeature = jest.fn().mockResolvedValue({ endpoints: [connector('feature')] });
  });

  it('uses the requested connector when it exists', async () => {
    expect(await resolve({ connectorId: 'mine' })).toEqual({ connectorId: 'mine' });
    expect(getForFeature).not.toHaveBeenCalled();
  });

  it('rejects a requested connector that does not exist', async () => {
    inference.getConnectorById.mockRejectedValue(new Error('not found'));
    expect(await resolve({ connectorId: 'missing' })).toEqual(
      expect.objectContaining({ connectorId: undefined, reason: 'not_found' })
    );
  });

  it('uses the executive brief feature endpoint', async () => {
    expect(await resolve()).toEqual({ connectorId: 'feature' });
    expect(getForFeature).toHaveBeenCalledWith(EXECUTIVE_BRIEF_INFERENCE_FEATURE_ID, request);
  });

  it('falls back to the default connector', async () => {
    getForFeature.mockResolvedValue({ endpoints: [] });
    expect(await resolve()).toEqual({ connectorId: 'default' });

    getForFeature.mockRejectedValue(new Error('boom'));
    expect(await resolve()).toEqual({ connectorId: 'default' });

    expect(await resolve({ searchInferenceEndpoints: undefined })).toEqual({
      connectorId: 'default',
    });
  });

  it('reports when no connector is configured', async () => {
    getForFeature.mockResolvedValue({ endpoints: [] });
    inference.getDefaultConnector.mockResolvedValue(undefined);
    expect(await resolve()).toEqual(
      expect.objectContaining({ connectorId: undefined, reason: 'none_configured' })
    );
  });
});
