/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mockRouter } from '@kbn/core-http-router-server-mocks';
import { httpServerMock } from '@kbn/core-http-server-mocks';
import { loggerMock } from '@kbn/logging-mocks';
import {
  GetDiscoveryContextResponse,
  PND_DISCOVERY_CONTEXT_MAX_ALERT_IDS,
  PND_DISCOVERY_CONTEXT_URL,
} from '@kbn/pnd-common';

import { PND_API_PRIVILEGE_READ } from '../../../../common/constants';
import type { RouteDependencies } from '../../register_routes';
import { findAttackDiscoveryAlerts } from '../conversations/helpers/find_attack_discovery_alerts';
import { registerGetDiscoveryContextRoute } from './get_discovery_context';

// `resolveReadableAttackDiscoveryAlertIds` imports this same module file, so one mock covers both
// the S3 readability check and the `alert_ids` read that follows it.
jest.mock('../conversations/helpers/find_attack_discovery_alerts');

const findAttackDiscoveryAlertsMock = findAttackDiscoveryAlerts as jest.Mock;

const REQUEST_SPACE = 'agent-3';

const aggregationsFor = (buckets: Record<string, unknown>) => ({
  aggregations: { by_discovery: { buckets } },
});

const discoveryBucket = {
  destination_ip: { buckets: [] },
  doc_count: 2,
  host_name: { buckets: [{ doc_count: 2, key: 'host-a' }] },
  max_risk_score: { value: 73 },
  source_ip: { buckets: [] },
  user_name: { buckets: [] },
};

type PndDiscoveryContextRouteDependencies = RouteDependencies & {
  router: ReturnType<typeof mockRouter.create>;
};

const createDeps = ({ search }: { search?: jest.Mock } = {}) => {
  const searchMock = search ?? jest.fn().mockResolvedValue(aggregationsFor({}));
  const asCurrentUser = { search: searchMock };
  const asInternalUser = { search: jest.fn() };
  const router = mockRouter.create();

  const deps = {
    config: { enabled: true, ui: { useMockData: false } },
    getEsClient: jest.fn().mockResolvedValue({ asCurrentUser, asInternalUser }),
    getSpaceId: jest.fn().mockReturnValue(REQUEST_SPACE),
    getStartServices: jest.fn().mockResolvedValue([{ http: {} }, {}]),
    getWatchProjection: jest.fn(),
    getWorkflowsManagementClient: jest.fn(),
    logger: loggerMock.create(),
    router,
  } as unknown as PndDiscoveryContextRouteDependencies;

  return { asInternalUser, deps, searchMock };
};

const invoke = async (deps: PndDiscoveryContextRouteDependencies, correlationIds: string[]) => {
  registerGetDiscoveryContextRoute(deps);

  const handler = deps.router.versioned.getRoute('get', PND_DISCOVERY_CONTEXT_URL).versions['1']
    .handler as unknown as (...args: unknown[]) => Promise<unknown>;

  const response = httpServerMock.createResponseFactory();
  await handler(
    {} as unknown,
    httpServerMock.createKibanaRequest({ query: { correlationIds } }),
    response
  );

  return response;
};

const body = (
  response: ReturnType<typeof httpServerMock.createResponseFactory>
): GetDiscoveryContextResponse => {
  const [call] = response.ok.mock.calls;

  if (call?.[0] == null) {
    throw new Error('expected the route to have responded with a discovery context');
  }

  return call[0].body as GetDiscoveryContextResponse;
};

