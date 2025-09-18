/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  ConcreteTaskInstance,
  TaskManagerSetupContract,
} from '@kbn/task-manager-plugin/server';
import moment from 'moment';
import type { SavedObjectsClientContract } from '@kbn/core-saved-objects-api-server';
import type { PackagePolicy } from '@kbn/fleet-plugin/common';
import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import { MonitorConfigRepository } from '../services/monitor_config_repository';
import { parseArrayFilters } from '../routes/common';
import type { EncryptedSyntheticsMonitorAttributes } from '../../common/runtime_types';
import type { SyntheticsServerSetup } from '../types';
import {
  BROWSER_TEST_NOW_RUN,
  LIGHTWEIGHT_TEST_NOW_RUN,
} from '../synthetics_service/synthetics_monitor/synthetics_monitor_client';

const SYNTHETICS_SERVICE_CLEAN_UP_TASK_TYPE = 'Synthetics:Clean-Up-Package-Policies';
const SYNTHETICS_SERVICE_CLEAN_UP_TASK_ID = 'SyntheticsService:clean-up-package-policies-task-id';
const SYNTHETICS_SERVICE_CLEAN_UP_INTERVAL_DEFAULT = '1m';
const DELETE_BROWSER_MINUTES = 15;
const DELETE_LIGHTWEIGHT_MINUTES = 2;

export const registerCleanUpTask = (
  taskManager: TaskManagerSetupContract,
  serverSetup: SyntheticsServerSetup
) => {
  const { logger } = serverSetup;
  const interval = SYNTHETICS_SERVICE_CLEAN_UP_INTERVAL_DEFAULT;

  taskManager.registerTaskDefinitions({
    [SYNTHETICS_SERVICE_CLEAN_UP_TASK_TYPE]: {
      title: 'Synthetics Plugin Clean Up Task',
      description: 'This task which runs periodically to clean up run once monitors.',
      timeout: '1m',
      maxAttempts: 3,

      createTaskRunner: ({ taskInstance }: { taskInstance: ConcreteTaskInstance }) => {
        return {
          // Perform the work of the task. The return value should fit the TaskResult interface.
          async run() {
            logger.debug(
              `Executing synthetics clean up task: ${SYNTHETICS_SERVICE_CLEAN_UP_TASK_ID}`
            );
            const { state } = taskInstance;
            try {
              const esClient = serverSetup.coreStart?.elasticsearch?.client.asInternalUser;
              if (esClient) {
                const { fleet } = serverSetup.pluginsStart;
                const { savedObjects } = serverSetup.coreStart;
                const soClient = savedObjects.createInternalRepository();

                await cleanUpDuplicatedPackagePolicies(serverSetup, soClient, esClient);

                const { items } = await fleet.packagePolicyService.list(soClient, {
                  kuery: getFilterForTestNowRun(),
                });

                const allItems = items.map((item) => {
                  const minutesAgo = moment().diff(moment(item.created_at), 'minutes');
                  const isBrowser = item.name === BROWSER_TEST_NOW_RUN;
                  if (isBrowser) {
                    return {
                      isBrowser: true,
                      id: item.id,
                      shouldDelete: minutesAgo > DELETE_BROWSER_MINUTES,
                    };
                  } else {
                    return {
                      isBrowser: false,
                      id: item.id,
                      shouldDelete: minutesAgo > DELETE_LIGHTWEIGHT_MINUTES,
                    };
                  }
                });
                const toDelete = allItems.filter((item) => item.shouldDelete);
                if (toDelete.length > 0) {
                  await fleet.packagePolicyService.delete(
                    soClient,
                    esClient,
                    toDelete.map((item) => item.id),
                    {
                      force: true,
                      spaceIds: ['*'],
                    }
                  );
                }
                const remaining = allItems.filter((item) => !item.shouldDelete);
                if (remaining.length === 0) {
                  return { state, schedule: { interval: '5m' } };
                } else {
                  return { state, schedule: { interval: '5m' } };
                }
              }
            } catch (e) {
              logger.error(e);
            }

            return { state, schedule: { interval } };
          },
        };
      },
    },
  });
};

export const scheduleCleanUpTask = async ({ logger, pluginsStart }: SyntheticsServerSetup) => {
  const interval = SYNTHETICS_SERVICE_CLEAN_UP_INTERVAL_DEFAULT;

  try {
    await pluginsStart.taskManager.removeIfExists(SYNTHETICS_SERVICE_CLEAN_UP_TASK_ID);
    const taskInstance = await pluginsStart.taskManager.ensureScheduled({
      id: SYNTHETICS_SERVICE_CLEAN_UP_TASK_ID,
      taskType: SYNTHETICS_SERVICE_CLEAN_UP_TASK_TYPE,
      schedule: {
        interval,
      },
      params: {},
      state: {},
      scope: ['uptime'],
    });

    logger?.debug(
      `Task ${SYNTHETICS_SERVICE_CLEAN_UP_TASK_ID} scheduled with interval ${taskInstance.schedule?.interval}.`
    );

    await pluginsStart.taskManager.runSoon(SYNTHETICS_SERVICE_CLEAN_UP_TASK_ID);
  } catch (e) {
    logger?.error(e);
    logger?.error(
      `Error running synthetics clean up task: ${SYNTHETICS_SERVICE_CLEAN_UP_TASK_ID}, ${e?.message}`
    );
  }
};

const getFilterForTestNowRun = () => {
  const pkg = 'ingest-package-policies';

  let filter = `${pkg}.package.name:synthetics and ${pkg}.is_managed:true`;
  const lightweight = `${pkg}.name: ${LIGHTWEIGHT_TEST_NOW_RUN}`;
  const browser = `${pkg}.name: ${BROWSER_TEST_NOW_RUN}`;
  filter = `${filter} and (${lightweight} or ${browser})`;
  return filter;
};

