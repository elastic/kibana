/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { NewPackagePolicyWithId } from '@kbn/fleet-plugin/server/services/package_policy';
import type { PartialPackagePolicy } from '@kbn/fleet-plugin/server';
import type { PackagePolicy, UpdatePackagePolicyWithId } from '@kbn/fleet-plugin/common';
import { DEFAULT_SPACE_ID } from '@kbn/core-spaces-common';
import { ALL_SPACES_ID } from '@kbn/spaces-plugin/common/constants';
import type { SavedObjectsClientContract } from '@kbn/core/server';
import { uniqBy } from 'lodash';
import type { SyntheticsServerSetup } from '../../types';
import { AgentPolicyRevisionBatcher } from './agent_policy_revision_batcher';
import type { ConditionUpdate, ShardedPackagePolicy } from './rebalance_writes';
import { SHARDED_PACKAGE_POLICY_FIELDS } from './rebalance_writes';

interface GetByIdsOptions {
  spaceId: string;
  packagePolicyIds: string[];
  /**
   * Extra spaces to look in alongside `spaceId` (and the default space).
   * Use this when callers need a cross-space view — e.g. the monitor health
   * API, which reports on monitors that may live in any space.
   */
  additionalSpaceIds?: string[];
}

interface PackagePolicyWithAgentPolicyIds {
  id?: string;
  policy_ids?: string[];
  condition?: string | null;
}

const getSpaceSoClientFor = (server: SyntheticsServerSetup, spaceId: string) =>
  server.coreStart.savedObjects.getUnsafeInternalClient().asScopedToNamespace(spaceId);

const getInternalEsClientFor = (server: SyntheticsServerSetup) =>
  server.coreStart.elasticsearch.client.asInternalUser;

/**
 * Bumps one agent policy's revision, scoping the write to a space the agent
 * policy actually lives in.
 *
 * A batch coalesces writes for the same agent policy across spaces, so no
 * requesting client is the right one to bump with: whichever scheduled first
 * would pick the namespace for every coalesced write. That client is not
 * guaranteed to resolve the agent policy — {@link PackagePolicyService.bulkUpdateInSpace}
 * scopes to each package policy's own recorded space, which can diverge from
 * its agent policy's spaces — and a namespace miss throws a non-conflict (404)
 * error, which is not retried and rejects every waiter in the batch, failing
 * monitor writes whose package policies already persisted. So resolve the space
 * from the agent policy itself: `spaceId: ALL_SPACES_ID` on an unscoped client
 * finds it wherever it lives (agent policies are `namespaceType: 'multiple'`,
 * so the write itself still needs a single concrete namespace).
 *
 * Uses `createInternalRepository()`, not `getUnsafeInternalClient()`: the
 * latter always attaches a spaces extension backed by a synthetic, headerless
 * request (core has no real request to attach here — this runs off a
 * `setTimeout`, not an HTTP handler), and resolving the `*` namespace made
 * that extension issue an ES `_has_privileges` check with no credentials,
 * failing every scalable-location write outright. `createInternalRepository()`
 * attaches no extensions, matching {@link listByAgentPolicy}'s existing
 * cross-space Fleet lookup in this same file.
 */
const bumpAgentPolicyRevision = async (
  server: SyntheticsServerSetup,
  policyId: string
): Promise<void> => {
  const unscopedSoClient = server.coreStart.savedObjects.createInternalRepository();
  const [agentPolicy] = await server.fleet.agentPolicyService.getByIds(
    unscopedSoClient,
    [{ id: policyId, spaceId: ALL_SPACES_ID }],
    { ignoreMissing: true, fields: ['name'] }
  );
  const spaceIds = agentPolicy?.space_ids ?? [];
  // Prefer the default space when the policy is there (or is all-spaces): it
  // matches the create/edit routing fallback, and an all-spaces policy cannot
  // be written through a literal `*` namespace.
  const bumpSpaceId =
    spaceIds.length === 0 || spaceIds.includes(DEFAULT_SPACE_ID) || spaceIds.includes(ALL_SPACES_ID)
      ? DEFAULT_SPACE_ID
      : spaceIds[0];

  await server.fleet.agentPolicyService.bumpRevision(
    getSpaceSoClientFor(server, bumpSpaceId),
    getInternalEsClientFor(server),
    policyId,
    { asyncDeploy: true }
  );
};

