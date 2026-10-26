/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client as EsClient } from '@elastic/elasticsearch';
import { FP_TP_INFERENCE_FEATURE_ID } from '../constants';
import type { FpTpLiveKbnRequest } from '../world';
import { buildWorkerModePlan } from './plan';
import {
  cleanupWorkerModeSpace,
  ensureAttackDiscoveryWorkflowsSetting,
  ensureBootstrapNoMatchRule,
  ensureAnonymizationFields,
  ensureReasoningMapping,
  ensureWorkerModeSpace,
  seedWorkerModePlan,
} from './seed';

type KbnCall = Parameters<FpTpLiveKbnRequest>[0];

const okKbnRequest = (body: unknown = {}) =>
  jest.fn(async (_call: KbnCall) => ({ statusCode: 200, body })) as jest.Mock & FpTpLiveKbnRequest;

const settings = (features: unknown[]) => ({ data: { features } });

describe('cleanupWorkerModeSpace', () => {
  const stubEs = (hostIds: string[]) => {
    const esClient = {
      search: jest
        .fn()
        .mockImplementation(async ({ index }: { index: string }) =>
          index === '.alerts-security.alerts-qa-fp'
            ? { hits: { hits: hostIds.map((id) => ({ _source: { host: { id } } })) } }
            : { hits: { hits: [{ _source: { entity: { id: 'host:h1' } } }] } }
        ),
      deleteByQuery: jest.fn().mockResolvedValue({}),
    };
    return esClient;
  };

  it('deletes earlier seeded alerts, their raw events in every namespace, and their entities', async () => {
    const esClient = stubEs(['h1', 'h1', 'h2']);
    const kbnRequest = okKbnRequest();

    await expect(
      cleanupWorkerModeSpace({
        esClient: esClient as unknown as EsClient,
        kbnRequest,
        space: 'qa-fp',
      })
    ).resolves.toEqual({ alerts: 3, hostIds: ['h1', 'h2'] });

    expect(esClient.search).toHaveBeenCalledWith(
      expect.objectContaining({
        index: '.alerts-security.alerts-qa-fp',
        query: { prefix: { tags: 'ad-fp-tp-twins-2026-09' } },
      })
    );
    expect(esClient.deleteByQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        index: 'logs-endpoint.events.*',
        query: { terms: { 'host.id': ['h1', 'h2'] } },
      })
    );
    expect(esClient.search).toHaveBeenCalledWith(
      expect.objectContaining({
        index: 'entities-latest-qa-fp',
        query: { terms: { 'host.id': ['h1', 'h2'] } },
      })
    );
    expect(kbnRequest).toHaveBeenCalledWith(
      expect.objectContaining({ method: 'DELETE', body: { entityId: 'host:h1' } })
    );
    expect(esClient.deleteByQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        index: '.alerts-security.alerts-qa-fp',
        query: { prefix: { tags: 'ad-fp-tp-twins-2026-09' } },
      })
    );
  });

  it('deletes nothing when the space holds no earlier seed', async () => {
    const esClient = stubEs([]);
    await cleanupWorkerModeSpace({
      esClient: esClient as unknown as EsClient,
      kbnRequest: okKbnRequest(),
      space: 'qa-fp',
    });
    expect(esClient.deleteByQuery).not.toHaveBeenCalled();
  });
});

describe('seedWorkerModePlan', () => {
  const plan = buildWorkerModePlan({
    space: 'qa-fp',
    exampleId: 'encoded-powershell.fp',
    now: new Date('2026-10-14T12:00:00.000Z'),
    suffix: 'run1',
  });

  it('writes alerts and events with create operations and entities through the API', async () => {
    const esClient = {
      bulk: jest.fn().mockResolvedValue({ errors: false }),
      updateByQuery: jest.fn().mockResolvedValue({ updated: 1 }),
    };
    const kbnRequest = okKbnRequest();
    await seedWorkerModePlan({ esClient: esClient as unknown as EsClient, kbnRequest, plan });

    expect(esClient.bulk.mock.calls.map(([{ operations }]) => operations)).toEqual([
      plan.alertOperations,
      plan.eventOperations,
    ]);
    expect(
      kbnRequest.mock.calls.filter(([{ method }]) => method === 'POST').map(([{ path }]) => path)
    ).toEqual(
      plan.entities.map(({ entityType }) => `/api/security/entity_store/entities/${entityType}`)
    );
    expect(esClient.updateByQuery).toHaveBeenCalledWith(
      expect.objectContaining({ index: 'entities-latest-qa-fp' })
    );
  });

  it('removes a partial seed before rethrowing', async () => {
    const esClient = {
      bulk: jest
        .fn()
        .mockResolvedValueOnce({ errors: false })
        .mockResolvedValueOnce({ errors: true, items: [] }),
      deleteByQuery: jest.fn().mockResolvedValue({}),
      search: jest.fn().mockResolvedValue({ hits: { hits: [] } }),
    };
    await expect(
      seedWorkerModePlan({
        esClient: esClient as unknown as EsClient,
        kbnRequest: okKbnRequest(),
        plan,
      })
    ).rejects.toThrow('events bulk had item errors');
    expect(esClient.deleteByQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        index: '.alerts-security.alerts-qa-fp',
        query: { ids: { values: plan.alertIds } },
      })
    );
  });
});

