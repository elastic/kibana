/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { NewPackagePolicy } from '@kbn/fleet-plugin/common';
import type { NewPackagePolicyWithId } from '@kbn/fleet-plugin/server/services/package_policy';
import { cloneDeep } from 'lodash';
import type { SavedObjectError } from '@kbn/core-saved-objects-common';
import type { MaintenanceWindow } from '@kbn/maintenance-windows-plugin/common';
import { ALL_SPACES_ID } from '@kbn/spaces-plugin/common/constants';
import { DEFAULT_NAMESPACE_STRING } from '../../../common/constants/monitor_defaults';
import {
  syntheticsMonitorSOTypes,
  syntheticsMonitorSavedObjectType,
  legacySyntheticsMonitorTypeSingle,
} from '../../../common/types/saved_objects';
import {
  BROWSER_TEST_NOW_RUN,
  LIGHTWEIGHT_TEST_NOW_RUN,
} from '../synthetics_monitor/synthetics_monitor_client';
import { scheduleCleanUpTask } from './clean_up_task';
import { getAgentPoliciesAsInternalUser } from '../../routes/settings/private_locations/get_agent_policies';
import type { SyntheticsServerSetup } from '../../types';
import { formatSyntheticsPolicy } from '../formatters/private_formatters/format_synthetics_policy';
import type {
  HeartbeatConfig,
  MonitorFields,
  PrivateLocation,
} from '../../../common/runtime_types';
import {
  ConfigKey,
  SourceType,
  type SyntheticsPrivateLocations,
} from '../../../common/runtime_types';
import { stringifyString } from '../formatters/private_formatters/formatting_utils';
import type { PrivateLocationAttributes } from '../../runtime_types/private_locations';

export interface PrivateConfig {
  config: HeartbeatConfig;
  globalParams: Record<string, string>;
}

export interface FailedPolicyUpdate {
  packagePolicy: NewPackagePolicyWithId;
  config?: HeartbeatConfig;
  error?: Error | SavedObjectError;
}

export class SyntheticsPrivateLocation {
  private readonly server: SyntheticsServerSetup;

  constructor(_server: SyntheticsServerSetup) {
    this.server = _server;
  }

  async buildNewPolicy(): Promise<NewPackagePolicy> {
    const soClient = this.server.coreStart.savedObjects.createInternalRepository();

    const newPolicy = await this.server.fleet.packagePolicyService.buildPackagePolicyFromPackage(
      soClient,
      'synthetics',
      { logger: this.server.logger, installMissingPackage: true }
    );

    if (!newPolicy) {
      throw new Error(`Unable to create Synthetics package policy template for private location`);
    }

    return newPolicy;
  }

  /**
   * Returns the new (space-agnostic) policy ID format.
   * Format: `${configId}-${locationId}`
   * This removes the spaceId dependency to support multispace monitors.
   */
  getPolicyId(config: { origin?: string; id: string }, locId: string, _spaceId?: string) {
    return `${config.id}-${locId}`;
  }

  /**
   * Returns the legacy policy ID format that included spaceId.
   * Format: `${configId}-${locationId}-${spaceId}`
   * Used for backward compatibility when looking up existing policies.
   */
  getLegacyPolicyId(configId: string, locId: string, spaceId: string) {
    return `${configId}-${locId}-${spaceId}`;
  }

  /**
   * Gets all unique spaces that have any synthetics monitors.
   * Uses aggregation for efficiency instead of iterating through all monitors.
   */
  async getAllSpacesWithMonitors(): Promise<string[]> {
    const soClient = this.server.coreStart.savedObjects.createInternalRepository();
    const spaces = new Set<string>();

    try {
      const result = await soClient.find<
        unknown,
        {
          namespaces: {
            buckets: Array<{ key: string; doc_count: number }>;
          };
          legacyNamespaces: {
            buckets: Array<{ key: string; doc_count: number }>;
          };
        }
      >({
        type: syntheticsMonitorSOTypes,
        perPage: 0,
        namespaces: [ALL_SPACES_ID],
        fields: [],
        aggs: {
          namespaces: {
            terms: { field: `${syntheticsMonitorSavedObjectType}.namespace`, size: 1000 },
          },
          legacyNamespaces: {
            terms: { field: `${legacySyntheticsMonitorTypeSingle}.namespace`, size: 1000 },
          },
        },
      });

      // Collect namespaces from both new and legacy monitor types
      result.aggregations?.namespaces?.buckets?.forEach((bucket) => {
        spaces.add(bucket.key);
      });
      result.aggregations?.legacyNamespaces?.buckets?.forEach((bucket) => {
        spaces.add(bucket.key);
      });
    } catch (e) {
      this.server.logger.error(`Error fetching spaces with monitors: ${e.message}`);
    }

    return [...spaces];
  }

