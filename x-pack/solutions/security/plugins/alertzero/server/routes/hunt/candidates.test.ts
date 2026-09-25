/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServerMock } from '@kbn/core-http-server-mocks';
import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import { MAX_PROPOSALS_PAGE_OFFSET, MAX_PROPOSALS_PAGE_SIZE } from '@kbn/proposals-common';
import type { RouteDependencies } from '../register_routes';
import { registerCandidatesRoute } from './candidates';
import { buildCandidateQuery } from '../../services/watches/hunt/common/build_candidate_query';
import type {
  CandidateQueryResult,
  OpenProposalConversationIdsReader,
} from '../../services/watches/hunt/common/build_candidate_query';

jest.mock('../../services/watches/hunt/common/build_candidate_query', () => ({
  buildCandidateQuery: jest.fn(),
}));

const buildCandidateQueryMock = buildCandidateQuery as jest.MockedFunction<
  typeof buildCandidateQuery
>;

const candidatesResult: CandidateQueryResult = {
  ids: [],
  skipped: [],
  total: 0,
  truncated: false,
};

/** One `list` page of `size` proposals, each on its own conversation. */
const pageOf = (size: number, total: number, offset: number) => ({
  total,
  proposals: Array.from({ length: size }, (_unused, index) => ({
    conversationId: `conversation-${offset + index}`,
  })),
});

const makeDeps = ({ spaceId = 'default' }: { spaceId?: string } = {}) => {
  const addVersion = jest.fn();
  const router = { versioned: { post: jest.fn().mockReturnValue({ addVersion }) } };
  const logger = loggingSystemMock.createLogger();
  const list = jest.fn().mockResolvedValue({ total: 0, proposals: [] });

  registerCandidatesRoute({
    router: router as unknown as RouteDependencies['router'],
    logger,
    getSpaceId: () => spaceId,
    getHuntServices: () =>
      ({ getProposalsService: () => ({ list }) } as unknown as ReturnType<
        RouteDependencies['getHuntServices']
      >),
  } as unknown as RouteDependencies);

  const asCurrentUser = { search: jest.fn() };
  const asInternalUser = { search: jest.fn() };
  const context = {
    core: Promise.resolve({ elasticsearch: { client: { asCurrentUser, asInternalUser } } }),
  };

  return {
    routeConfig: router.versioned.post.mock.calls[0][0],
    handler: addVersion.mock.calls[0][1] as (
      context: unknown,
      request: ReturnType<typeof httpServerMock.createKibanaRequest>,
      response: ReturnType<typeof httpServerMock.createResponseFactory>
    ) => Promise<unknown>,
    context,
    asCurrentUser,
    asInternalUser,
    list,
    logger,
  };
};

const requestFor = (body: Record<string, unknown> = {}) =>
  httpServerMock.createKibanaRequest({ body });

/** The reader the route hands `buildCandidateQuery` to enumerate the open-proposal gate. */
const readerOf = (): OpenProposalConversationIdsReader =>
  buildCandidateQueryMock.mock.calls[0][3] as OpenProposalConversationIdsReader;