/**
 * One batcher per server, not per {@link PackagePolicyService}.
 *
 * Coalescing only works among writes that share a batcher, and instances are
 * constructed ad hoc (e.g. the monitor-create rollback in `add_monitor_api`),
 * so a per-instance batcher would let those writes race the main CRUD path on
 * the same agent policy — the version-conflict storm this batching exists to
 * prevent. Keyed on the server object rather than a module singleton so tests
 * (and any future multi-server setup) stay isolated, and weakly so a discarded
 * server does not pin its batcher.
 */
const revisionBatchersByServer = new WeakMap<SyntheticsServerSetup, AgentPolicyRevisionBatcher>();

const getRevisionBatcher = (server: SyntheticsServerSetup): AgentPolicyRevisionBatcher => {
  const existing = revisionBatchersByServer.get(server);
  if (existing) {
    return existing;
  }

  const batcher = new AgentPolicyRevisionBatcher({
    logger: server.logger,
    bumpRevision: (policyId) => bumpAgentPolicyRevision(server, policyId),
  });
  revisionBatchersByServer.set(server, batcher);
  return batcher;
};

/**
 * Runs any batched agent-policy revision bumps still waiting out their debounce
 * window. Call from the plugin's `stop()`: package policies are written with
 * `bumpRevision: false`, so a batch dropped at shutdown leaves them undeployed.
 */
export const flushPendingAgentPolicyRevisionBumps = async (
  server: SyntheticsServerSetup
): Promise<void> => {
  await revisionBatchersByServer.get(server)?.flushPending();
};

export class PackagePolicyService {
  private readonly server: SyntheticsServerSetup;
  private readonly revisionBatcher: AgentPolicyRevisionBatcher;

  constructor(_server: SyntheticsServerSetup) {
    this.server = _server;
    this.revisionBatcher = getRevisionBatcher(_server);
  }

  private getSpaceSoClient(spaceId: string) {
    return getSpaceSoClientFor(this.server, spaceId);
  }

  private getInternalEsClient() {
    return getInternalEsClientFor(this.server);
  }

  async buildPackagePolicyFromPackage({ spaceId }: { spaceId: string }) {
    return this.server.fleet.packagePolicyService.buildPackagePolicyFromPackage(
      this.getSpaceSoClient(spaceId),
      'synthetics',
      {
        logger: this.server.logger,
        installMissingPackage: true,
      }
    );
  }

  async inspect({
    spaceId,
    packagePolicy,
  }: {
    spaceId: string;
    packagePolicy: NewPackagePolicyWithId;
  }) {
    return this.server.fleet.packagePolicyService.inspect(
      this.getSpaceSoClient(spaceId),
      packagePolicy
    );
  }

  async getByIds(options: GetByIdsOptions & { fields: string[] }): Promise<PartialPackagePolicy[]>;
  async getByIds(options: GetByIdsOptions): Promise<PackagePolicy[]>;
  async getByIds({
    spaceId,
    packagePolicyIds,
    additionalSpaceIds,
    fields,
  }: GetByIdsOptions & { fields?: string[] }): Promise<PackagePolicy[] | PartialPackagePolicy[]> {
    // For legacy reasons, we always include the default space in addition to
    // the request's space (older package policies were created there).
    const spaceIds = [...new Set([spaceId, DEFAULT_SPACE_ID, ...(additionalSpaceIds ?? [])])];
    const soClient = this.server.coreStart.savedObjects.getUnsafeInternalClient();

    if (fields) {
      return this.server.fleet.packagePolicyService.getByIDs(soClient, packagePolicyIds, {
        ignoreMissing: true,
        spaceIds,
        fields,
      });
    }

    return this.server.fleet.packagePolicyService.getByIDs(soClient, packagePolicyIds, {
      ignoreMissing: true,
      spaceIds,
    });
  }