  async generateNewPolicy(
    config: HeartbeatConfig,
    privateLocation: PrivateLocation,
    newPolicyTemplate: NewPackagePolicy,
    spaceId: string,
    globalParams: Record<string, string>,
    maintenanceWindows: MaintenanceWindow[],
    testRunId?: string,
    runOnce?: boolean
  ): Promise<NewPackagePolicy | null> {
    const { label: locName } = privateLocation;

    const newPolicy = cloneDeep(newPolicyTemplate);

    try {
      newPolicy.is_managed = true;
      newPolicy.policy_id = privateLocation.agentPolicyId;
      newPolicy.policy_ids = [privateLocation.agentPolicyId];
      if (testRunId) {
        newPolicy.name =
          config.type === 'browser' ? BROWSER_TEST_NOW_RUN : LIGHTWEIGHT_TEST_NOW_RUN;
      } else {
        if (config[ConfigKey.MONITOR_SOURCE_TYPE] === SourceType.PROJECT) {
          newPolicy.name = `${config.id}-${locName}`;
        } else {
          newPolicy.name = `${config[ConfigKey.NAME]}-${locName}-${spaceId}`;
        }
      }
      const configNamespace = config[ConfigKey.NAMESPACE];

      newPolicy.namespace = await this.getPolicyNamespace(configNamespace);

      const { formattedPolicy } = formatSyntheticsPolicy(
        newPolicy,
        config.type,
        {
          ...(config as Partial<MonitorFields>),
          space_id: spaceId,
          config_id: config.fields?.config_id,
          location_name: stringifyString(privateLocation.label),
          location_id: privateLocation.id,
          'monitor.project.id':
            config.fields?.['monitor.project.id'] ?? config[ConfigKey.PROJECT_ID],
          'monitor.project.name':
            config.fields?.['monitor.project.name'] ?? config[ConfigKey.PROJECT_ID],
          ...(testRunId
            ? {
                test_run_id: testRunId,
                'monitor.id': config[ConfigKey.MONITOR_QUERY_ID],
                id: testRunId,
              }
            : {}),
          ...(runOnce ? { run_once: runOnce } : {}),
        },
        globalParams,
        maintenanceWindows
      );

      return formattedPolicy;
    } catch (e) {
      this.server.logger.error(e);
      return null;
    }
  }

  async createPackagePolicies(
    configs: PrivateConfig[],
    privateLocations: SyntheticsPrivateLocations,
    spaceId: string,
    maintenanceWindows: MaintenanceWindow[],
    testRunId?: string,
    runOnce?: boolean
  ) {
    if (configs.length === 0) {
      return { created: [], failed: [] };
    }
    const newPolicies: NewPackagePolicyWithId[] = [];
    const newPolicyTemplate = await this.buildNewPolicy();

    for (const { config, globalParams } of configs) {
      try {
        const { locations } = config;
        const fleetManagedLocations = locations.filter((loc) => !loc.isServiceManaged);

        for (const privateLocation of fleetManagedLocations) {
          const location = privateLocations?.find((loc) => loc.id === privateLocation.id)!;
          if (!location) {
            throw new Error(
              `Unable to find Synthetics private location for agentId ${privateLocation.id}`
            );
          }

          const newPolicy = await this.generateNewPolicy(
            config,
            location,
            newPolicyTemplate,
            spaceId,
            globalParams,
            maintenanceWindows,
            testRunId,
            runOnce
          );

          if (!newPolicy) {
            throw new Error(
              `Unable to create Synthetics package policy for monitor ${
                config[ConfigKey.NAME]
              } with private location ${location.label}`
            );
          }
          if (newPolicy) {
            if (testRunId) {
              newPolicies.push(newPolicy as NewPackagePolicyWithId);
            } else {
              newPolicies.push({
                ...newPolicy,
                id: this.getPolicyId(config, location.id),
              });
            }
          }
        }
      } catch (e) {
        this.server.logger.error(e);
        throw e;
      }
    }

    if (newPolicies.length === 0) {
      throw new Error('Failed to build package policies for all monitors');
    }

    try {
      const result = await this.createPolicyBulk(newPolicies);
      if (result?.created && result?.created?.length > 0 && testRunId) {
        // ignore await here, we don't want to wait for this to finish
        void scheduleCleanUpTask(this.server);
      }
      return result;
    } catch (e) {
      this.server.logger.error(e);
      throw e;
    }
  }