describe('registerGetDiscoveryContextRoute', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    findAttackDiscoveryAlertsMock.mockResolvedValue([{ alert_ids: ['alert-1'], id: 'ad-1' }]);
  });

  it('requires the PND read privilege', () => {
    const { deps } = createDeps();

    registerGetDiscoveryContextRoute(deps);

    expect(
      deps.router.versioned.getRoute('get', PND_DISCOVERY_CONTEXT_URL).config.security
    ).toEqual({ authz: { requiredPrivileges: [PND_API_PRIVILEGE_READ] } });
  });

  it('returns no contexts when no ids were requested', async () => {
    const { deps } = createDeps();

    expect(body(await invoke(deps, [])).contexts).toEqual([]);
  });

  it('reads nothing at all when no ids were requested', async () => {
    const { deps, searchMock } = createDeps();

    await invoke(deps, []);

    expect(searchMock).not.toHaveBeenCalled();
  });

  /**
   * The count bound is the route's to enforce: `@kbn/openapi-generator` renders a bounded query
   * array as `ArrayFromString(...).max(n)`, which throws at parse time, so the codec cannot carry
   * it (see `PND_DISCOVERY_CONTEXT_MAX_ALERT_IDS`).
   */
  it('rejects more ids than the aggregation is bounded at', async () => {
    const { deps } = createDeps();

    const response = await invoke(
      deps,
      Array.from({ length: PND_DISCOVERY_CONTEXT_MAX_ALERT_IDS + 1 }, (_, i) => `ad-${i}`)
    );

    expect(response.badRequest).toHaveBeenCalledTimes(1);
  });

  it('accepts exactly the bounded number of ids', async () => {
    const { deps } = createDeps();

    const response = await invoke(
      deps,
      Array.from({ length: PND_DISCOVERY_CONTEXT_MAX_ALERT_IDS }, (_, i) => `ad-${i}`)
    );

    expect(response.badRequest).not.toHaveBeenCalled();
  });

  it('never reaches Elasticsearch for an over-long request', async () => {
    const { deps, searchMock } = createDeps();

    await invoke(
      deps,
      Array.from({ length: PND_DISCOVERY_CONTEXT_MAX_ALERT_IDS + 1 }, (_, i) => `ad-${i}`)
    );

    expect(searchMock).not.toHaveBeenCalled();
  });

  it('never resolves a discovery for an over-long request', async () => {
    const { deps } = createDeps();

    await invoke(
      deps,
      Array.from({ length: PND_DISCOVERY_CONTEXT_MAX_ALERT_IDS + 1 }, (_, i) => `ad-${i}`)
    );

    expect(findAttackDiscoveryAlertsMock).not.toHaveBeenCalled();
  });

  it('resolves the discoveries as the calling user, in the request space (S3)', async () => {
    const { deps } = createDeps();

    await invoke(deps, ['ad-1']);

    expect(findAttackDiscoveryAlertsMock).toHaveBeenCalledWith(
      expect.objectContaining({ ids: ['ad-1'], spaceId: REQUEST_SPACE })
    );
  });

  it('never reads an alert for a discovery the caller cannot read (S3)', async () => {
    findAttackDiscoveryAlertsMock.mockResolvedValue([]);
    const { deps, searchMock } = createDeps();

    await invoke(deps, ['ad-1']);

    expect(searchMock).not.toHaveBeenCalled();
  });

  it('returns no contexts for a discovery the caller cannot read (S3)', async () => {
    findAttackDiscoveryAlertsMock.mockResolvedValue([]);
    const { deps } = createDeps();

    expect(body(await invoke(deps, ['ad-1'])).contexts).toEqual([]);
  });

  /**
   * `asCurrentUser` is what preserves S3 on the alerts index by construction — the internal user
   * would see every alert in the space regardless of the caller's privileges.
   */
  it('never reads the alerts index as the internal user', async () => {
    const { asInternalUser, deps } = createDeps();

    await invoke(deps, ['ad-1']);

    expect(asInternalUser.search).not.toHaveBeenCalled();
  });

  it('resolves N discoveries in one Elasticsearch round trip', async () => {
    findAttackDiscoveryAlertsMock.mockResolvedValue([
      { alert_ids: ['alert-1'], id: 'ad-1' },
      { alert_ids: ['alert-2'], id: 'ad-2' },
    ]);
    const { deps, searchMock } = createDeps();

    await invoke(deps, ['ad-1', 'ad-2']);

    expect(searchMock).toHaveBeenCalledTimes(1);
  });

  it('projects the aggregation onto the response contract', async () => {
    const { deps } = createDeps({
      search: jest.fn().mockResolvedValue(aggregationsFor({ 'ad-1': discoveryBucket })),
    });

    expect(body(await invoke(deps, ['ad-1'])).contexts).toEqual([
      {
        correlationId: 'ad-1',
        entities: [{ count: 2, field: 'host.name', value: 'host-a' }],
        riskScore: 73,
      },
    ]);
  });

  /**
   * Nothing validates the response on the way out, so the contract's bounds — 200 contexts, 100
   * entities, a 0-100 risk score — hold only if what the route builds already satisfies them.
   */
  it('emits a body the response contract accepts', async () => {
    const { deps } = createDeps({
      search: jest.fn().mockResolvedValue(aggregationsFor({ 'ad-1': discoveryBucket })),
    });

    const responseBody = body(await invoke(deps, ['ad-1']));

    expect(() => GetDiscoveryContextResponse.parse(responseBody)).not.toThrow();
  });

  it('reads no alerts for a discovery with no constituent alerts', async () => {
    findAttackDiscoveryAlertsMock.mockResolvedValue([{ alert_ids: [], id: 'ad-1' }]);
    const { deps, searchMock } = createDeps();

    await invoke(deps, ['ad-1']);

    expect(searchMock).not.toHaveBeenCalled();
  });

  it('returns no context for a discovery with no constituent alerts, never a zero score', async () => {
    findAttackDiscoveryAlertsMock.mockResolvedValue([{ alert_ids: [], id: 'ad-1' }]);
    const { deps } = createDeps();

    expect(body(await invoke(deps, ['ad-1'])).contexts).toEqual([]);
  });

  /**
   * The blast radius and the risk badge are overlays on a queue that renders fine without them,
   * and the queue is a separate read on a separate react-query key: a failed enrichment must not
   * take it down.
   */
  it('degrades to no contexts when the read fails, rather than failing the request', async () => {
    const { deps } = createDeps({ search: jest.fn().mockRejectedValue(new Error('boom')) });

    expect(body(await invoke(deps, ['ad-1'])).contexts).toEqual([]);
  });

  it('does not surface a failed read as an error', async () => {
    const { deps } = createDeps({ search: jest.fn().mockRejectedValue(new Error('boom')) });

    const response = await invoke(deps, ['ad-1']);

    expect(response.customError).not.toHaveBeenCalled();
  });

  it('logs a failed read through the PND logger', async () => {
    const { deps } = createDeps({ search: jest.fn().mockRejectedValue(new Error('boom')) });

    await invoke(deps, ['ad-1']);

    expect(deps.logger.warn).toHaveBeenCalledTimes(1);
  });

  it('degrades when the discoveries cannot be resolved at all', async () => {
    findAttackDiscoveryAlertsMock.mockRejectedValue(new Error('boom'));
    const { deps } = createDeps();

    expect(body(await invoke(deps, ['ad-1'])).contexts).toEqual([]);
  });

  it('still responds when the aggregation is missing entirely', async () => {
    const { deps } = createDeps({ search: jest.fn().mockResolvedValue({}) });

    expect(body(await invoke(deps, ['ad-1'])).contexts).toEqual([]);
  });
});