  /**
   * All synthetics package policies bound to a location's Fleet agent policy,
   * across every space. A scalable private location is backed by a single agent
   * policy, so a targeted `policy_ids` query returns exactly its monitors —
   * far cheaper than scanning the whole synthetics package-policy index and
   * filtering by id suffix in memory (this runs once per location per rebalance
   * cycle, ~1m). Paginated so a location with more than one page of monitors
   * isn't truncated.
   *
   * Source-filtered to {@link SHARDED_PACKAGE_POLICY_FIELDS}: every monitor of
   * the location is held in memory at once here, and the condition-only write
   * this feeds needs none of the policy body. Unprojected, each browser monitor
   * would drag its inline script along in `compiled_stream` for nothing.
   */
  async listByAgentPolicy({
    agentPolicyId,
    signal,
  }: {
    agentPolicyId: string;
    signal?: AbortSignal;
  }): Promise<ShardedPackagePolicy[]> {
    const soClient = this.server.coreStart.savedObjects.createInternalRepository();
    const items: ShardedPackagePolicy[] = [];
    const perPage = 1000;
    let page = 1;
    let hasMore = true;

    while (hasMore) {
      signal?.throwIfAborted();
      const { items: pageItems } = await this.server.fleet.packagePolicyService.list(soClient, {
        kuery: `ingest-package-policies.package.name:synthetics AND ingest-package-policies.policy_ids:"${agentPolicyId}"`,
        spaceId: ALL_SPACES_ID,
        fields: SHARDED_PACKAGE_POLICY_FIELDS,
        page,
        perPage,
      });
      items.push(...pageItems);
      hasMore = pageItems.length === perPage;
      page += 1;
    }

    return items;
  }

  async bulkCreate({
    newPolicies,
    spaceId,
  }: {
    newPolicies: NewPackagePolicyWithId[];
    spaceId: string;
  }) {
    if (newPolicies.length === 0) {
      return { created: [], failed: [] };
    }

    const promises = (
      await this.getDefaultAndSpacePackagePolicies({ policies: newPolicies, spaceId })
    ).flatMap(({ client, policies }) => {
      const { batched, immediate } = this.partitionByRevisionStrategy(policies);

      return [
        ...(immediate.length > 0
          ? [
              this.server.fleet.packagePolicyService.bulkCreate(
                client,
                this.getInternalEsClient(),
                immediate,
                { asyncDeploy: true }
              ),
            ]
          : []),
        ...(batched.length > 0 ? [this.bulkCreateWithBatchedRevision(client, batched)] : []),
      ];
    });

    const res = await Promise.all(promises);

    return {
      created: res.flatMap((r) => r.created),
      failed: res.flatMap((r) => r.failed),
    };
  }

  async bulkUpdate({
    policiesToUpdate,
    spaceId,
  }: {
    policiesToUpdate: UpdatePackagePolicyWithId[];
    spaceId: string;
  }) {
    if (policiesToUpdate.length === 0) {
      return [];
    }

    const promises = (
      await this.getDefaultAndSpacePackagePolicies({ policies: policiesToUpdate, spaceId })
    ).flatMap(({ client, policies }) => {
      const { batched, immediate } = this.partitionByRevisionStrategy(policies);

      return [
        ...(immediate.length > 0
          ? [
              this.server.fleet.packagePolicyService.bulkUpdate(
                client,
                this.getInternalEsClient(),
                immediate,
                { force: true, asyncDeploy: true }
              ),
            ]
          : []),
        ...(batched.length > 0 ? [this.bulkUpdateWithBatchedRevision(client, batched)] : []),
      ];
    });

    const res = await Promise.all(promises);
    return res.flatMap((r) => r.failedPolicies);
  }