  async inspectPackagePolicy({
    privateConfig,
    spaceId,
    allPrivateLocations,
    maintenanceWindows,
  }: {
    privateConfig?: PrivateConfig;
    allPrivateLocations: PrivateLocationAttributes[];
    spaceId: string;
    maintenanceWindows: MaintenanceWindow[];
  }) {
    if (!privateConfig) {
      return null;
    }
    const newPolicyTemplate = await this.buildNewPolicy();
    const soClient = this.server.coreStart.savedObjects.createInternalRepository();

    const { config, globalParams } = privateConfig;
    try {
      const { locations } = config;

      const privateLocation = locations.find((loc) => !loc.isServiceManaged);

      const location = allPrivateLocations?.find((loc) => loc.id === privateLocation?.id)!;

      const newPolicy = await this.generateNewPolicy(
        config,
        location,
        newPolicyTemplate,
        spaceId,
        globalParams,
        maintenanceWindows
      );

      const pkgPolicy = {
        ...newPolicy,
        id: this.getPolicyId(config, location.id),
      } as NewPackagePolicyWithId;

      return await this.server.fleet.packagePolicyService.inspect(soClient, pkgPolicy);
    } catch (e) {
      this.server.logger.error(e);
      return null;
    }
  }

  async editMonitors(
    configs: Array<{ config: HeartbeatConfig; globalParams: Record<string, string> }>,
    allPrivateLocations: SyntheticsPrivateLocations,
    spaceId: string,
    maintenanceWindows: MaintenanceWindow[]
  ) {
    if (configs.length === 0) {
      return {
        failedUpdates: [],
      };
    }

    const [newPolicyTemplate, existingPolicies] = await Promise.all([
      this.buildNewPolicy(),
      this.getExistingPolicies(
        configs.map(({ config }) => config),
        allPrivateLocations,
        spaceId
      ),
    ]);

    const policiesToUpdate: NewPackagePolicyWithId[] = [];
    const policiesToCreate: NewPackagePolicyWithId[] = [];
    const policiesToDelete: string[] = [];

    for (const { config, globalParams } of configs) {
      const { locations } = config;

      const monitorPrivateLocations = locations.filter((loc) => !loc.isServiceManaged);

      for (const privateLocation of allPrivateLocations) {
        const hasLocation = monitorPrivateLocations?.some((loc) => loc.id === privateLocation.id);
        const newId = this.getPolicyId(config, privateLocation.id);
        const legacyIdPrefix = `${config.id}-${privateLocation.id}-`;

        // Check for new format policy
        const hasNewFormatPolicy = existingPolicies?.some((policy) => policy.id === newId);
        // Find ALL legacy policies for this config+location by matching ID prefix pattern
        // This catches legacy policies from any space, not just spaces the monitor currently exists in
        const legacyPolicyIds =
          existingPolicies
            ?.filter((policy) => policy.id.startsWith(legacyIdPrefix) && policy.id !== newId)
            .map((policy) => policy.id) || [];
        const hasAnyLegacyPolicy = legacyPolicyIds.length > 0;
        const hasPolicy = hasNewFormatPolicy || hasAnyLegacyPolicy;

        try {
          if (hasLocation) {
            const newPolicy = await this.generateNewPolicy(
              config,
              privateLocation,
              newPolicyTemplate,
              spaceId,
              globalParams,
              maintenanceWindows
            );

            if (!newPolicy) {
              throwAddEditError(hasPolicy, privateLocation.label);
            }

            if (hasNewFormatPolicy) {
              // Policy already exists with new format, just update it
              policiesToUpdate.push({ ...newPolicy, id: newId } as NewPackagePolicyWithId);
              // Delete all legacy policies found
              policiesToDelete.push(...legacyPolicyIds);
            } else if (hasAnyLegacyPolicy) {
              // Legacy policies exist - migrate to new format
              // Delete all legacy policies and create with new ID
              policiesToDelete.push(...legacyPolicyIds);
              policiesToCreate.push({ ...newPolicy, id: newId } as NewPackagePolicyWithId);
            } else {
              // No policy exists, create with new format
              policiesToCreate.push({ ...newPolicy, id: newId } as NewPackagePolicyWithId);
            }
          } else {
            // Location removed from monitor - delete policy in any format
            if (hasNewFormatPolicy) {
              policiesToDelete.push(newId);
            }
            // Delete all legacy policies found
            policiesToDelete.push(...legacyPolicyIds);
          }
        } catch (e) {
          this.server.logger.error(e);
          throwAddEditError(hasPolicy, privateLocation.label, config[ConfigKey.NAME]);
        }
      }
    }

    // Deduplicate the delete list
    const uniqueToDelete = [...new Set(policiesToDelete)];

    this.server.logger.debug(
      `[editingMonitors] Creating ${policiesToCreate.length} policies, updating ${policiesToUpdate.length} policies, deleting ${uniqueToDelete.length} policies`
    );

    const [_createResponse, failedUpdatesRes] = await Promise.all([
      this.createPolicyBulk(policiesToCreate),
      this.updatePolicyBulk(policiesToUpdate),
      this.deletePolicyBulk(uniqueToDelete),
    ]);

    const failedUpdates = failedUpdatesRes?.map(({ packagePolicy, error }) => {
      const policyConfig = configs.find(({ config }) => {
        const { locations } = config;

        const monitorPrivateLocations = locations.filter((loc) => !loc.isServiceManaged);
        for (const privateLocation of monitorPrivateLocations) {
          const currId = this.getPolicyId(config, privateLocation.id);
          return currId === packagePolicy.id;
        }
      });
      return {
        error,
        packagePolicy,
        config: policyConfig?.config,
      };
    });

    return {
      failedUpdates,
    };
  }