describe('registerCandidatesRoute', () => {
  beforeEach(() => {
    buildCandidateQueryMock.mockReset().mockResolvedValue(candidatesResult);
  });

  it('requires only read privilege', () => {
    const { routeConfig } = makeDeps();
    expect(routeConfig.security.authz.requiredPrivileges).toEqual(['alertzero_read']);
  });

  it('is an internal route', () => {
    const { routeConfig } = makeDeps();
    expect(routeConfig.access).toBe('internal');
  });

  it('reads the hidden reports index as the internal user', async () => {
    const { handler, context, asCurrentUser, asInternalUser } = makeDeps();

    await handler(context, requestFor(), httpServerMock.createResponseFactory());

    expect(buildCandidateQueryMock).toHaveBeenCalledWith(
      asInternalUser,
      expect.anything(),
      expect.anything(),
      expect.anything()
    );
    expect(buildCandidateQueryMock).not.toHaveBeenCalledWith(
      asCurrentUser,
      expect.anything(),
      expect.anything(),
      expect.anything()
    );
  });

  it('scopes the query to the request space, not the default one', async () => {
    const { handler, context } = makeDeps({ spaceId: 'hunt-space' });

    await handler(context, requestFor(), httpServerMock.createResponseFactory());

    expect(buildCandidateQueryMock.mock.calls[0][2]).toEqual(
      expect.objectContaining({ spaceId: 'hunt-space' })
    );
  });

  it('is a manual trigger when the caller names report ids', async () => {
    const { handler, context } = makeDeps();

    await handler(
      context,
      requestFor({ report_ids: ['report-1'] }),
      httpServerMock.createResponseFactory()
    );

    expect(buildCandidateQueryMock.mock.calls[0][2]).toEqual(
      expect.objectContaining({ trigger: 'manual', report_ids: ['report-1'] })
    );
  });

  it.each([
    ['omits report_ids', {}, undefined],
    ['sends an empty report_ids', { report_ids: [] }, []],
  ])('is a scheduled trigger when the caller %s', async (_label, body, expected) => {
    const { handler, context } = makeDeps();

    await handler(context, requestFor(body), httpServerMock.createResponseFactory());

    expect(buildCandidateQueryMock.mock.calls[0][2]).toEqual(
      expect.objectContaining({ trigger: 'scheduled', report_ids: expected })
    );
  });

  describe('the open-proposal gate', () => {
    it('pages past the first page so a later open proposal still blocks a re-hunt', async () => {
      const { handler, context, list } = makeDeps();
      list
        .mockResolvedValueOnce(pageOf(MAX_PROPOSALS_PAGE_SIZE, 150, 0))
        .mockResolvedValueOnce(pageOf(50, 150, MAX_PROPOSALS_PAGE_SIZE))
        .mockResolvedValue({ total: 0, proposals: [] });
      await handler(context, requestFor(), httpServerMock.createResponseFactory());

      const conversationIds = await readerOf()('default');

      expect(conversationIds.size).toBe(150);
      expect(conversationIds.has(`conversation-${MAX_PROPOSALS_PAGE_SIZE + 49}`)).toBe(true);
    });

    it('keeps an executing proposal past its deadline, so containment in flight still blocks a re-hunt', async () => {
      const { handler, context, list } = makeDeps();
      await handler(context, requestFor(), httpServerMock.createResponseFactory());

      await readerOf()('default');

      expect(list).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'pending', excludeExpired: true }),
        'default'
      );
      expect(list).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'executing', excludeExpired: false }),
        'default'
      );
    });

    it('collects both pending and executing proposals', async () => {
      const { handler, context, list } = makeDeps();
      list.mockImplementation(async ({ status }: { status: string }) => ({
        total: 1,
        proposals: [{ conversationId: `conversation-${status}` }],
      }));
      await handler(context, requestFor(), httpServerMock.createResponseFactory());

      const conversationIds = await readerOf()('default');

      expect([...conversationIds].sort()).toEqual([
        'conversation-executing',
        'conversation-pending',
      ]);
    });

    it('fails closed rather than return a partial gate it cannot finish paging', async () => {
      const { handler, context, list } = makeDeps();
      // More open proposals than `from`/`size` paging can reach, so the set can
      // never be completed and a partial one would silently allow a re-hunt.
      list.mockImplementation(async ({ from }: { from: number }) =>
        pageOf(MAX_PROPOSALS_PAGE_SIZE, MAX_PROPOSALS_PAGE_OFFSET * 2, from)
      );
      await handler(context, requestFor(), httpServerMock.createResponseFactory());

      await expect(readerOf()('default')).rejects.toThrow(
        /Cannot enumerate pending proposals in space "default"/
      );
    });
  });

  it('logs and returns a generic 500 when the gate cannot be read', async () => {
    buildCandidateQueryMock.mockRejectedValue(new Error('proposals store unreachable'));
    const { handler, context, logger } = makeDeps();
    const response = httpServerMock.createResponseFactory();

    await handler(context, requestFor(), response);

    expect(logger.error).toHaveBeenCalledWith(
      expect.stringContaining('proposals store unreachable')
    );
    expect(response.customError).toHaveBeenCalledWith({
      statusCode: 500,
      body: { message: 'Failed to build candidate query' },
    });
  });
});
