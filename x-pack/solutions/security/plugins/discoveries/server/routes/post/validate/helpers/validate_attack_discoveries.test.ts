/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AuthenticatedUser, Logger } from '@kbn/core/server';
import type { IRuleDataClient } from '@kbn/rule-registry-plugin/server';
import type { PostValidateRequestBody } from '@kbn/discoveries-schemas';
import { validateAttackDiscoveries } from './validate_attack_discoveries';
import { transformSearchResponseToAlerts } from './transform_search_response_to_alerts';
import { transformToAlertDocuments } from './transform_to_alert_documents';

jest.mock('uuid', () => ({
  v4: () => 'generated-uuid',
}));

jest.mock('./transform_search_response_to_alerts', () => ({
  transformSearchResponseToAlerts: jest.fn(),
}));

jest.mock('./transform_to_alert_documents', () => ({
  transformToAlertDocuments: jest.fn(),
}));

describe('validateAttackDiscoveries', () => {
  const authenticatedUser = {
    profile_uid: 'profile-1',
    username: 'user-1',
  } as unknown as AuthenticatedUser;

  const logger = {
    debug: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
  } as unknown as Logger;

  const validateRequestBody = {
    alerts_context_count: 1,
    anonymized_alerts: [{ metadata: {}, page_content: 'kibana.alert.risk_score,42' }],
    api_config: { action_type_id: '.gen', connector_id: 'connector-1' },
    attack_discoveries: [
      {
        alert_ids: ['a1'],
        details_markdown: 'details',
        entity_summary_markdown: 'entity',
        mitre_attack_tactics: ['Execution'],
        summary_markdown: 'summary',
        timestamp: '2025-12-15T18:39:20.762Z',
        title: 'title',
      },
    ],
    connector_name: 'Connector 1',
    generation_uuid: 'generation-1',
  } as unknown as PostValidateRequestBody;

  const createAdhocAttackDiscoveryDataClient = () => {
    const readDataClient = {
      search: jest.fn().mockResolvedValue({ hits: { hits: [] } }),
    };

    const bulkResponse = {
      errors: false,
      items: [{ create: { _id: 'doc-1', result: 'created' } }],
    };

    const writeDataClient = {
      bulk: jest.fn().mockResolvedValue({ body: bulkResponse }),
    };

    const dataClient = {
      getReader: jest.fn().mockReturnValue(readDataClient),
      getWriter: jest.fn().mockResolvedValue(writeDataClient),
      indexNameWithNamespace: jest.fn().mockReturnValue('.adhoc.alerts-test'),
    } as unknown as jest.Mocked<IRuleDataClient>;

    return { dataClient, readDataClient, writeDataClient };
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns an empty validated_discoveries array when there are no alert documents to create', async () => {
    (transformToAlertDocuments as jest.Mock).mockReturnValue([]);

    const { dataClient } = createAdhocAttackDiscoveryDataClient();
    const result = await validateAttackDiscoveries({
      adhocAttackDiscoveryDataClient: dataClient,
      authenticatedUser,
      logger,
      validateRequestBody,
      spaceId: 'default',
    });

    expect(result).toEqual({
      duplicates_dropped_count: 0,
      validated_discoveries: [],
    });
  });

  it('uses a generated uuid when the alert document is missing a uuid', async () => {
    (transformToAlertDocuments as jest.Mock).mockReturnValue([{}]);

    const { dataClient } = createAdhocAttackDiscoveryDataClient();
    (await dataClient.getWriter({ namespace: 'default' })).bulk = jest.fn().mockResolvedValue({
      body: { errors: false, items: [] },
    });

    await validateAttackDiscoveries({
      adhocAttackDiscoveryDataClient: dataClient,
      authenticatedUser,
      logger,
      validateRequestBody,
      spaceId: 'default',
    });

    expect((await dataClient.getWriter({ namespace: 'default' })).bulk).toHaveBeenCalledWith(
      expect.objectContaining({
        body: [{ create: { _id: 'generated-uuid' } }, {}],
      })
    );
  });

  it('does not bulk insert when the document already exists', async () => {
    (transformToAlertDocuments as jest.Mock).mockReturnValue([{ 'kibana.alert.uuid': 'uuid-1' }]);
    (transformSearchResponseToAlerts as jest.Mock).mockReturnValue([]);

    const { dataClient, readDataClient, writeDataClient } = createAdhocAttackDiscoveryDataClient();

    readDataClient.search
      // Pre-dedupe: existing id is found (covers existingIds.add(hit._id))
      .mockResolvedValueOnce({
        hits: { hits: [{ _id: 'uuid-1', _source: { foo: 'bar' } }] },
      })
      // Fetch: return anything (we mock transformSearchResponseToAlerts)
      .mockResolvedValueOnce({ hits: { hits: [] } });

    const result = await validateAttackDiscoveries({
      adhocAttackDiscoveryDataClient: dataClient,
      authenticatedUser,
      logger,
      validateRequestBody,
      spaceId: 'default',
    });

    expect(result).toEqual({
      duplicates_dropped_count: 1,
      validated_discoveries: [],
    });
    expect(writeDataClient.bulk).not.toHaveBeenCalled();
  });

  it('returns an empty validated_discoveries array when bulk returns an undefined body', async () => {
    (transformToAlertDocuments as jest.Mock).mockReturnValue([{ 'kibana.alert.uuid': 'uuid-1' }]);

    const { dataClient } = createAdhocAttackDiscoveryDataClient();
    (await dataClient.getWriter({ namespace: 'default' })).bulk = jest
      .fn()
      .mockResolvedValue({ body: undefined });

    const result = await validateAttackDiscoveries({
      adhocAttackDiscoveryDataClient: dataClient,
      authenticatedUser,
      logger,
      validateRequestBody,
      spaceId: 'default',
    });

    expect(result).toEqual({
      duplicates_dropped_count: 0,
      validated_discoveries: [],
    });
  });

  it('returns an empty validated_discoveries array when a created bulk item is missing an id', async () => {
    (transformToAlertDocuments as jest.Mock).mockReturnValue([{ 'kibana.alert.uuid': 'uuid-1' }]);

    const { dataClient } = createAdhocAttackDiscoveryDataClient();
    (await dataClient.getWriter({ namespace: 'default' })).bulk = jest.fn().mockResolvedValue({
      body: {
        errors: false,
        items: [{ create: { result: 'created' } }],
      },
    });

    const result = await validateAttackDiscoveries({
      adhocAttackDiscoveryDataClient: dataClient,
      authenticatedUser,
      logger,
      validateRequestBody,
      spaceId: 'default',
    });

    expect(result).toEqual({
      duplicates_dropped_count: 0,
      validated_discoveries: [],
    });
  });

  it('throws when bulk returns errors', async () => {
    (transformToAlertDocuments as jest.Mock).mockReturnValue([{ 'kibana.alert.uuid': 'uuid-1' }]);

    const { dataClient } = createAdhocAttackDiscoveryDataClient();
    (await dataClient.getWriter({ namespace: 'default' })).bulk = jest.fn().mockResolvedValue({
      body: {
        errors: true,
        // Include one item without an error to cover the `error == null` branch in the errorDetails builder.
        items: [
          { create: { _id: 'doc-1', error: { reason: 'boom', type: 'error' } } },
          { create: { _id: 'doc-2', result: 'created' } },
        ],
      },
    });

    await expect(
      validateAttackDiscoveries({
        adhocAttackDiscoveryDataClient: dataClient,
        authenticatedUser,
        logger,
        validateRequestBody,
        spaceId: 'default',
      })
    ).rejects.toThrow('Failed to bulk insert Attack discovery alerts');
  });

  it('throws when bulk errors are true and the item error has no id', async () => {
    (transformToAlertDocuments as jest.Mock).mockReturnValue([{ 'kibana.alert.uuid': 'uuid-1' }]);

    const { dataClient } = createAdhocAttackDiscoveryDataClient();
    (await dataClient.getWriter({ namespace: 'default' })).bulk = jest.fn().mockResolvedValue({
      body: {
        errors: true,
        items: [{ create: { error: { reason: 'boom', type: 'error' } } }],
      },
    });

    await expect(
      validateAttackDiscoveries({
        adhocAttackDiscoveryDataClient: dataClient,
        authenticatedUser,
        logger,
        validateRequestBody,
        spaceId: 'default',
      })
    ).rejects.toThrow('Failed to bulk insert Attack discovery alerts');
  });

  it('returns an empty validated_discoveries array when bulk errors are true but there are no item errors', async () => {
    (transformToAlertDocuments as jest.Mock).mockReturnValue([{ 'kibana.alert.uuid': 'uuid-1' }]);
    (transformSearchResponseToAlerts as jest.Mock).mockReturnValue([]);

    const { dataClient } = createAdhocAttackDiscoveryDataClient();
    (await dataClient.getWriter({ namespace: 'default' })).bulk = jest.fn().mockResolvedValue({
      body: {
        errors: true,
        items: [{ create: { _id: 'doc-1', result: 'created' } }],
      },
    });

    const result = await validateAttackDiscoveries({
      adhocAttackDiscoveryDataClient: dataClient,
      authenticatedUser,
      logger,
      validateRequestBody,
      spaceId: 'default',
    });

    expect(result).toEqual({
      duplicates_dropped_count: 0,
      validated_discoveries: [],
    });
  });

  it('returns an empty validated_discoveries array when no documents were created', async () => {
    (transformToAlertDocuments as jest.Mock).mockReturnValue([{ 'kibana.alert.uuid': 'uuid-1' }]);

    const { dataClient } = createAdhocAttackDiscoveryDataClient();
    (await dataClient.getWriter({ namespace: 'default' })).bulk = jest.fn().mockResolvedValue({
      body: { errors: false, items: [{ create: { _id: 'doc-1', result: 'noop' } }] },
    });

    const result = await validateAttackDiscoveries({
      adhocAttackDiscoveryDataClient: dataClient,
      authenticatedUser,
      logger,
      validateRequestBody,
      spaceId: 'default',
    });

    expect(result).toEqual({
      duplicates_dropped_count: 0,
      validated_discoveries: [],
    });
  });

  it('returns validated_discoveries from the search response transformation', async () => {
    (transformToAlertDocuments as jest.Mock).mockReturnValue([{ 'kibana.alert.uuid': 'uuid-1' }]);
    (transformSearchResponseToAlerts as jest.Mock).mockReturnValue([
      {
        alert_ids: ['a1'],
        connector_id: 'connector-1',
        connector_name: 'Connector 1',
        details_markdown: 'details',
        generation_uuid: 'generation-1',
        id: 'doc-1',
        summary_markdown: 'summary',
        timestamp: '2025-12-15T18:39:20.762Z',
        title: 'title',
      },
    ]);

    const { dataClient } = createAdhocAttackDiscoveryDataClient();
    const result = await validateAttackDiscoveries({
      adhocAttackDiscoveryDataClient: dataClient,
      authenticatedUser,
      logger,
      validateRequestBody,
      spaceId: 'default',
    });

    expect(result).toEqual(
      expect.objectContaining({
        duplicates_dropped_count: 0,
        validated_discoveries: expect.any(Array),
      })
    );
    expect(result.validated_discoveries).toHaveLength(1);
  });
});