  /**
   * Fetches existing package policies for the given configs and locations.
   * Looks for new (space-agnostic) format and legacy format for all spaces
   * that have any synthetics monitors.
   */
  async getExistingPolicies(
    configs: HeartbeatConfig[],
    allPrivateLocations: SyntheticsPrivateLocations,
    spaceId: string
  ) {
    const soClient = this.server.coreStart.savedObjects.createInternalRepository();

    // Get all spaces that have any synthetics monitors
    const allSpacesWithMonitors = await this.getAllSpacesWithMonitors();
    // Include current space in case it has no monitors yet
    const allSpaces = new Set([spaceId, ...allSpacesWithMonitors]);

    // Use Set to automatically handle duplicates
    const policyIdsToFetch = new Set<string>();

    for (const config of configs) {
      for (const privateLocation of allPrivateLocations) {
        // Add new format (space-agnostic)
        policyIdsToFetch.add(this.getPolicyId(config, privateLocation.id));
        // Add legacy format for all spaces that have any monitors
        for (const space of allSpaces) {
          policyIdsToFetch.add(this.getLegacyPolicyId(config.id, privateLocation.id, space));
        }
      }
    }

    return await this.server.fleet.packagePolicyService.getByIDs(soClient, [...policyIdsToFetch], {
      ignoreMissing: true,
    });
  }

