/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { NewPackagePolicyWithId } from '@kbn/fleet-plugin/server/services/package_policy';
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

  async getByIds({ spaceId, listOfPolicies }: { spaceId: string; listOfPolicies: string[] }) {
    return this.server.fleet.packagePolicyService.getByIDs(
      this.getSpaceSoClient(spaceId),
      listOfPolicies,
      {
        ignoreMissing: true,
      }
    );
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
