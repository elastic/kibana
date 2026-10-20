/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsClientContract } from '@kbn/core/server';
import { saveObservabilityOnboardingFlow } from './save_observability_onboarding_flow';
import { OBSERVABILITY_ONBOARDING_STATE_SAVED_OBJECT_TYPE } from '../../saved_objects/observability_onboarding_status';

const flow = {
  type: 'autoDetect' as const,
  createdBy: 'alice',
  state: undefined,
  progress: {},
};

describe('saveObservabilityOnboardingFlow', () => {
  it('creates a flow with createdBy', async () => {
    const savedObjectsClient = {
      create: jest.fn().mockResolvedValue({
        id: 'flow-id',
        updated_at: '2026-07-07T00:00:00.000Z',
      }),
    } as unknown as SavedObjectsClientContract;

    const saved = await saveObservabilityOnboardingFlow({
      savedObjectsClient,
      observabilityOnboardingState: flow,
    });

    expect(savedObjectsClient.create).toHaveBeenCalledWith(
      OBSERVABILITY_ONBOARDING_STATE_SAVED_OBJECT_TYPE,
      flow
    );
    expect(saved.createdBy).toBe('alice');
  });

  it('updates a flow without dropping createdBy', async () => {
    const savedObjectsClient = {
      update: jest.fn().mockResolvedValue({
        id: 'flow-id',
        updated_at: '2026-07-07T00:00:00.000Z',
      }),
    } as unknown as SavedObjectsClientContract;

    await saveObservabilityOnboardingFlow({
      savedObjectsClient,
      savedObjectId: 'flow-id',
      observabilityOnboardingState: {
        ...flow,
        progress: {
          'ea-download': {
            status: 'complete',
          },
        },
      },
    });

    expect(savedObjectsClient.update).toHaveBeenCalledWith(
      OBSERVABILITY_ONBOARDING_STATE_SAVED_OBJECT_TYPE,
      'flow-id',
      {
        type: 'autoDetect',
        createdBy: 'alice',
        state: undefined,
        progress: {
          'ea-download': {
            status: 'complete',
          },
        },
      }
    );
  });
});
