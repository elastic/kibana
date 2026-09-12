/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AgentPolicy } from '@kbn/fleet-plugin/common';
import { ALL_SPACES_ID } from '@kbn/spaces-plugin/common/constants';
import { httpServerMock } from '@kbn/core-http-server-mocks';
import { loggerMock } from '@kbn/logging-mocks';
import {
  addPrivateLocationRoute,
  getAgentPolicySpaceIds,
  PrivateLocationSchema,
} from './add_private_location';
import { PrivateLocationRepository } from '../../../repositories/private_location_repository';

jest.mock('./migrate_legacy_private_locations');

const agentPolicy = (space_ids?: string[]) => ({ space_ids } as AgentPolicy);

describe('getAgentPolicySpaceIds', () => {
  it('maps an empty space_ids to all spaces when Fleet space awareness is off', () => {
    expect(getAgentPolicySpaceIds(agentPolicy([]))).toEqual([ALL_SPACES_ID]);
  });

  it('maps an undefined space_ids to all spaces', () => {
    expect(getAgentPolicySpaceIds(agentPolicy(undefined))).toEqual([ALL_SPACES_ID]);
  });

  it('normalizes to all spaces when the policy already includes the all-spaces id', () => {
    expect(getAgentPolicySpaceIds(agentPolicy([ALL_SPACES_ID, 'default']))).toEqual([
      ALL_SPACES_ID,
    ]);
  });

  it('returns the policy space ids when scoped to specific spaces', () => {
    expect(getAgentPolicySpaceIds(agentPolicy(['default', 'other']))).toEqual(['default', 'other']);
  });
});

describe('addPrivateLocationRoute handler - space containment', () => {
  const makeRouteContext = ({
    policySpaceIds,
    requestSpaces,
    spaceId = 'naims',
    hasEnterprise = false,
  }: {
    policySpaceIds?: string[];
    requestSpaces?: string[];
    spaceId?: string;
    hasEnterprise?: boolean;
  }) => {
    const response = httpServerMock.createResponseFactory();
    const internalSOClient = {};
    const agentPolicyService = {
      get: jest.fn().mockResolvedValue({ id: 'ap', space_ids: policySpaceIds }),
    };
    const routeContext = {
      server: {
        logger: loggerMock.create(),
        fleet: { agentPolicyService },
        coreStart: {
          savedObjects: { createInternalRepository: jest.fn().mockReturnValue(internalSOClient) },
        },
      },
      request: { body: { label: 'loc', agentPolicyId: 'ap', spaces: requestSpaces } },
      response,
      spaceId,
      savedObjectsClient: {},
      context: {
        licensing: Promise.resolve({
          license: {
            isAvailable: true,
            isActive: true,
            hasAtLeast: (level: string) => level === 'enterprise' && hasEnterprise,
          },
        }),
      },
    } as any;
    return { routeContext, response };
  };

  // Downstream of the containment check the handler runs migrate + duplicate
  // validation + SO create; stub those so tests that pass containment don't
  // touch Elasticsearch/Fleet internals.
  const stubDownstream = () => {
    jest
      .spyOn(PrivateLocationRepository.prototype, 'validatePrivateLocation')
      .mockResolvedValue(undefined);
    return jest
      .spyOn(PrivateLocationRepository.prototype, 'createPrivateLocation')
      .mockResolvedValue({
        attributes: { label: 'loc', id: 'x', agentPolicyId: 'ap' },
        namespaces: [ALL_SPACES_ID],
      } as any);
  };

  afterEach(() => jest.restoreAllMocks());

  it('rejects when a space-scoped agent policy does not contain the requested space', async () => {
    const { routeContext, response } = makeRouteContext({
      policySpaceIds: ['other'],
      requestSpaces: ['naims'],
    });

    await addPrivateLocationRoute().handler(routeContext);

    expect(response.badRequest).toHaveBeenCalledWith(
      expect.objectContaining({
        body: expect.objectContaining({
          message: expect.stringContaining(
            'must be fully contained within agent policy ap spaces [other]'
          ),
        }),
      })
    );
  });

  // The 9.4.4 fix (#277098): a non-space-aware policy has `space_ids: []`, which
  // getAgentPolicySpaceIds now maps to all-spaces, so creation is no longer
  // blocked (this was the exact `spaces []` customer regression on 9.4.0-9.4.3).
  it('allows creation when the agent policy is non-space-aware (empty space_ids)', async () => {
    const { routeContext, response } = makeRouteContext({
      policySpaceIds: [],
      requestSpaces: ['naims'],
    });
    const create = stubDownstream();

    await addPrivateLocationRoute().handler(routeContext);

    expect(response.badRequest).not.toHaveBeenCalled();
    expect(create).toHaveBeenCalled();
  });

  it('allows creation when no specific space is requested (the "clear the Spaces field" behavior)', async () => {
    const { routeContext, response } = makeRouteContext({
      policySpaceIds: ['other'],
      requestSpaces: undefined,
    });
    const create = stubDownstream();

    await addPrivateLocationRoute().handler(routeContext);

    expect(response.badRequest).not.toHaveBeenCalled();
    expect(create).toHaveBeenCalled();
  });

  it('persists isAgentSharding on create when the license is Enterprise', async () => {
    const { routeContext, response } = makeRouteContext({
      policySpaceIds: [ALL_SPACES_ID],
      requestSpaces: ['naims'],
      hasEnterprise: true,
    });
    routeContext.request.body = {
      ...routeContext.request.body,
      isAgentSharding: true,
    };
    const create = stubDownstream();

    await addPrivateLocationRoute().handler(routeContext);

    expect(response.badRequest).not.toHaveBeenCalled();
    expect(response.forbidden).not.toHaveBeenCalled();
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({ isAgentSharding: true }),
      expect.any(String)
    );
  });

  it('rejects creating a sharded location without an Enterprise license', async () => {
    const { routeContext, response } = makeRouteContext({
      policySpaceIds: [ALL_SPACES_ID],
      requestSpaces: ['naims'],
    });
    routeContext.request.body = {
      ...routeContext.request.body,
      isAgentSharding: true,
    };
    const create = stubDownstream();
    response.forbidden.mockReturnValue({ statusCode: 403 } as any);

    const result = await addPrivateLocationRoute().handler(routeContext);

    expect(result).toEqual({ statusCode: 403 });
    expect(response.forbidden).toHaveBeenCalledWith(
      expect.objectContaining({
        body: expect.objectContaining({
          message: expect.stringContaining('Enterprise license'),
        }),
      })
    );
    expect(create).not.toHaveBeenCalled();
  });

  it('bypasses the containment check when the agent policy is all-spaces', async () => {
    const { routeContext, response } = makeRouteContext({
      policySpaceIds: [ALL_SPACES_ID],
      requestSpaces: ['naims'],
    });
    stubDownstream();

    await addPrivateLocationRoute().handler(routeContext);

    expect(response.badRequest).not.toHaveBeenCalled();
  });
});

