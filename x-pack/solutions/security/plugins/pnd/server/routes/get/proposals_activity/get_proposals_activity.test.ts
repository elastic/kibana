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
  type GetProposalsActivityResponse,
  PND_GATE_STEP_IDS,
  PND_PROPOSALS_ACTIVITY_URL,
  PND_WATCH_WORKFLOW_IDS,
} from '@kbn/pnd-common';
import { WORKFLOWS_STEP_EXECUTIONS_INDEX } from '@kbn/workflows-management-plugin/common';

import { PND_API_PRIVILEGE_READ } from '../../../../common/constants';
import type { RouteDependencies } from '../../register_routes';
import { PND_ACTIVITY_BUCKET_COUNT } from './helpers/resolve_activity_window';
import { registerGetProposalsActivityRoute } from './get_proposals_activity';

const REQUEST_SPACE = 'agent-3';
const NOW = Date.parse('2026-08-06T14:37:21.123Z');
/** Start of the oldest hour in the series for {@link NOW}: `2026-08-05T15:00:00.000Z`. */
const OLDEST_HOUR = Date.parse('2026-08-05T15:00:00.000Z');

const emptyAggregations = { by_hour: { buckets: [] } };

type PndActivityRouteDependencies = RouteDependencies & {
  router: ReturnType<typeof mockRouter.create>;
};

const createDeps = ({
  aggregations = emptyAggregations,
  search,
}: {
  aggregations?: unknown;
  search?: jest.Mock;
} = {}) => {
  const searchMock = search ?? jest.fn().mockResolvedValue({ aggregations });
  const asInternalUser = { search: searchMock };
  const asCurrentUser = { search: jest.fn() };
  const router = mockRouter.create();

  const deps = {
    config: { enabled: true, ui: { useMockData: false } },
    getEsClient: jest.fn().mockResolvedValue({ asCurrentUser, asInternalUser }),
    getSpaceId: jest.fn().mockReturnValue(REQUEST_SPACE),
    getStartServices: jest.fn(),
    getWatchProjection: jest.fn(),
    getWorkflowsManagementClient: jest.fn(),
    logger: loggerMock.create(),
    router,
  } as unknown as PndActivityRouteDependencies;

  return { asCurrentUser, deps, searchMock };
};

const invoke = async (deps: PndActivityRouteDependencies) => {
  registerGetProposalsActivityRoute(deps);

  const handler = deps.router.versioned.getRoute('get', PND_PROPOSALS_ACTIVITY_URL).versions['1']
    .handler as unknown as (...args: unknown[]) => Promise<unknown>;

  const response = httpServerMock.createResponseFactory();
  await handler({} as unknown, httpServerMock.createKibanaRequest(), response);

  return response;
};

const body = (
  response: ReturnType<typeof httpServerMock.createResponseFactory>
): GetProposalsActivityResponse => {
  const [call] = response.ok.mock.calls;

  if (call?.[0] == null) {
    throw new Error('expected the route to have responded with an activity series');
  }

  return call[0].body as GetProposalsActivityResponse;
};

describe('registerGetProposalsActivityRoute', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers().setSystemTime(NOW);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('requires the PND read privilege', () => {
    const { deps } = createDeps();

    registerGetProposalsActivityRoute(deps);

    expect(
      deps.router.versioned.getRoute('get', PND_PROPOSALS_ACTIVITY_URL).config.security
    ).toEqual({ authz: { requiredPrivileges: [PND_API_PRIVILEGE_READ] } });
  });

  it('returns exactly 24 buckets when nothing matched', async () => {
    const { deps } = createDeps();

    expect(body(await invoke(deps)).buckets.length).toEqual(PND_ACTIVITY_BUCKET_COUNT);
  });

  it('zero-fills a series with no matching documents', async () => {
    const { deps } = createDeps();

    expect(body(await invoke(deps)).buckets[0]).toEqual({
      counts: { contain: 0, escalate: 0, investigate: 0, tune: 0 },
      time: OLDEST_HOUR,
    });
  });

  it('orders the buckets oldest first', async () => {
    const { deps } = createDeps();

    const { buckets } = body(await invoke(deps));

    expect(buckets.map(({ time }) => time)).toEqual(
      [...buckets.map(({ time }) => time)].sort((a, b) => a - b)
    );
  });

  it('projects the aggregation onto the recommended-action counts', async () => {
    const { deps } = createDeps({
      aggregations: {
        by_hour: {
          buckets: [
            {
              by_step_id: {
                buckets: [{ doc_count: 2, key: PND_GATE_STEP_IDS.awaitPromoteIncident }],
              },
              doc_count: 2,
              key: OLDEST_HOUR,
            },
          ],
        },
      },
    });

    expect(body(await invoke(deps)).buckets[0].counts.escalate).toEqual(2);
  });

  it('reads the workflows step-executions index', async () => {
    const { deps, searchMock } = createDeps();

    await invoke(deps);

    expect(searchMock).toHaveBeenCalledWith(
      expect.objectContaining({ index: WORKFLOWS_STEP_EXECUTIONS_INDEX })
    );
  });

  it('reads aggregation-only, so no document content can leave the server (mitigation 4)', async () => {
    const { deps, searchMock } = createDeps();

    await invoke(deps);

    expect(searchMock).toHaveBeenCalledWith(expect.objectContaining({ size: 0 }));
  });

  it("hard-filters to the request's space, never a client value (mitigation 3)", async () => {
    const { deps, searchMock } = createDeps();

    await invoke(deps);

    expect(searchMock.mock.calls[0][0].query.bool.filter).toContainEqual({
      term: { spaceId: REQUEST_SPACE },
    });
  });

  it('hard-filters to the PND watch workflow ids (mitigation 2)', async () => {
    const { deps, searchMock } = createDeps();

    await invoke(deps);

    expect(searchMock.mock.calls[0][0].query.bool.filter).toContainEqual({
      terms: { workflowId: [...PND_WATCH_WORKFLOW_IDS] },
    });
  });

  /**
   * `.workflows-step-executions` is a Workflows system index the calling user has no privileges
   * on, so the read is deliberately `asInternalUser` behind the four mitigations in plan §4.2.
   * The current user's client must never be reached here — if it were, the route would silently
   * return an empty series for every caller instead of failing loudly.
   */
  it('never reads the system index as the calling user', async () => {
    const { asCurrentUser, deps } = createDeps();

    await invoke(deps);

    expect(asCurrentUser.search).not.toHaveBeenCalled();
  });

  it('surfaces a failed read as an error the UI can ignore, rather than a flat zero series', async () => {
    const { deps } = createDeps({ search: jest.fn().mockRejectedValue(new Error('boom')) });

    const response = await invoke(deps);

    expect(response.customError).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 500 }));
  });

  it('does not respond with a body when the read failed', async () => {
    const { deps } = createDeps({ search: jest.fn().mockRejectedValue(new Error('boom')) });

    const response = await invoke(deps);

    expect(response.ok).not.toHaveBeenCalled();
  });

  it('logs the failure through the PND logger', async () => {
    const { deps } = createDeps({ search: jest.fn().mockRejectedValue(new Error('boom')) });

    await invoke(deps);

    expect(deps.logger.error).toHaveBeenCalledTimes(1);
  });

  it('still returns a full series when the aggregation is missing entirely', async () => {
    const { deps } = createDeps({ search: jest.fn().mockResolvedValue({}) });

    expect(body(await invoke(deps)).buckets.length).toEqual(PND_ACTIVITY_BUCKET_COUNT);
  });
});
