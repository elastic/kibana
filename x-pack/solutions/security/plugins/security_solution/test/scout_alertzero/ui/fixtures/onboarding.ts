/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ApiClientFixture, EsClient } from '@kbn/scout-security';
import type { KbnClient } from '@kbn/kbn-client';
import { buildServiceAccountUrl } from '@kbn/alertzero-common';
import {
  createApi,
  createApiFromKbnClient,
  createWorkerServiceAccount,
  listWorkers,
  ok,
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
      await step('delete worker service accounts', () => deleteWorkerServiceAccounts(api, spaceId));
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
      await step('delete worker service accounts', () => deleteWorkerServiceAccounts(api, spaceId));
      if (stub) await step('stub model cleanup', stub.cleanup);
      await step(`delete space ${spaceId}`, () => spaces.delete(spaceId));
      if (failures.length > 0) {
        throw new Error(`Onboarding space cleanup failed:\n${failures.join('\n')}`);
      }
    },
  };
};

/**
 * Enables one worker through the same API shape the onboarding UI's save uses
 * (service account + settingsRevision), so the landing page latches to the
 * queue instead of the wizard. Returns the service-account cleanup.
 */
export const enableFirstWorker = async (space: OnboardingSpace): Promise<() => Promise<void>> => {
  const workers = await listWorkers(space.api, space.spaceId);
  const target = workers[0];
  const account = await createWorkerServiceAccount(space.api, target.id);
  ok(
    await patchWorker(space.api, space.spaceId, target.id, {
      enabled: true,
      settingsRevision: target.settingsRevision ?? null,
      settings: { serviceAccountId: account.id },
    }),
    `enable ${target.id}`
  );
  return account.cleanup;
};

/**
 * Drives the space back to "onboarding shown": every enabled worker disabled.
 * Reset runs against partial states by design, so an already-gone worker (404)
 * is tolerated — but every other failure surfaces: the API adapters resolve
 * non-2xx as values, so a swallowed list/PATCH failure would otherwise let
 * cleanup report a successful reset that disabled nothing (e.g. leaving
 * deployment-scoped Hunt supply workflows enabled).
 */
export const resetOnboardingState = async (api: AlertZeroApi, spaceId: string): Promise<void> => {
  const workers = await listWorkers(api, spaceId);
  const failures: string[] = [];
  for (const worker of workers) {
    if (worker.enabled) {
      const result = await patchWorker(api, spaceId, worker.id, { enabled: false });
      if (result.statusCode !== 200 && result.statusCode !== 404) {
        failures.push(`disable ${worker.id}: ${result.statusCode} ${JSON.stringify(result.body)}`);
      }
    }
  }
  if (failures.length > 0) {
    throw new Error(`Reset of ${spaceId} failed:\n${failures.join('\n')}`);
  }
};

/**
 * Deletes the service accounts referenced by this space's workers. Service
 * accounts and their credentials are cluster-scoped and survive space deletion,
 * so without this step every enable (whether driven by the onboarding UI or the
 * API fixtures) leaks a uniquely named global account. The space is throwaway,
 * so any account a worker references here was created by this run — deleting by
 * the referenced IDs can never touch a pre-existing account.
 */
const deleteWorkerServiceAccounts = async (api: AlertZeroApi, spaceId: string): Promise<void> => {
  const workers = await listWorkers(api, spaceId);
  const accountIds = [
    ...new Set(
      workers
        .map((worker) => worker.settings?.serviceAccountId)
        .filter((id): id is string => Boolean(id))
    ),
  ];
  const failures: string[] = [];
  for (const accountId of accountIds) {
    const deleted = await api.internal('DELETE', `${buildServiceAccountUrl(accountId)}?force=true`);
    // 404 = another run (or the spec's own account cleanup) already removed it.
    if (deleted.statusCode !== 200 && deleted.statusCode !== 204 && deleted.statusCode !== 404) {
      failures.push(
        `delete service account ${accountId}: ${deleted.statusCode} ${JSON.stringify(deleted.body)}`
      );
    }
  }
  if (failures.length > 0) {
    throw new Error(`Service account cleanup failed:\n${failures.join('\n')}`);
  }
};

/** Backing index and alias of the shared proposals store (`@kbn/proposals-common`). */
const PROPOSALS_INDEX = '.kibana-proposals';
const PROPOSALS_BACKING_INDEX = `${PROPOSALS_INDEX}-000001`;

export interface SeededProposal {
  id: string;
  title: string;
  decidedAt: string;
}