describe('ensureReasoningMapping', () => {
  const other = { feature_id: 'other', endpoints: [{ id: 'other-connector' }] };

  it('returns the existing mapping without writing', async () => {
    const kbnRequest = okKbnRequest(
      settings([other, { feature_id: FP_TP_INFERENCE_FEATURE_ID, endpoints: [{ id: 'gpt' }] }])
    );
    await expect(ensureReasoningMapping(kbnRequest)).resolves.toBe('gpt');
    expect(kbnRequest.mock.calls.filter(([{ method }]) => method === 'PUT')).toEqual([]);
  });

  it('maps the connector and keeps every other feature', async () => {
    const kbnRequest = okKbnRequest(settings([other]));
    await expect(ensureReasoningMapping(kbnRequest, 'claude')).resolves.toBe('claude');
    const [[put]] = kbnRequest.mock.calls.filter(([{ method }]) => method === 'PUT');
    expect(put.body).toEqual({
      features: [other, { feature_id: FP_TP_INFERENCE_FEATURE_ID, endpoints: [{ id: 'claude' }] }],
    });
  });

  it('throws when nothing is mapped and no connector is passed', async () => {
    await expect(ensureReasoningMapping(okKbnRequest(settings([other])))).rejects.toThrow(
      '--reasoningConnectorId'
    );
  });

  it('throws when the settings cannot be read', async () => {
    const kbnRequest = jest.fn(async () => ({
      statusCode: 403,
      body: { message: 'forbidden' },
    })) as unknown as FpTpLiveKbnRequest;
    await expect(ensureReasoningMapping(kbnRequest, 'claude')).rejects.toThrow('forbidden');
  });
});

describe('ensureAnonymizationFields', () => {
  it('reads the anonymization fields in the space, which installs their index', async () => {
    const kbnRequest = okKbnRequest();
    const exists = jest.fn().mockResolvedValue(true);
    await ensureAnonymizationFields(
      { indices: { exists } } as unknown as EsClient,
      kbnRequest,
      'qa-fp'
    );
    expect(kbnRequest).toHaveBeenCalledWith(
      expect.objectContaining({
        method: 'GET',
        path: '/api/security_ai_assistant/anonymization_fields/_find?per_page=1',
      })
    );
    expect(exists).toHaveBeenCalledWith({
      index: '.kibana-elastic-ai-assistant-anonymization-fields-qa-fp',
    });
  });

  it('throws when the index is still missing', async () => {
    await expect(
      ensureAnonymizationFields(
        { indices: { exists: jest.fn().mockResolvedValue(false) } } as unknown as EsClient,
        okKbnRequest(),
        'qa-fp'
      )
    ).rejects.toThrow('Open Attack discovery once');
  });
});

describe('ensureAttackDiscoveryWorkflowsSetting', () => {
  it('turns the setting on in the space when it is unset', async () => {
    const kbnRequest = okKbnRequest({ settings: {} });
    await ensureAttackDiscoveryWorkflowsSetting(kbnRequest);
    expect(kbnRequest).toHaveBeenCalledWith({
      method: 'POST',
      path: '/internal/kibana/settings',
      body: { changes: { 'securitySolution:enableAttackDiscoveryWorkflows': true } },
    });
  });

  it('writes nothing when the setting is already on', async () => {
    const kbnRequest = okKbnRequest({
      settings: { 'securitySolution:enableAttackDiscoveryWorkflows': { userValue: true } },
    });
    await ensureAttackDiscoveryWorkflowsSetting(kbnRequest);
    expect(kbnRequest.mock.calls.filter(([{ method }]) => method === 'POST')).toEqual([]);
  });
});

describe('ensureBootstrapNoMatchRule', () => {
  it('creates the enabled no-match rule when the space has none', async () => {
    const kbnRequest = jest.fn(async ({ method }: KbnCall) =>
      method === 'GET' ? { statusCode: 404, body: {} } : { statusCode: 200, body: {} }
    ) as jest.Mock & FpTpLiveKbnRequest;
    await ensureBootstrapNoMatchRule(kbnRequest);
    const [[create]] = kbnRequest.mock.calls.filter(([{ method }]) => method === 'POST');
    expect(create.body).toEqual(
      expect.objectContaining({ rule_id: 'fptp-seeder-bootstrap-nomatch', enabled: true })
    );
  });

  it('keeps an existing rule', async () => {
    const kbnRequest = okKbnRequest({ id: 'rule' });
    await ensureBootstrapNoMatchRule(kbnRequest);
    expect(kbnRequest.mock.calls.filter(([{ method }]) => method === 'POST')).toEqual([]);
  });
});

describe('ensureWorkerModeSpace', () => {
  it('creates the space when it does not exist', async () => {
    const kbnRequest = jest.fn(async ({ method }: KbnCall) =>
      method === 'GET' ? { statusCode: 404, body: {} } : { statusCode: 200, body: {} }
    ) as jest.Mock & FpTpLiveKbnRequest;
    expect(await ensureWorkerModeSpace(kbnRequest, 'qa-fp')).toBe(true);
    expect(kbnRequest).toHaveBeenCalledWith(
      expect.objectContaining({ method: 'GET', path: '/api/spaces/space/qa-fp' })
    );
    expect(kbnRequest).toHaveBeenCalledWith({
      method: 'POST',
      path: '/api/spaces/space',
      body: { id: 'qa-fp', name: 'qa-fp' },
    });
  });

  it('keeps an existing space', async () => {
    const kbnRequest = okKbnRequest({ id: 'qa-fp' });
    expect(await ensureWorkerModeSpace(kbnRequest, 'qa-fp')).toBe(false);
    expect(kbnRequest.mock.calls.filter(([{ method }]) => method === 'POST')).toEqual([]);
  });

  it('throws when the lookup fails for another reason', async () => {
    const kbnRequest = jest.fn(async () => ({
      statusCode: 403,
      body: { message: 'forbidden' },
    })) as jest.Mock & FpTpLiveKbnRequest;
    await expect(ensureWorkerModeSpace(kbnRequest, 'qa-fp')).rejects.toThrow(
      'Failed to look up space qa-fp (403): forbidden'
    );
    expect(kbnRequest).toHaveBeenCalledTimes(1);
  });
});
