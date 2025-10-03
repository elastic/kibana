/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { NewPackagePolicyWithId } from '@kbn/fleet-plugin/server/services/package_policy';
import { updateAgentPolicySpaces } from '@kbn/fleet-plugin/server/services/spaces/agent_policy';
import { DEFAULT_SPACE_ID } from '@kbn/spaces-plugin/common';
import type { PackagePolicyClientGetByIdsOptions } from '@kbn/fleet-plugin/server/services/package_policy_service';
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

  /**
   * Ensures that all legacy agent policies referenced by the given package policies
   * have the current space in their spaces array.
   */
  private async migrateLegacyAgentPolicies({
    packagePolicies,
    spaceId,
  }: {
    packagePolicies: NewPackagePolicyWithId[];
    spaceId: string;
  }) {
    if (packagePolicies.length === 0) {
      return;
    }

    // Extract all unique agent policy IDs from the package policies
    const agentPolicyIds = Array.from(
      new Set(packagePolicies.flatMap((policy) => policy.policy_ids || []))
    );

    if (agentPolicyIds.length === 0) {
      return;
    }

    // Get all legacy agent policies, they are stored in the default space
    const agentPolicies = await this.server.fleet.agentPolicyService.getByIds(
      this.getSpaceSoClient(DEFAULT_SPACE_ID),
      agentPolicyIds,
      { ignoreMissing: true }
    );

    // For each agent policy that doesn't have the current space, add it
    for (const agentPolicy of agentPolicies) {
      if (!agentPolicy.space_ids?.includes(spaceId)) {
        const newSpaceIds = [...(agentPolicy.space_ids || []), spaceId];
        try {
          await updateAgentPolicySpaces({
            agentPolicyId: agentPolicy.id,
            currentSpaceId: DEFAULT_SPACE_ID,
            newSpaceIds,
            authorizedSpaces: newSpaceIds,
          });
        } catch (error) {
          this.server.logger.warn(
            `Failed to add space ${spaceId} to agent policy ${agentPolicy.id}: ${error.message}`
          );
        }
      }
    }
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
    await this.migrateLegacyAgentPolicies({
      packagePolicies: [packagePolicy],
      spaceId,
    });

    return this.server.fleet.packagePolicyService.inspect(
      this.getSpaceSoClient(spaceId),
      packagePolicy
    );
  }

  async getByIds({ spaceId, listOfPolicies }: { spaceId: string; listOfPolicies: string[] }) {
    const options: PackagePolicyClientGetByIdsOptions = { ignoreMissing: true };
    const packagePolicies = (
      await Promise.all([
        this.server.fleet.packagePolicyService.getByIDs(
          this.getSpaceSoClient(spaceId),
          listOfPolicies,
          options
        ),
        spaceId !== DEFAULT_SPACE_ID
          ? this.server.fleet.packagePolicyService.getByIDs(
              this.getSpaceSoClient(DEFAULT_SPACE_ID),
              listOfPolicies,
              options
            )
          : Promise.resolve([]),
      ])
    ).flat();

    await this.migrateLegacyAgentPolicies({
      packagePolicies,
      spaceId,
    });

    return packagePolicies;
  }

  async bulkCreate({
    newPolicies,
    spaceId,
  }: {
    newPolicies: NewPackagePolicyWithId[];
    spaceId: string;
  }) {
    const soClient = this.getSpaceSoClient(spaceId);

    if (newPolicies.length > 0) {
      await this.migrateLegacyAgentPolicies({
        packagePolicies: newPolicies,
        spaceId,
      });

      return this.server.fleet.packagePolicyService.bulkCreate(
        soClient,
        this.getInternalEsClient(),
        newPolicies,
        {
          asyncDeploy: true,
        }
      );
    }
  }

  async bulkUpdate({
    policiesToUpdate,
    spaceId,
  }: {
    policiesToUpdate: NewPackagePolicyWithId[];
    spaceId: string;
  }) {
    const soClient = this.getSpaceSoClient(spaceId);

    if (policiesToUpdate.length > 0) {
      await this.migrateLegacyAgentPolicies({
        packagePolicies: policiesToUpdate,
        spaceId,
      });

      const { failedPolicies } = await this.server.fleet.packagePolicyService.bulkUpdate(
        soClient,
        this.getInternalEsClient(),
        policiesToUpdate,
        {
          force: true,
          asyncDeploy: true,
        }
      );
      return failedPolicies;
    }
  }

  async bulkDelete({
    policyIdsToDelete,
    spaceId,
  }: {
    policyIdsToDelete: string[];
    spaceId: string;
  }) {
    const soClient = this.getSpaceSoClient(spaceId);

    if (policyIdsToDelete.length > 0) {
      await this.migrateLegacyAgentPolicies({
        packagePolicies: await this.getByIds({ spaceId, listOfPolicies: policyIdsToDelete }),
        spaceId,
      });

      try {
        return this.server.fleet.packagePolicyService.delete(
          soClient,
          this.getInternalEsClient(),
          policyIdsToDelete,
          {
            force: true,
            asyncDeploy: true,
          }
        );
      } catch (error) {
        this.server.logger.error(error);
      }
    }
  }
}