  async createPolicyBulk(newPolicies: NewPackagePolicyWithId[]) {
    const soClient = this.server.coreStart.savedObjects.createInternalRepository();
    const esClient = this.server.coreStart.elasticsearch.client.asInternalUser;
    if (esClient && newPolicies.length > 0) {
      return await this.server.fleet.packagePolicyService.bulkCreate(
        soClient,
        esClient,
        newPolicies,
        {
          asyncDeploy: true,
        }
      );
    }
  }

  async updatePolicyBulk(policiesToUpdate: NewPackagePolicyWithId[]) {
    const soClient = this.server.coreStart.savedObjects.createInternalRepository();
    const esClient = this.server.coreStart.elasticsearch.client.asInternalUser;
    if (policiesToUpdate.length > 0) {
      const { failedPolicies } = await this.server.fleet.packagePolicyService.bulkUpdate(
        soClient,
        esClient,
        policiesToUpdate,
        {
          force: true,
          asyncDeploy: true,
        }
      );
      return failedPolicies;
    }
  }

  async deletePolicyBulk(policyIdsToDelete: string[]) {
    const soClient = this.server.coreStart.savedObjects.createInternalRepository();
    const esClient = this.server.coreStart.elasticsearch.client.asInternalUser;
    if (policyIdsToDelete.length > 0) {
      try {
        return await this.server.fleet.packagePolicyService.delete(
          soClient,
          esClient,
          policyIdsToDelete,
          {
            force: true,
            asyncDeploy: true,
          }
        );
      } catch (e) {
        this.server.logger.error(e);
      }
    }
  }

  async deleteMonitors(configs: HeartbeatConfig[], spaceId: string) {
    const soClient = this.server.coreStart.savedObjects.createInternalRepository();
    const esClient = this.server.coreStart.elasticsearch.client.asInternalUser;

    // Get all spaces that have any synthetics monitors
    const allSpacesWithMonitors = await this.getAllSpacesWithMonitors();
    // Include current space in case it has no monitors yet
    const allSpaces = new Set([spaceId, ...allSpacesWithMonitors]);

    // Use Set to automatically handle duplicates
    const policyIdsToDelete = new Set<string>();

    for (const config of configs) {
      const { locations } = config;
      const monitorPrivateLocations = locations.filter((loc) => !loc.isServiceManaged);

      for (const privateLocation of monitorPrivateLocations) {
        // Add new format ID
        policyIdsToDelete.add(this.getPolicyId(config, privateLocation.id));
        // Add legacy format IDs for all spaces that have any monitors
        for (const space of allSpaces) {
          policyIdsToDelete.add(this.getLegacyPolicyId(config.id, privateLocation.id, space));
        }
      }
    }

    if (policyIdsToDelete.size > 0) {
      const result = await this.server.fleet.packagePolicyService.delete(
        soClient,
        esClient,
        [...policyIdsToDelete],
        {
          force: true,
          asyncDeploy: true,
        }
      );
      const failedPolicies = result?.filter((policy) => {
        // Ignore 404s as some policies may have already been deleted
        return !policy.success && policy?.statusCode !== 404;
      });
      // Only throw error if all actual policies failed
      if (failedPolicies?.length > 0 && failedPolicies.length >= configs.length) {
        throw new Error(deletePolicyError(configs[0][ConfigKey.NAME]));
      }
      return result;
    }
  }

  async getAgentPolicies() {
    return await getAgentPoliciesAsInternalUser({ server: this.server });
  }

  async getPolicyNamespace(configNamespace: string) {
    if (configNamespace && configNamespace !== DEFAULT_NAMESPACE_STRING) {
      return configNamespace;
    }
    return undefined;
  }
}

const throwAddEditError = (hasPolicy: boolean, location?: string, name?: string) => {
  throw new Error(
    `Unable to ${hasPolicy ? 'update' : 'create'} Synthetics package policy ${
      name ? 'for monitor ' + name : ''
    } for private location: ${location}`
  );
};

const deletePolicyError = (name: string, location?: string) => {
  return `Unable to delete Synthetics package policy for monitor ${name} with private location ${location}`;
};
