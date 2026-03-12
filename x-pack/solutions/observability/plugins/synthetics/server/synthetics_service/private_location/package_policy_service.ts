/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { NewPackagePolicyWithId } from '@kbn/fleet-plugin/server/services/package_policy';
import { DEFAULT_SPACE_ID } from '@kbn/spaces-plugin/common';
import type { SavedObjectsClientContract } from '@kbn/core/server';
import type { SyntheticsServerSetup } from '../../types';

export class PackagePolicyService {
  private readonly server: SyntheticsServerSetup;

  constructor(_server: SyntheticsServerSetup) {
    this.server = _server;
  }

  private getSpaceSoClient(spaceId: string) {
    return this.server.coreStart.savedObjects
      .getUnsafeInternalClient()
      .asScopedToNamespace(spaceId);
  }

  private getInternalEsClient() {
    return this.server.coreStart.elasticsearch.client.asInternalUser;
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

  async getByIds({ spaceId, packagePolicyIds }: { spaceId: string; packagePolicyIds: string[] }) {
    // For legacy reasons, we need to get the package policies from both the space and the default space
    const ids = await Promise.all(
      [this.getSpaceSoClient(spaceId), this.getSpaceSoClient(DEFAULT_SPACE_ID)].map((soClient) =>
        this.server.fleet.packagePolicyService.getByIDs(soClient, packagePolicyIds, {
          ignoreMissing: true,
        })
      )
    );
    return ids.flat();
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
      await this.getDefaultAndSpacePackagePolicies({
        policies: newPolicies,
        spaceId,
      })
    ).map(({ client, policies }) =>
      this.server.fleet.packagePolicyService.bulkCreate(
        client,
        this.getInternalEsClient(),
        policies,
        {
          asyncDeploy: true,
        }
      )
    );

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
    policiesToUpdate: NewPackagePolicyWithId[];
    spaceId: string;
  }) {
    if (policiesToUpdate.length === 0) {
      return [];
    }

    const promises = (
      await this.getDefaultAndSpacePackagePolicies({
        policies: policiesToUpdate,
        spaceId,
      })
    ).map(({ client, policies }) =>
      this.server.fleet.packagePolicyService.bulkUpdate(
        client,
        this.getInternalEsClient(),
        policies,
        {
          force: true,
          asyncDeploy: true,
        }
      )
    );

    const res = await Promise.all(promises);
    return res.flatMap((r) => r.failedPolicies);
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
        policies: await this.getByIds({ spaceId, packagePolicyIds: policyIdsToDelete }),
        spaceId,
      })
    ).map(({ client, policies }) =>
      this.server.fleet.packagePolicyService.delete(
        client,
        this.getInternalEsClient(),
        policies.map((policy) => policy.id!),
        {
          force: true,
          asyncDeploy: true,
        }
      )
    );

    try {
      const res = await Promise.all(promises);
      return res.flat();
    } catch (error) {
      this.server.logger.error(error);
    }
  }

  // The agent policies can be in the default space or the spaceId
  // This function returns the package policies that are in the spaceId and the default space and the correct saved objects client to fetch the package policies
  private async getDefaultAndSpacePackagePolicies({
    policies,
    spaceId,
  }: {
    policies: NewPackagePolicyWithId[];
    spaceId: string;
  }): Promise<
    {
      client: SavedObjectsClientContract;
      policies: NewPackagePolicyWithId[];
    }[]
  > {
    const agentPolicyIds = new Set(policies.flatMap((pkgPolicy) => pkgPolicy.policy_ids));
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
          })
        )
      )
    ).flat();

    const agentPolicyById = new Map(agentPolicies.map((ap) => [ap.id, ap]));
    const defaultSpacePackagePolicies: NewPackagePolicyWithId[] = [];
    const spacePackagePolicies: NewPackagePolicyWithId[] = [];

    for (const pkgPolicy of policies) {
      // Each package policy is associated with a single agent policy
      const agentPolicy = agentPolicyById.get(pkgPolicy.policy_ids[0]);
      if (agentPolicy?.space_ids?.includes(spaceId)) {
        spacePackagePolicies.push(pkgPolicy);
      } else {
        defaultSpacePackagePolicies.push(pkgPolicy);
      }
    }

    const res: {
      client: SavedObjectsClientContract;
      policies: NewPackagePolicyWithId[];
    }[] = [];

    if (defaultSpacePackagePolicies.length > 0) {
      res.push({ client: defaultSpaceSoClient, policies: defaultSpacePackagePolicies });
    }
    if (spacePackagePolicies.length > 0) {
      res.push({ client: spaceSoClient, policies: spacePackagePolicies });
    }

    return res;
  }
}