describe('PrivateLocationRepository.getLocationSpaces', () => {
  const repo = () =>
    new PrivateLocationRepository({
      server: { coreStart: { savedObjects: { createInternalRepository: jest.fn() } } },
    } as any);

  it('returns locationSpaces when provided', () => {
    expect(
      repo().getLocationSpaces({ locationSpaces: ['a', 'b'], agentPolicySpaces: ['default'] })
    ).toEqual(['a', 'b']);
  });

  it('falls back to agentPolicySpaces when locationSpaces is empty', () => {
    expect(
      repo().getLocationSpaces({ locationSpaces: [], agentPolicySpaces: ['default'] })
    ).toEqual(['default']);
  });

  it('falls back to agentPolicySpaces when locationSpaces is undefined', () => {
    expect(repo().getLocationSpaces({ agentPolicySpaces: ['default'] })).toEqual(['default']);
  });
});

describe('PrivateLocationSchema isAgentSharding', () => {
  const base = { label: 'loc', agentPolicyId: 'ap' };

  it('accepts a boolean flag', () => {
    expect(PrivateLocationSchema.validate({ ...base, isAgentSharding: true })).toEqual(
      expect.objectContaining({ isAgentSharding: true })
    );
    expect(PrivateLocationSchema.validate({ ...base, isAgentSharding: false })).toEqual(
      expect.objectContaining({ isAgentSharding: false })
    );
  });

  it('allows omitting the flag so existing clients stay classic', () => {
    expect(PrivateLocationSchema.validate(base).isAgentSharding).toBeUndefined();
  });

  it('rejects a non-boolean flag', () => {
    expect(() => PrivateLocationSchema.validate({ ...base, isAgentSharding: 'yes' })).toThrow();
  });
});
