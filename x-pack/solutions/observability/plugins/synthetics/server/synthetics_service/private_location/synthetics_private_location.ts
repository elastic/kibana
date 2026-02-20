/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { NewPackagePolicy, PackagePolicy } from '@kbn/fleet-plugin/common';
import { ALL_SPACES_ID } from '@kbn/spaces-plugin/common/constants';
import type { NewPackagePolicyWithId } from '@kbn/fleet-plugin/server/services/package_policy';
import { cloneDeep } from 'lodash';
import type { SavedObjectError } from '@kbn/core-saved-objects-common';
import type { MaintenanceWindow } from '@kbn/maintenance-windows-plugin/common';
import { SavedObjectsClientContract } from '@kbn/core/server';
import { DEFAULT_NAMESPACE_STRING } from '../../../common/constants/monitor_defaults';
import {
  legacySyntheticsMonitorTypeSingle,
  syntheticsMonitorSavedObjectType,
  syntheticsMonitorSOTypes,
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

      console.log('formattedPolicy', formattedPolicy);

      return formattedPolicy;
    } catch (e) {
      console.log('error generating package policy', e);
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

    console.log('newPolicyTemplate', JSON.stringify(newPolicyTemplate));

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
              const policyId = getPolicyId(config, location.id);
              newPolicies.push({
                ...newPolicy,
                id: policyId,
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
        id: getPolicyId(config, location.id),
      } as NewPackagePolicyWithId;
      const soClient = this.server.coreStart.savedObjects.createInternalRepository();

      return await this.server.fleet.packagePolicyService.inspect(soClient, pkgPolicy);
    } catch (e) {
      this.server.logger.error(e);
      return null;
    }
  }

  async updatePackagePolicies(
    configs: Array<{ config: HeartbeatConfig; globalParams: Record<string, string> }>,
    allPrivateLocations: SyntheticsPrivateLocations,
    spaceId: string,
    maintenanceWindows: MaintenanceWindow[],
    monitorIdToPackagePolicyIdsMap: Record<string, string[]> = {}
  ) {
    if (configs.length === 0) {
      return {
        failedUpdates: [],
      };
    }

    const [newPolicyTemplate, { existingPolicies, monitorsWithoutPolicyReferences }] =
      await Promise.all([
        this.buildNewPolicy(),
        this.getExistingPolicies(
          configs.map(({ config }) => config),
          monitorIdToPackagePolicyIdsMap
        ),
      ]);

    const policiesToUpdate: NewPackagePolicyWithId[] = [];
    const policiesToCreate: NewPackagePolicyWithId[] = [];
    const policiesToDelete: string[] = [];

    for (const { config, globalParams } of configs) {
      const mayHaveLegacyPolicies = monitorsWithoutPolicyReferences.has(config.id);
      // We will fetch and cache all spaces if there are any monitors without policy references
      let allSpaces: string[] = [];
      const { locations } = config;
      const monitorPrivateLocations = locations.filter((loc) => !loc.isServiceManaged);

      for (const privateLocation of allPrivateLocations) {
        const hasLocation = monitorPrivateLocations?.some((loc) => loc.id === privateLocation.id);
        let currId = getPolicyId(config, privateLocation.id);
        const hasPolicy = existingPolicies?.some((policy) => {
          console.log('policyId', policy.id);
          console.log('privateLocationId', privateLocation.id);
          console.log('configId', config.id);
          if (policy.id.includes(config.id) && policy.id.includes(privateLocation.id)) {
            currId = policy.id;
            return true;
          }
        });
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

            if (hasPolicy) {
              policiesToUpdate.push({ ...newPolicy, id: currId } as NewPackagePolicyWithId);
            } else {
              policiesToCreate.push({ ...newPolicy, id: currId } as NewPackagePolicyWithId);
            }
          } else if (hasPolicy) {
            policiesToDelete.push(currId);
          }

          if (mayHaveLegacyPolicies) {
            if (!allSpaces.length) {
              allSpaces = await this.getAllSpacesWhereMonitorsExist();
            }
            const policyIds = this.getLegacyPoliciesForAllSpaces(
              config,
              privateLocation.id,
              allSpaces
            );
            policiesToDelete.push(...policyIds);
          }
        } catch (e) {
          this.server.logger.error(e);
          throwAddEditError(hasPolicy, privateLocation.label, config[ConfigKey.NAME]);
        }
      }
    }

    console.log('policiesToCreate', policiesToCreate);
    console.log('policiesToUpdate', policiesToUpdate);
    console.log('policiesToDelete', policiesToDelete);

    this.server.logger.debug(
      `[editingMonitors] Creating ${policiesToCreate.length} policies, updating ${policiesToUpdate.length} policies, and deleting ${policiesToDelete.length} policies`
    );

    const [_createResponse, failedUpdatesRes, _deleteResponse] = await Promise.all([
      this.createPolicyBulk(policiesToCreate),
      this.updatePolicyBulk(policiesToUpdate),
      this.deletePolicyBulk(policiesToDelete),
    ]);

    const failedUpdates = failedUpdatesRes?.map(({ packagePolicy, error }) => {
      const policyConfig = configs.find(({ config }) => {
        const { locations } = config;

        const monitorPrivateLocations = locations.filter((loc) => !loc.isServiceManaged);
        for (const privateLocation of monitorPrivateLocations) {
          return (
            packagePolicy.id?.includes(config.id) && packagePolicy.id?.includes(privateLocation.id)
          );
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

  async getExistingPolicies(
    configs: HeartbeatConfig[],
    monitorIdToPackagePolicyIdsMap: Record<string, string[]> = {}
  ): Promise<{
    existingPolicies: PackagePolicy[];
    monitorsWithoutPolicyReferences: Set<string>;
  }> {
    const soClient = this.server.coreStart.savedObjects.createInternalRepository();
    const monitorsWithoutPolicyReferences: Set<string> = new Set();
    const listOfPolicies: string[] = [];
    for (const config of configs) {
      if (monitorIdToPackagePolicyIdsMap[config.id]) {
        listOfPolicies.push(...monitorIdToPackagePolicyIdsMap[config.id]);
      } else {
        monitorsWithoutPolicyReferences.add(config.id);
      }
    }

    const existingPolicies = await this.server.fleet.packagePolicyService.getByIDs(
      soClient,
      listOfPolicies,
      {
        ignoreMissing: true,
      }
    );

    return {
      existingPolicies,
      monitorsWithoutPolicyReferences,
    };
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

  async deleteMonitors(
    configs: HeartbeatConfig[],
    monitorIdToPackagePolicyIdsMap: Record<string, string[]> = {}
  ) {
    const soClient = this.server.coreStart.savedObjects.createInternalRepository();
    const esClient = this.server.coreStart.elasticsearch.client.asInternalUser;
    // fetch and cache all spaces if there are any legacy policies to delete
    let allSpaces: string[] = [];

    const policyIdsToDelete: string[] = [];
    const monitorsWithoutPolicyReferences = new Set(
      configs
        .filter((config) => !monitorIdToPackagePolicyIdsMap[config.id])
        .map((config) => config.id)
    );

    const mayBeLegacyPolicies = monitorsWithoutPolicyReferences.size > 0;
    if (mayBeLegacyPolicies) {
      allSpaces = await this.getAllSpacesWhereMonitorsExist();
    }

    for (const config of configs) {
      const { locations } = config;

      console.log('monitorIdToPackagePolicyIdsMap', monitorIdToPackagePolicyIdsMap);

      policyIdsToDelete.push(...(monitorIdToPackagePolicyIdsMap[config.id] || []));

      if (mayBeLegacyPolicies) {
        const monitorPrivateLocations = locations.filter((loc) => !loc.isServiceManaged);
        for (const privateLocation of monitorPrivateLocations) {
          if (allSpaces && monitorsWithoutPolicyReferences.has(config.id)) {
            policyIdsToDelete.push(
              ...this.getLegacyPoliciesForAllSpaces(config, privateLocation.id, allSpaces)
            );
          }
        }
      }
    }

    if (policyIdsToDelete.length > 0) {
      const result = await this.server.fleet.packagePolicyService.delete(
        soClient,
        esClient,
        policyIdsToDelete,
        {
          force: true,
          asyncDeploy: true,
        }
      );
      const failedPolicies = result?.filter((policy) => {
        return !policy.success && policy?.statusCode !== 404;
      });
      if (failedPolicies?.length === policyIdsToDelete.length) {
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

  async getAllSpacesWhereMonitorsExist() {
    const soClient = this.server.coreStart.savedObjects.createInternalRepository();
    const monitorIds = await soClient.find<
      unknown,
      {
        spaces: {
          buckets: Array<{ key: string; doc_count: number }>;
        };
        legacySpaces: {
          buckets: Array<{ key: string; doc_count: number }>;
        };
      }
    >({
      type: syntheticsMonitorSOTypes,
      perPage: 0,
      namespaces: [ALL_SPACES_ID],
      fields: [],
      aggs: {
        spaces: {
          terms: { field: `${syntheticsMonitorSavedObjectType}.namespaces`, size: 1000 },
        },
        legacySpaces: {
          terms: { field: `${legacySyntheticsMonitorTypeSingle}.namespaces`, size: 1000 },
        },
      },
    });
    const { spaces, legacySpaces } = monitorIds.aggregations || {};

    const monitorSpaces = spaces?.buckets.map((b) => b.key) || [];
    const legacySpacesIds = legacySpaces?.buckets.map((b) => b.key) || [];

    return Array.from(new Set([...monitorSpaces, ...legacySpacesIds]));
  }

  getLegacyPoliciesForAllSpaces(
    config: HeartbeatConfig,
    locationsId: string,
    spaces: string[]
  ): string[] {
    const listOfPolicies: string[] = [];
    for (const spaceId of spaces) {
      const legacyPolicyIds = getLegacyPolicyId(config, locationsId, spaceId);
      listOfPolicies.push(legacyPolicyIds);
    }

    return listOfPolicies;
  }

  async deleteLegacyPolicies(configs: HeartbeatConfig[], spaceId: string): Promise<void> {
    const soClient = this.server.coreStart.savedObjects.createInternalRepository();
    const listOfPolicies: string[] = [];
    for (const config of configs) {
      const { locations } = config;
      const monitorPrivateLocations = locations.filter((loc) => !loc.isServiceManaged);
      for (const privateLocation of monitorPrivateLocations) {
        const legacyPolicyId = getLegacyPolicyId(config, privateLocation.id, spaceId);
        listOfPolicies.push(legacyPolicyId);
      }
    }

    if (listOfPolicies.length === 0) {
      return;
    }

    await this.server.fleet.packagePolicyService.delete(soClient, undefined, listOfPolicies, {
      force: true,
      asyncDeploy: true,
    });
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

const getPolicyId = (config: { origin?: string; id: string }, locId: string): string => {
  return `${config.id}-${locId}`;
};

export const getPolicyIdsForLocations = (
  config: { origin?: string; id: string },
  locationIds: string[]
) => {
  return locationIds.map((locId) => getPolicyId(config, locId));
};

const getLegacyPolicyId = (
  config: { origin?: string; id: string },
  locId: string,
  spaceId: string
) => {
  if (config[ConfigKey.MONITOR_SOURCE_TYPE] === SourceType.PROJECT) {
    return `${config.id}-${locId}`;
  }
  return `${config.id}-${locId}-${spaceId}`;
};

const getLegacyPolicyIdsForLocations = (
  config: { origin?: string; id: string },
  locationIds: string[],
  spaceId: string
) => {
  return locationIds.map((locId) => getLegacyPolicyId(config, locId, spaceId));
};