  /**
   * Updates package policies that are already known to live in `spaceId`,
   * scoping the SO client straight to that space. Unlike {@link bulkUpdate},
   * this skips the agent-policy-derived space routing in
   * {@link getDefaultAndSpacePackagePolicies}: that routing is meant for the
   * create/edit flow (deciding where a policy *should* live based on its agent
   * policy) and misroutes an existing policy whose recorded space has diverged
   * from its agent policy's spaces — silently dropping the write.
   *
   * Only called by the shard-rebalance task, and only ever with monitors from
   * a condition-sharded (scalable) location, so every write here always goes
   * through the batched revision bump — unlike {@link bulkUpdate}, there's no
   * classic/immediate split to make. Without this, a rebalance cycle's bump
   * races the same agent policy as concurrent monitor CRUD with no retry,
   * so a single version conflict fails the whole cycle's moves outright.
   *
   * Writes through Fleet's `bulkUpdatePartial` rather than `bulkUpdate`: only
   * `condition` (plus the revision metadata) changes, so the package lookup,
   * validation, secret handling, input compilation and callbacks that
   * `bulkUpdate` runs have nothing to act on here. `bulkUpdatePartial` also
   * skips agent-policy deployment, which this path already owns via
   * {@link AgentPolicyRevisionBatcher}.
   */
  async bulkUpdateInSpace({
    policiesToUpdate,
    spaceId,
  }: {
    policiesToUpdate: ConditionUpdate[];
    spaceId: string;
  }) {
    if (policiesToUpdate.length === 0) {
      return [];
    }

    const soClient = this.getSpaceSoClient(spaceId === ALL_SPACES_ID ? DEFAULT_SPACE_ID : spaceId);
    const { updatedPolicies, failedPolicies } =
      await this.server.fleet.packagePolicyService.bulkUpdatePartial(
        soClient,
        policiesToUpdate.map(({ update }) => update)
      );

    // `bulkUpdatePartial` echoes back only the attributes that were sent, so
    // `policy_ids` is absent from its result and the bump targets have to come
    // from the source policies captured alongside each update. Keyed by
    // package-policy id so only writes that actually landed get bumped.
    const agentPolicyIdsByPackagePolicyId = new Map(
      policiesToUpdate.map(({ update, agentPolicyIds }) => [update.id, agentPolicyIds])
    );

    await this.revisionBatcher.schedule(
      updatedPolicies.flatMap(({ id }) => agentPolicyIdsByPackagePolicyId.get(id) ?? [])
    );

    return failedPolicies;
  }

  async bulkDelete({
    policyIdsToDelete,
    spaceId,
  }: {
    policyIdsToDelete: string[];
    spaceId: string;
  }) {
    if (policyIdsToDelete.length === 0) {
      return;
    }

    const promises = (
      await this.getDefaultAndSpacePackagePolicies({
        policies: await this.getByIds({
          spaceId,
          packagePolicyIds: policyIdsToDelete,
          fields: ['name', 'policy_ids', 'condition'],
        }),
        spaceId,
      })
    ).flatMap(({ client, policies }) => {
      const { batched, immediate } = this.partitionByRevisionStrategy(policies);

      return [
        ...(immediate.length > 0
          ? [
              this.server.fleet.packagePolicyService.delete(
                client,
                this.getInternalEsClient(),
                immediate.flatMap(({ id }) => (id ? [id] : [])),
                { force: true, asyncDeploy: true }
              ),
            ]
          : []),
        ...(batched.length > 0 ? [this.bulkDeleteWithBatchedRevision(client, batched)] : []),
      ];
    });

    const res = await Promise.all(promises);
    return res.flat();
  }

  private partitionByRevisionStrategy<T extends PackagePolicyWithAgentPolicyIds>(policies: T[]) {
    const batched: T[] = [];
    const immediate: T[] = [];

    policies.forEach((policy) => {
      // Only scalable private-location policies carry an agent condition. Keep
      // classic private-location revision bumps immediate and unchanged.
      if (typeof policy.condition === 'string') {
        batched.push(policy);
      } else {
        immediate.push(policy);
      }
    });

    return { batched, immediate };
  }

