/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ALL_SPACES_ID } from '@kbn/spaces-plugin/common/constants';
import type { SavedObjectsClientContract } from '@kbn/core/server';
import { updateAgentPolicySpaces } from '@kbn/fleet-plugin/server/services/spaces/agent_policy';
import { DEFAULT_SPACE_ID } from '@kbn/spaces-utils';
import type { AgentPolicy } from '@kbn/fleet-plugin/public/types';
import type { SyntheticsServerSetup } from '../types';
import { getPrivateLocations } from '../synthetics_service/get_private_locations';

export class MigrateLegacyAgentPolicies {
  private readonly serverSetup: SyntheticsServerSetup;
  constructor(serverSetup: SyntheticsServerSetup) {
    this.serverSetup = serverSetup;
  }

  /**
   * Main entry point for migrating legacy agent policies.
   * This method orchestrates the migration process by:
   * 1. Fetching all private locations and space IDs
   * 2. Retrieving associated agent policies
   * 3. Migrating each policy to include the correct spaces
   */
  public run = async () => {
    const { coreStart } = this.serverSetup;
    const soClient = coreStart.savedObjects.createInternalRepository();

    const [allPrivateLocations, allSpaceIds] = await Promise.all([
      getPrivateLocations(soClient, ALL_SPACES_ID),
      this.getAllSpaceIds(),
    ]);
    const agentPolicyIds = [
      ...new Set(allPrivateLocations.map((privateLocation) => privateLocation.agentPolicyId)),
    ];

    const allLegacyAgentPolicies = await this.getLegacyAgentPolicies({
      agentPolicyIds,
      soClient,
    });

    const policyById = Object.fromEntries(
      allLegacyAgentPolicies.map((policy) => [policy.id, policy])
    );

    await Promise.all(
      allPrivateLocations.map(async (privateLocation) => {
        const policy = policyById[privateLocation.agentPolicyId];
        if (!policy) return;
        return this.migrateAgentPolicyIfNeeded({
          privateLocationSpaces: this.expandSpaces(privateLocation.spaces, allSpaceIds),
          policy,
        });
      })
    );
  };

  /**
   * Expands a space list to include all available spaces if needed.
   * @param spaceList - The list of spaces to expand (can be undefined or empty)
   * @param allSpaceIds - All available space IDs in the cluster
   * @returns The expanded list of space IDs. If spaceList is empty/undefined or contains '*', returns allSpaceIds
   */
  private expandSpaces = (spaceList: string[] | undefined, allSpaceIds: string[]) => {
    if (!spaceList || spaceList.length === 0) return allSpaceIds;
    return spaceList.includes('*') ? allSpaceIds : spaceList;
  };

  /**
   * Migrates an agent policy to include the required spaces for private locations.
   * Only updates the policy if there are spaces that need to be added.
   * @param privateLocationSpaces - The spaces that the private location should be accessible from
   * @param policy - The agent policy to potentially migrate
   */
  private migrateAgentPolicyIfNeeded = async ({
    privateLocationSpaces,
    policy,
  }: {
    privateLocationSpaces: string[];
    policy: AgentPolicy;
  }) => {
    const spaceIdsToAdd = privateLocationSpaces.filter((s) => !policy.space_ids?.includes(s));
    if (spaceIdsToAdd.length === 0) return;

    const newSpaceIds = [
      ...new Set([...(policy.space_ids ?? [DEFAULT_SPACE_ID]), ...spaceIdsToAdd]),
    ];

    this.log(
      'debug',
      `The following spaces will be added to the agent policy ${policy.id}: ${spaceIdsToAdd.join(
        ', '
      )}`
    );
    await updateAgentPolicySpaces({
      agentPolicyId: policy.id,
      currentSpaceId: DEFAULT_SPACE_ID,
      newSpaceIds,
      authorizedSpaces: newSpaceIds,
    });
  };

  /**
   * Retrieves all space IDs from the cluster.
   * @returns A promise that resolves to an array of all space IDs in the cluster
   */
  private getAllSpaceIds = async () => {
    const { saved_objects: spaceSO } = await this.serverSetup.coreStart.savedObjects
      .createInternalRepository(['space'])
      .find({
        type: 'space',
        page: 1,
        perPage: 10_000,
      });
    this.log('debug', `Found ${spaceSO.length} spaces`);
    return spaceSO.map((space) => space.id);
  };

  /**
   * Retrieves agent policies by their IDs from the Fleet service.
   * @param agentPolicyIds - Array of agent policy IDs to retrieve
   * @param soClient - Saved Objects client for the operation
   * @returns A promise that resolves to an array of agent policies
   */
  private getLegacyAgentPolicies = async ({
    agentPolicyIds,
    soClient,
  }: {
    agentPolicyIds: string[];
    soClient: SavedObjectsClientContract;
  }) => {
    const agentPolicies = await this.serverSetup.fleet?.agentPolicyService.getByIds(
      soClient,
      agentPolicyIds,
      {
        ignoreMissing: true,
      }
    );
    this.log('debug', `Found ${agentPolicies.length} agent policies`);
    return agentPolicies;
  };

  private log = (level: 'info' | 'debug' | 'error', message: string) => {
    const logMessage = `[MigrateLegacyAgentPolicies] ${message}`;
    switch (level) {
      case 'info':
        this.serverSetup.logger.info(logMessage);
        break;
      case 'debug':
        this.serverSetup.logger.debug(logMessage);
        break;
      case 'error':
        this.serverSetup.logger.error(logMessage);
        break;
    }
  };
}