interface PackagePolicyInfo {
  packagePolicyId: string;
  policyName: string;
  monitorName: string;
  locationId: string;
  locationName: string;
  spaces: string[];
}

async function cleanUpDuplicatedPackagePolicies(
  serverSetup: SyntheticsServerSetup,
  soClient: SavedObjectsClientContract,
  esClient: ElasticsearchClient
) {
  const { fleet } = serverSetup.pluginsStart;
  const { logger } = serverSetup;
  const monRepository = new MonitorConfigRepository(
    soClient,
    serverSetup.encryptedSavedObjects.getClient()
  );

  try {
    const pkg = 'ingest-package-policies';

    const policiesIterator = await fleet.packagePolicyService.fetchAllItems(soClient, {
      kuery: `${pkg}.package.name:synthetics and ${pkg}.is_managed:true`,
      spaceIds: ['*'],
      perPage: 100,
    });
    const packagePoliciesToDelete: string[] = [];

    const configIdSpacesMap = new Map<string, Array<string>>();
    const allConfigIdsMap = new Map<string, Array<PackagePolicyInfo>>();
    for await (const packagePolicies of policiesIterator) {
      const configIdsMap = new Map<string, Array<PackagePolicyInfo>>();
      for (const packagePolicy of packagePolicies) {
        const { configId, ...info } = findInfoFromPackagePolicy(packagePolicy);
        if (configId) {
          configIdsMap.set(configId, (configIdsMap.get(configId) ?? []).concat(info));
        }
      }
      const { filtersStr } = parseArrayFilters({
        configIds: Array.from(configIdsMap.keys()),
      });
      const monitors = (
        await monRepository.find<EncryptedSyntheticsMonitorAttributes>({
          filter: filtersStr,
          fields: ['name', 'locations', 'spaces'],
          namespaces: ['*'],
        })
      ).saved_objects;
      const missingConfigIds = Array.from(configIdsMap.keys()).filter(
        (id) => !monitors.find((monitor) => monitor.id === id)
      );
      packagePoliciesToDelete.push(
        ...(missingConfigIds
          .map((configId) => {
            return configIdsMap.get(configId)?.[0]?.packagePolicyId;
          })
          .filter(Boolean) as string[])
      );
      monitors.forEach((monitor) => {
        const kSpace = (monitor.attributes?.spaces as string[]) ?? [];
        if (kSpace.length) {
          configIdSpacesMap.set(monitor.id, kSpace);
        } else {
          configIdSpacesMap.set(monitor.id, monitor.namespaces!);
        }
      });
      // merge configIdsMap with allConfigIdsMap
      for (const [configId, pInfo] of configIdsMap) {
        const allPackagePolicies = allConfigIdsMap.get(configId) ?? [];
        allPackagePolicies.push(...pInfo);
        allConfigIdsMap.set(configId, allPackagePolicies);
      }
    }
    const configsWithMultiplePackagePolicies = Array.from(allConfigIdsMap.entries()).filter(
      ([_, packagePolicies]) => packagePolicies.length > 1
    );

    for (const [configId, packagePolicies] of configsWithMultiplePackagePolicies) {
      // check if locationId is same in some of package policies
      const locationIds = packagePolicies.map((p) => p.locationId);
      const duplicatedLocationsIds = findDuplicates(locationIds);
      const configIdSpace = configIdSpacesMap.get(configId);
      packagePolicies.forEach((p) => {
        if (
          Array.isArray(p.spaces) &&
          p.spaces.length > 1 &&
          configIdSpace?.length === 1 &&
          duplicatedLocationsIds.includes(p.locationId)
        ) {
          packagePoliciesToDelete.push(p.packagePolicyId);
        }
      });
    }

    if (packagePoliciesToDelete.length > 0) {
      logger.info(
        ` [PrivateLocationCleanUpTask] Found ${
          packagePoliciesToDelete.length
        } package policies to delete: ${packagePoliciesToDelete.join(', ')}`
      );
      await fleet.packagePolicyService.delete(soClient, esClient, packagePoliciesToDelete, {
        force: true,
        spaceIds: ['*'],
      });
    }
  } catch (e) {
    serverSetup.logger.error(e);
  }
}

const findInfoFromPackagePolicy = (packagePolicy: PackagePolicy) => {
  const currentInput = packagePolicy.inputs.find((input) => input.enabled);
  let configId = '';
  const enabledStream = currentInput?.streams.find((stream) =>
    Object.values(MonitorTypes).includes(stream.data_stream.dataset as MonitorTypes)
  );
  const dataProcessor = enabledStream?.compiled_stream?.processors;
  if (dataProcessor) {
    configId = dataProcessor?.[0].add_fields?.fields?.config_id;
  }
  return {
    configId,
    packagePolicyId: packagePolicy.id,
    policyName: packagePolicy.name,
    spaces: dataProcessor?.[0].add_fields?.fields?.meta.space_id ?? [],
    monitorName: String(enabledStream?.compiled_stream.name),
    locationId: String(enabledStream?.vars?.location_id.value),
    locationName: String(enabledStream?.vars?.location_name.value),
  };
};

function findDuplicates(arr: string[]): string[] {
  const seen = new Set<string>();
  const duplicates = new Set<string>();

  for (const item of arr) {
    if (seen.has(item)) duplicates.add(item);
    else seen.add(item);
  }

  return [...duplicates];
}

enum MonitorTypes {
  HTTP = 'http',
  TCP = 'tcp',
  ICMP = 'icmp',
  BROWSER = 'browser',
}