/** Minimal `ProposalDocument` (storage shape of `proposals_storage.ts`) for a settled row. */
interface ClosedProposalDoc {
  spaceId: string;
  conversationId: string;
  title: string;
  comment: string;
  status: 'succeeded';
  decision: 'approved';
  rootProposalId: string;
  revision: number;
  impact: 'low' | 'medium' | 'high' | 'critical';
  confidence: 'low' | 'medium' | 'high';
  origin: 'alertzero';
  decidedAt: string;
  createdAt: string;
  ranks: { impact: number; confidence: number };
}

/** Impact/confidence → numeric sort rank, mirroring `sort_ranks.ts` (`3 - rankIndex`). */
const RANKS = {
  impact: { critical: 0, high: 1, medium: 2, low: 3 },
  confidence: { high: 0, medium: 1, low: 2 },
} as const;

/**
 * Writes one settled AlertZero proposal straight to the proposals index, bypassing the
 * create/decide workflow so the test controls `decidedAt` to the minute. The index is
 * shared and the alias may not exist yet on a fresh boot; both are created idempotently
 * with the storage adapter's mappings so a later server write never sees a conflict.
 *
 * `decidedAtHoursAgo` is fractional (e.g. `71` vs `73` around the 72h window edge).
 */
export const seedClosedProposal = async (
  esClient: EsClient,
  spaceId: string,
  { title, decidedAtHoursAgo, id }: { title: string; decidedAtHoursAgo: number; id?: string }
): Promise<SeededProposal> => {
  const proposalId =
    id ?? `scout-closed-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  const decidedAt = new Date(Date.now() - decidedAtHoursAgo * 3_600_000).toISOString();
  const createdAt = new Date(Date.now() - (decidedAtHoursAgo + 2) * 3_600_000).toISOString();

  const doc: ClosedProposalDoc = {
    spaceId,
    conversationId: `scout-conv-${proposalId}`,
    title,
    comment: `Seeded closed proposal ${title}`,
    status: 'succeeded',
    decision: 'approved',
    rootProposalId: proposalId,
    revision: 1,
    impact: 'medium',
    confidence: 'medium',
    origin: 'alertzero',
    decidedAt,
    createdAt,
    ranks: { impact: RANKS.impact.medium, confidence: RANKS.confidence.medium },
  };

  // Create backing index + alias on first use. The mappings mirror
  // `proposals_storage.ts` loosely (all types the closed-list query reads);
  // ES dynamic mapping would also accept the doc, but explicit mappings keep
  // a later adapter write from hitting a mapping conflict.
  const aliasExists = await esClient.indices.existsAlias({ name: PROPOSALS_INDEX });
  if (!aliasExists) {
    await esClient.indices.create({
      index: PROPOSALS_BACKING_INDEX,
      aliases: { [PROPOSALS_INDEX]: { is_write_index: true } },
      mappings: {
        properties: {
          spaceId: { type: 'keyword' },
          conversationId: { type: 'keyword' },
          title: { type: 'text' },
          comment: { type: 'text' },
          status: { type: 'keyword' },
          decision: { type: 'keyword' },
          supersededBy: { type: 'keyword' },
          rootProposalId: { type: 'keyword' },
          supersedes: { type: 'keyword' },
          revision: { type: 'long' },
          impact: { type: 'keyword' },
          confidence: { type: 'keyword' },
          category: { type: 'keyword' },
          origin: { type: 'keyword' },
          expiresAt: { type: 'date' },
          ranks: {
            properties: { impact: { type: 'byte' }, confidence: { type: 'byte' } },
          },
          decidedBy: {
            properties: {
              username: { type: 'keyword' },
              fullName: { type: 'keyword' },
              email: { type: 'keyword' },
              profileUid: { type: 'keyword' },
            },
          },
          decidedAt: { type: 'date' },
          dismissReason: { type: 'keyword' },
          rationale: { type: 'text' },
          executionError: { type: 'text' },
          previousExecutionError: { type: 'text' },
          workflowExecutionId: { type: 'keyword' },
          createdAt: { type: 'date' },
        },
      },
    });
  }

  await esClient.index({
    index: PROPOSALS_INDEX,
    id: proposalId,
    document: doc,
    refresh: 'wait_for',
  });

  return { id: proposalId, title, decidedAt };
};

/** Deletes seeded proposals by id (404-tolerant; space deletion is the hard backstop). */
export const deleteSeededProposals = async (esClient: EsClient, ids: string[]): Promise<void> => {
  if (ids.length === 0) return;
  await esClient.deleteByQuery({
    index: PROPOSALS_INDEX,
    query: { ids: { values: ids } },
    refresh: true,
    ignore_unavailable: true,
    conflicts: 'proceed',
  });
};
