/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { savedObjectsRepositoryMock } from '@kbn/core/server/mocks';
import {
  assertFlowOwnership,
  createObservabilityOnboardingInternalRepository,
  getCurrentUsername,
} from './flow_ownership';
import { OBSERVABILITY_ONBOARDING_STATE_SAVED_OBJECT_TYPE } from '../../saved_objects/observability_onboarding_status';
import type { ObservabilityOnboardingRequestHandlerContext } from '../../types';
import type { SavedObservabilityOnboardingFlow } from '../../saved_objects/observability_onboarding_status';

const createContext = (
  user: { username?: string; api_key?: { id: string } } | null
): ObservabilityOnboardingRequestHandlerContext =>
  ({
    core: Promise.resolve({
      security: {
        authc: {
          getCurrentUser: () => user,
        },
      },
    }),
  } as unknown as ObservabilityOnboardingRequestHandlerContext);

const createFlow = (createdBy?: string, apiKeyId?: string): SavedObservabilityOnboardingFlow => ({
  id: 'flow-id',
  updatedAt: 1,
  type: 'autoDetect',
  createdBy,
  apiKeyId,
  state: undefined,
  progress: {},
});

describe('getCurrentUsername', () => {
  it('returns the current username from core route context', async () => {
    await expect(getCurrentUsername(createContext({ username: 'alice' }))).resolves.toBe('alice');
  });

  it('returns undefined when the current user is missing', async () => {
    await expect(getCurrentUsername(createContext(null))).resolves.toBeUndefined();
  });
});

describe('assertFlowOwnership', () => {
  it('allows the flow creator', async () => {
    await expect(
      assertFlowOwnership({
        context: createContext({ username: 'alice' }),
        flow: createFlow('alice'),
      })
    ).resolves.toBeUndefined();
  });

  it('hides a flow from a different user', async () => {
    await expect(
      assertFlowOwnership({
        context: createContext({ username: 'bob' }),
        flow: createFlow('alice'),
      })
    ).rejects.toMatchObject({ output: { statusCode: 404 } });
  });

  it('hides a flow when current user is absent', async () => {
    await expect(
      assertFlowOwnership({ context: createContext(null), flow: createFlow('alice') })
    ).rejects.toMatchObject({ output: { statusCode: 404 } });
  });

  it('hides legacy flows without createdBy', async () => {
    await expect(
      assertFlowOwnership({ context: createContext({ username: 'alice' }), flow: createFlow() })
    ).rejects.toMatchObject({ output: { statusCode: 404 } });
  });

  it('allows a request whose api key id matches the flow', async () => {
    await expect(
      assertFlowOwnership({
        context: createContext({ username: 'terminal', api_key: { id: 'key-1' } }),
        flow: createFlow('alice', 'key-1'),
      })
    ).resolves.toBeUndefined();
  });

  it('hides a flow from a request with a different api key id', async () => {
    await expect(
      assertFlowOwnership({
        context: createContext({ username: 'terminal', api_key: { id: 'key-2' } }),
        flow: createFlow('alice', 'key-1'),
      })
    ).rejects.toMatchObject({ output: { statusCode: 404 } });
  });

  it('does not treat an unset flow api key id as a match', async () => {
    await expect(
      assertFlowOwnership({
        context: createContext({ api_key: { id: 'key-1' } }),
        flow: createFlow('alice'),
      })
    ).rejects.toMatchObject({ output: { statusCode: 404 } });
  });
});

describe('createObservabilityOnboardingInternalRepository', () => {
  it('includes the hidden onboarding flow saved-object type', () => {
    const repo = savedObjectsRepositoryMock.create();
    const coreStart = {
      savedObjects: {
        createInternalRepository: jest.fn().mockReturnValue(repo),
      },
    };

    expect(createObservabilityOnboardingInternalRepository(coreStart as never)).toBe(repo);
    expect(coreStart.savedObjects.createInternalRepository).toHaveBeenCalledWith([
      OBSERVABILITY_ONBOARDING_STATE_SAVED_OBJECT_TYPE,
    ]);
  });
});