  private async bulkCreateWithBatchedRevision(
    client: SavedObjectsClientContract,
    policies: NewPackagePolicyWithId[]
  ) {
    const result = await this.server.fleet.packagePolicyService.bulkCreate(
      client,
      this.getInternalEsClient(),
      policies,
      { asyncDeploy: true, bumpRevision: false }
    );

    await this.revisionBatcher.schedule(
      result.created.flatMap(({ policy_ids: policyIds }) => policyIds)
    );
    return result;
  }

  private async bulkUpdateWithBatchedRevision(
    client: SavedObjectsClientContract,
    policies: UpdatePackagePolicyWithId[]
  ) {
    const result = await this.server.fleet.packagePolicyService.bulkUpdate(
      client,
      this.getInternalEsClient(),
      policies,
      { force: true, asyncDeploy: true, bumpRevision: false }
    );

    await this.revisionBatcher.schedule(
      result.updatedPolicies?.flatMap(({ policy_ids: policyIds }) => policyIds) ?? []
    );
    return result;
  }

  private async bulkDeleteWithBatchedRevision(
    client: SavedObjectsClientContract,
    policies: PackagePolicyWithAgentPolicyIds[]
  ) {
    const result = await this.server.fleet.packagePolicyService.delete(
      client,
      this.getInternalEsClient(),
      policies.flatMap(({ id }) => (id ? [id] : [])),
      { force: true, asyncDeploy: true, bumpRevision: false }
    );

    await this.revisionBatcher.schedule(
      result.flatMap(({ success, policy_ids: policyIds }) => (success ? policyIds ?? [] : []))
    );
    return result;
  }

  // The agent policies can be in the default space or the spaceId
  // This function returns the package policies that are in the spaceId and the default space and the correct saved objects client to fetch the package policies
  private async getDefaultAndSpacePackagePolicies<T extends PackagePolicyWithAgentPolicyIds>({
    policies,
    spaceId,
  }: {
    policies: T[];
    spaceId: string;
  }): Promise<
    {
      client: SavedObjectsClientContract;
      policies: T[];
    }[]
  > {
    const agentPolicyIds = new Set(policies.flatMap((pkgPolicy) => pkgPolicy.policy_ids ?? []));
    const defaultSpaceSoClient = this.getSpaceSoClient(DEFAULT_SPACE_ID);
    const spaceSoClient = this.getSpaceSoClient(spaceId);
    const clients = [spaceSoClient];

    if (spaceId === DEFAULT_SPACE_ID) {
      return [{ client: defaultSpaceSoClient, policies }];
    } else {
      clients.push(defaultSpaceSoClient);
    }

    const agentPolicies = (
      await Promise.all(
        clients.map((soClient) =>
          this.server.fleet.agentPolicyService.getByIds(soClient, [...agentPolicyIds], {
            ignoreMissing: true,
            fields: ['name'],
          })
        )
      )
    ).flat();

    const agentPolicyById = new Map(agentPolicies.map((ap) => [ap.id, ap]));
    const defaultSpacePackagePolicies: T[] = [];
    const spacePackagePolicies: T[] = [];

    for (const pkgPolicy of policies) {
      if (pkgPolicy.policy_ids && pkgPolicy.policy_ids.length > 0) {
        pkgPolicy.policy_ids.forEach((policyId) => {
          const agentPolicy = agentPolicyById.get(policyId);
          if (
            agentPolicy?.space_ids?.includes(spaceId) ||
            agentPolicy?.space_ids?.includes(ALL_SPACES_ID)
          ) {
            spacePackagePolicies.push(pkgPolicy);
          } else {
            defaultSpacePackagePolicies.push(pkgPolicy);
          }
        });
      } else {
        defaultSpacePackagePolicies.push(pkgPolicy);
      }
    }

    const res: {
      client: SavedObjectsClientContract;
      policies: T[];
    }[] = [];

    if (defaultSpacePackagePolicies.length > 0) {
      res.push({
        client: defaultSpaceSoClient,
        policies: uniqBy(defaultSpacePackagePolicies, 'id'),
      });
    }
    if (spacePackagePolicies.length > 0) {
      res.push({ client: spaceSoClient, policies: uniqBy(spacePackagePolicies, 'id') });
    }

    return res;
  }
}
