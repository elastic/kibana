/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ApiClientFixture } from '@kbn/scout-security';
import type { KbnClient } from '@kbn/kbn-client';
import {
  createApi,
  createApiFromKbnClient,
  listWorkers,
  patchWorker,
  seedStubModel,
  setAlertZeroEnabledInSpace,
  type AlertZeroApi,
} from './helpers';

/** Space-id namespace so every throwaway space this suite creates is identifiable. */
const NAMESPACE = 'scout-onb';

const randomSuffix = (): string =>
  `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

/** Minimal spaces surface the specs rely on (satisfied by scout's apiServices.spaces). */
export interface SpacesService {
  create: (args: { id: string; name: string }) => Promise<unknown>;
  delete: (id: string) => Promise<unknown>;
}

export interface OnboardingSpace {
  spaceId: string;
  api: AlertZeroApi;
  stub?: { connectorId: string; cleanup: () => Promise<void> };
  cleanup: () => Promise<void>;
}

/**
 * Creates an isolated space with the per-space gate on, optionally seeding the stub
 * model. Cleanup disables every enabled worker first (best-effort; the space deletion
 * is the hard isolation anyway), then removes the stub connector and the space.
 */
export const createOnboardingSpace = async (
  apiClient: ApiClientFixture,
  spaces: SpacesService,
  cookieHeader: Record<string, string>,
  { withStubModel = false }: { withStubModel?: boolean } = {}
): Promise<OnboardingSpace> => {
  const spaceId = `${NAMESPACE}-${randomSuffix()}`;
  await spaces.create({ id: spaceId, name: `Onboarding ${spaceId}` });

  const api = createApi(apiClient, cookieHeader);
  // Worker routes 404 until the per-space gate is on; seeding and every later
  // spec depend on it.
  await setAlertZeroEnabledInSpace(api, spaceId, true);
  const stub = withStubModel ? await seedStubModel(api, spaceId) : undefined;

  return {
    spaceId,
    api,
    stub: stub ? { connectorId: stub.connectorId, cleanup: stub.cleanup } : undefined,
    cleanup: async () => {
      const failures: string[] = [];
      const step = async (name: string, run: () => Promise<unknown>) => {
        try {
          await run();
        } catch (error) {
          failures.push(`${name}: ${error instanceof Error ? error.message : String(error)}`);
        }
      };
      await step('disable workers', () => resetOnboardingState(api, spaceId));
      if (stub) await step('stub model cleanup', stub.cleanup);
      await step(`delete space ${spaceId}`, () => spaces.delete(spaceId));
      if (failures.length > 0) {
        throw new Error(`Onboarding space cleanup failed:\n${failures.join('\n')}`);
      }
    },
  };
};

/**
 * UI-suite twin of `createOnboardingSpace`: same space lifecycle, but on scout's
 * `kbnClient` (admin basic auth, auto xsrf/internal-origin headers) via
 * `createApiFromKbnClient`. `spaces` comes from the worker-scope `apiServices`.
 */
export const createUiOnboardingSpace = async (
  kbnClient: KbnClient,
  spaces: SpacesService,
  { withStubModel = false }: { withStubModel?: boolean } = {}
): Promise<OnboardingSpace> => {
  const api = createApiFromKbnClient(kbnClient);
  const spaceId = `${NAMESPACE}-${randomSuffix()}`;
  await spaces.create({ id: spaceId, name: `Onboarding ${spaceId}` });

  await setAlertZeroEnabledInSpace(api, spaceId, true);
  const stub = withStubModel ? await seedStubModel(api, spaceId) : undefined;

  return {
    spaceId,
    api,
    stub: stub ? { connectorId: stub.connectorId, cleanup: stub.cleanup } : undefined,
    cleanup: async () => {
      const failures: string[] = [];
      const step = async (name: string, run: () => Promise<unknown>) => {
        try {
          await run();
        } catch (error) {
          failures.push(`${name}: ${error instanceof Error ? error.message : String(error)}`);
        }
      };
      await step('disable workers', () => resetOnboardingState(api, spaceId));
      if (stub) await step('stub model cleanup', stub.cleanup);
      await step(`delete space ${spaceId}`, () => spaces.delete(spaceId));
      if (failures.length > 0) {
        throw new Error(`Onboarding space cleanup failed:\n${failures.join('\n')}`);
      }
    },
  };
};

/**
 * Drives the space back to "onboarding shown": every enabled worker disabled.
 * 404-tolerant — reset runs against partial states by design.
 */
export const resetOnboardingState = async (api: AlertZeroApi, spaceId: string): Promise<void> => {
  const workers = await listWorkers(api, spaceId).catch(() => [] as WorkerInfoLike[]);
  for (const worker of workers) {
    if (worker.enabled) {
      await patchWorker(api, spaceId, worker.id, { enabled: false }).catch(() => undefined);
    }
  }
};

interface WorkerInfoLike {
  id: string;
  enabled: boolean;
}
