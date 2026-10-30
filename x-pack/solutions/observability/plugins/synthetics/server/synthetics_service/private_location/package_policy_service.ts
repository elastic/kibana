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
import type { SyntheticsServerSetup } from '../../types';
import { scheduleAgentPolicyRevisionBumps } from './agent_policy_revision_bump_task';
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
}

const getSpaceSoClientFor = (server: SyntheticsServerSetup, spaceId: string) =>
  server.coreStart.savedObjects.getUnsafeInternalClient().asScopedToNamespace(spaceId);

const getInternalEsClientFor = (server: SyntheticsServerSetup) =>
  server.coreStart.elasticsearch.client.asInternalUser;

export class PackagePolicyService {
  private readonly server: SyntheticsServerSetup;

  constructor(_server: SyntheticsServerSetup) {
    this.server = _server;
  }

  private getSpaceSoClient(spaceId: string) {
    return getSpaceSoClientFor(this.server, spaceId);
  }

  /**
   * Bumps every agent policy collected in `deferredBumps` (see the write
   * methods), once each. Callers that pass `deferredBumps` must call this when
   * done, also on failure: those package policies were written with
   * `bumpRevision: false`, so Fleet does not redeploy them until this runs.
   */
  async scheduleRevisionBumps(deferredBumps: Set<string>): Promise<void> {
    const policyIds = [...deferredBumps];
    deferredBumps.clear();
    await scheduleAgentPolicyRevisionBumps(this.server, policyIds);
  }

  private async scheduleOrDeferRevisionBumps(
    policyIds: string[],
    { deferredBumps, immediate }: { deferredBumps?: Set<string>; immediate?: boolean }
  ): Promise<void> {
    if (deferredBumps) {
      policyIds.forEach((policyId) => deferredBumps.add(policyId));
      return;
    }
    await scheduleAgentPolicyRevisionBumps(this.server, policyIds, { immediate });
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

  /**
   * Every write below goes out with `bumpRevision: false` and hands its agent
   * policies to {@link scheduleAgentPolicyRevisionBumps}, so a burst of monitor
   * writes redeploys each agent policy once instead of once per write.
   */
  async bulkCreate({
    newPolicies,
    spaceId,
    deferredBumps,
    immediate,
  }: {
    newPolicies: NewPackagePolicyWithId[];
    spaceId: string;
    /** Collects the agent policy ids to bump instead of bumping them now. */
    deferredBumps?: Set<string>;
    /** Skips the batching window, for writes an agent should pick up right away (Test Now). */
    immediate?: boolean;
  }) {
    if (newPolicies.length === 0) {
      return { created: [], failed: [] };
    }

    const res = await Promise.all(
      (
        await this.getDefaultAndSpacePackagePolicies({ policies: newPolicies, spaceId })
      ).map(async ({ client, policies }) => {
        const result = await this.server.fleet.packagePolicyService.bulkCreate(
          client,
          this.getInternalEsClient(),
          policies,
          { asyncDeploy: true, bumpRevision: false }
        );
        await this.scheduleOrDeferRevisionBumps(
          result.created.flatMap(({ policy_ids: policyIds }) => policyIds),
          { deferredBumps, immediate }
        );
        return result;
      })
    );

    return {
      created: res.flatMap((r) => r.created),
      failed: res.flatMap((r) => r.failed),
    };
  }

  async bulkUpdate({
    policiesToUpdate,
    spaceId,
    deferredBumps,
  }: {
    policiesToUpdate: UpdatePackagePolicyWithId[];
    spaceId: string;
    /** Collects the agent policy ids to bump instead of bumping them now. */
    deferredBumps?: Set<string>;
  }) {
    if (policiesToUpdate.length === 0) {
      return [];
    }

    const res = await Promise.all(
      (
        await this.getDefaultAndSpacePackagePolicies({ policies: policiesToUpdate, spaceId })
      ).map(async ({ client, policies }) => {
        const result = await this.server.fleet.packagePolicyService.bulkUpdate(
          client,
          this.getInternalEsClient(),
          policies,
          { force: true, asyncDeploy: true, bumpRevision: false }
        );
        await this.scheduleOrDeferRevisionBumps(
          result.updatedPolicies?.flatMap(({ policy_ids: policyIds }) => policyIds) ?? [],
          { deferredBumps }
        );
        return result;
      })
    );
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
   * a condition-sharded (scalable) location.
   *
   * Writes through Fleet's `bulkUpdatePartial` rather than `bulkUpdate`: only
   * `condition` (plus the revision metadata) changes, so the package lookup,
   * validation, secret handling, input compilation and callbacks that
   * `bulkUpdate` runs have nothing to act on here. `bulkUpdatePartial` also
   * skips agent-policy deployment, which the scheduled revision bump owns.
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

    await scheduleAgentPolicyRevisionBumps(
      this.server,
      updatedPolicies.flatMap(({ id }) => agentPolicyIdsByPackagePolicyId.get(id) ?? [])
    );

    return failedPolicies;
  }

  async bulkDelete({
    policyIdsToDelete,
    spaceId,
    deferredBumps,
  }: {
    policyIdsToDelete: string[];
    spaceId: string;
    /** Collects the agent policy ids to bump instead of bumping them now. */
    deferredBumps?: Set<string>;
  }) {
    if (policyIdsToDelete.length === 0) {
      return;
    }

    const res = await Promise.all(
      (
        await this.getDefaultAndSpacePackagePolicies({
          policies: await this.getByIds({
            spaceId,
            packagePolicyIds: policyIdsToDelete,
            fields: ['name', 'policy_ids'],
          }),
          spaceId,
        })
      ).map(async ({ client, policies }) => {
        const result = await this.server.fleet.packagePolicyService.delete(
          client,
          this.getInternalEsClient(),
          policies.flatMap(({ id }) => (id ? [id] : [])),
          { force: true, asyncDeploy: true, bumpRevision: false }
        );
        await this.scheduleOrDeferRevisionBumps(
          result.flatMap(({ success, policy_ids: policyIds }) => (success ? policyIds ?? [] : [])),
          { deferredBumps }
        );
        return result;
      })
    );
    return res.flat();
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
    // Dedupe by reference, not id: Test Now policies have no id until Fleet assigns one.
    const defaultSpacePackagePolicies = new Set<T>();
    const spacePackagePolicies = new Set<T>();

    for (const pkgPolicy of policies) {
      if (pkgPolicy.policy_ids && pkgPolicy.policy_ids.length > 0) {
        pkgPolicy.policy_ids.forEach((policyId) => {
          const agentPolicy = agentPolicyById.get(policyId);
          if (
            agentPolicy?.space_ids?.includes(spaceId) ||
            agentPolicy?.space_ids?.includes(ALL_SPACES_ID)
          ) {
            spacePackagePolicies.add(pkgPolicy);
          } else {
            defaultSpacePackagePolicies.add(pkgPolicy);
          }
        });
      } else {
        defaultSpacePackagePolicies.add(pkgPolicy);
      }
    }

    const res: {
      client: SavedObjectsClientContract;
      policies: T[];
    }[] = [];

    if (defaultSpacePackagePolicies.size > 0) {
      res.push({ client: defaultSpaceSoClient, policies: [...defaultSpacePackagePolicies] });
    }
    if (spacePackagePolicies.size > 0) {
      res.push({ client: spaceSoClient, policies: [...spacePackagePolicies] });
    }

    return res;
  }
}
