/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  PluginInitializerContext,
  CoreSetup,
  CoreStart,
  Plugin,
  Logger,
  SavedObjectsClientContract,
  ElasticsearchClient,
} from '@kbn/core/server';
import type { DeepReadonly } from 'utility-types';
import {
  type PostDeletePackagePoliciesResponse,
  type PackagePolicy,
  type NewPackagePolicy,
  type UpdatePackagePolicy,
  FleetError,
} from '@kbn/fleet-plugin/common';
import type {
  TaskManagerSetupContract,
  TaskManagerStartContract,
} from '@kbn/task-manager-plugin/server';
import type {
  CspBenchmarkRule,
  CspSettings,
} from '@kbn/cloud-security-posture-common/schema/rules/latest';
import {
  CDR_LATEST_NATIVE_MISCONFIGURATIONS_INDEX_ALIAS,
  DEPRECATED_CDR_LATEST_NATIVE_MISCONFIGURATIONS_INDEX_PATTERN,
} from '@kbn/cloud-security-posture-common';
import semver from 'semver';
import { isCspPackage } from '../common/utils/helpers';
import { isSubscriptionAllowed } from '../common/utils/subscription';
import { cleanupCredentials } from '../common/utils/helpers';
import type {
  CspServerPluginSetup,
  CspServerPluginStart,
  CspServerPluginSetupDeps,
  CspServerPluginStartDeps,
  CspServerPluginStartServices,
} from './types';
import { setupRoutes } from './routes/setup_routes';
import { cspBenchmarkRule, cspSettings } from './saved_objects';
import { initializeCspIndices } from './create_indices/create_indices';
import {
  deletePreviousTransformsVersions,
  initializeCspTransforms,
} from './create_transforms/create_transforms';
import { isCspPackagePolicyInstalled } from './fleet_integration/fleet_integration';
import { CLOUD_SECURITY_POSTURE_PACKAGE_NAME } from '../common/constants';
import {
  removeFindingsStatsTask,
  scheduleFindingsStatsTask,
  setupFindingsStatsTask,
} from './tasks/findings_stats_task';
import { registerCspmUsageCollector } from './lib/telemetry/collectors/register';
import { CloudSecurityPostureConfig } from './config';

export class CspPlugin
  implements
    Plugin<
      CspServerPluginSetup,
      CspServerPluginStart,
      CspServerPluginSetupDeps,
      CspServerPluginStartDeps
    >
{
  private readonly logger: Logger;
  private readonly config: CloudSecurityPostureConfig;
  private isCloudEnabled?: boolean;

  /**
   * CSP is initialized when the Fleet package is installed.
   * either directly after installation, or
   * when the plugin is started and a package is present.
   */
  #isInitialized: boolean = false;

  constructor(initializerContext: PluginInitializerContext<CloudSecurityPostureConfig>) {
    this.logger = initializerContext.logger.get();
    this.config = initializerContext.config.get();
  }

  public setup(
    core: CoreSetup<CspServerPluginStartDeps, CspServerPluginStart>,
    plugins: CspServerPluginSetupDeps
  ): CspServerPluginSetup {
    core.savedObjects.registerType<CspBenchmarkRule>(cspBenchmarkRule);
    core.savedObjects.registerType<CspSettings>(cspSettings);

    setupRoutes({
      core,
      logger: this.logger,
      isPluginInitialized: () => this.#isInitialized,
    });

    const coreStartServices = core.getStartServices();
    this.setupCspTasks(plugins.taskManager, coreStartServices, this.logger);
    registerCspmUsageCollector(this.logger, coreStartServices, plugins.usageCollection);

    this.isCloudEnabled = plugins.cloud.isCloudEnabled;

    return {};
  }

  public start(core: CoreStart, plugins: CspServerPluginStartDeps): CspServerPluginStart {
    plugins.fleet
      .fleetSetupCompleted()
      .then(async () => {
        const packageInfo = await plugins.fleet.packageService.asInternalUser.getInstallation(
          CLOUD_SECURITY_POSTURE_PACKAGE_NAME
        );

        // If package is installed we want to make sure all needed assets are installed
        if (packageInfo) {
          this.initialize(core, plugins.taskManager, packageInfo.install_version).catch(() => {});
        }

        plugins.fleet.registerExternalCallback(
          'packagePolicyCreate',
          async (packagePolicy: NewPackagePolicy): Promise<NewPackagePolicy> => {
            const license = await plugins.licensing.getLicense();
            if (isCspPackage(packagePolicy.package?.name)) {
              if (!isSubscriptionAllowed(this.isCloudEnabled, license)) {
                throw new FleetError(
                  'To use this feature you must upgrade your subscription or start a trial'
                );
              }

              if (!isSingleEnabledInput(packagePolicy.inputs)) {
                throw new FleetError('Only one enabled input is allowed per policy');
              }
            }

            return packagePolicy;
          }
        );

        plugins.fleet.registerExternalCallback(
          'packagePolicyCreate',
          async (
            packagePolicy: NewPackagePolicy,
            soClient: SavedObjectsClientContract
          ): Promise<NewPackagePolicy> => {
            if (isCspPackage(packagePolicy.package?.name)) {
              return cleanupCredentials(packagePolicy);
            }

            return packagePolicy;
          }
        );

        plugins.fleet.registerExternalCallback(
          'packagePolicyUpdate',
          async (
            packagePolicy: UpdatePackagePolicy,
            soClient: SavedObjectsClientContract,
            esClient: ElasticsearchClient
          ): Promise<UpdatePackagePolicy> => {
            if (isCspPackage(packagePolicy.package?.name)) {
              const isIntegrationVersionIncludesTransformAsset = isTransformAssetIncluded(
                packagePolicy.package!.version
              );
              await deletePreviousTransformsVersions(
                esClient,
                isIntegrationVersionIncludesTransformAsset,
                this.logger
              );
              return cleanupCredentials(packagePolicy);
            }

            return packagePolicy;
          }
        );

        plugins.fleet.registerExternalCallback(
          'packagePolicyPostCreate',
          async (
            packagePolicy: PackagePolicy,
            soClient: SavedObjectsClientContract
          ): Promise<PackagePolicy> => {
            if (isCspPackage(packagePolicy.package?.name)) {
              await this.initialize(core, plugins.taskManager, packagePolicy.package!.version);
              return packagePolicy;
            }

            return packagePolicy;
          }
        );

        plugins.fleet.registerExternalCallback(
          'packagePolicyPostDelete',
          async (deletedPackagePolicies: DeepReadonly<PostDeletePackagePoliciesResponse>) => {
            for (const deletedPackagePolicy of deletedPackagePolicies) {
              if (isCspPackage(deletedPackagePolicy.package?.name)) {
                const soClient = core.savedObjects.createInternalRepository();
                const packagePolicyService = plugins.fleet.packagePolicyService;
                const isPackageExists = await isCspPackagePolicyInstalled(
                  packagePolicyService,
                  soClient,
                  this.logger
                );
                if (!isPackageExists) {
                  await this.uninstallResources(plugins.taskManager, this.logger);
                }
              }
            }
          }
        );
      })
      .catch(() => {}); // it shouldn't reject, but just in case

    return {};
  }

  public stop() {}

  /**
   * Initialization is idempotent and required for (re)creating indices and transforms.
   */
  async initialize(
    core: CoreStart,
    taskManager: TaskManagerStartContract,
    packagePolicyVersion: string
  ): Promise<void> {
    this.logger.debug('initialize');
    const esClient = core.elasticsearch.client.asInternalUser;
    const isIntegrationVersionIncludesTransformAsset =
      isTransformAssetIncluded(packagePolicyVersion);
    await initializeCspIndices(
      esClient,
      this.config,
      isIntegrationVersionIncludesTransformAsset,
      this.logger
    );
    await initializeCspTransforms(
      esClient,
      isIntegrationVersionIncludesTransformAsset,
      this.logger
    );
    await scheduleFindingsStatsTask(taskManager, this.logger);
    await this.initializeIndexAlias(esClient, this.logger);
    this.#isInitialized = true;
  }

  // For integration versions earlier than 2.00, we will manually create an index alias for the deprecated latest index 'logs-cloud_security_posture.findings_latest-default'.
  // For integration versions 2.00 and above, the index alias will be automatically created or updated as part of the Transform setup.
  initializeIndexAlias = async (esClient: ElasticsearchClient, logger: Logger): Promise<void> => {
    const isAliasExists = await esClient.indices.existsAlias({
      name: CDR_LATEST_NATIVE_MISCONFIGURATIONS_INDEX_ALIAS,
    });

    const isDeprecatedLatestIndexExists = await esClient.indices.exists({
      index: DEPRECATED_CDR_LATEST_NATIVE_MISCONFIGURATIONS_INDEX_PATTERN,
    });

    // This handles the following scenarios:
    // 1. A customer using an older integration version (pre-2.00) who has upgraded their Kibana stack.
    // 2. A customer with a new Kibana stack who installs an integration version earlier than 2.00 for the first time (e.g., in a serverless environment).
    if (isDeprecatedLatestIndexExists && !isAliasExists) {
      try {
        await esClient.indices.updateAliases({
          actions: [
            {
              add: {
                index: DEPRECATED_CDR_LATEST_NATIVE_MISCONFIGURATIONS_INDEX_PATTERN,
                alias: CDR_LATEST_NATIVE_MISCONFIGURATIONS_INDEX_ALIAS,
                is_write_index: true,
              },
            },
          ],
        });
        this.logger.info(
          `Index alias ${CDR_LATEST_NATIVE_MISCONFIGURATIONS_INDEX_ALIAS} created successfully`
        );
      } catch (error) {
        this.logger.error(
          `Failed to create index alias ${CDR_LATEST_NATIVE_MISCONFIGURATIONS_INDEX_ALIAS}`,
          error
        );
        throw error;
      }
    }
  };

  async uninstallResources(taskManager: TaskManagerStartContract, logger: Logger): Promise<void> {
    await removeFindingsStatsTask(taskManager, logger);
  }

  setupCspTasks(
    taskManager: TaskManagerSetupContract,
    coreStartServices: CspServerPluginStartServices,
    logger: Logger
  ) {
    setupFindingsStatsTask(taskManager, coreStartServices, logger);
  }
}

const isSingleEnabledInput = (inputs: NewPackagePolicy['inputs']): boolean =>
  inputs.filter((i) => i.enabled).length === 1;

const isTransformAssetIncluded = (integrationVersion: string): boolean => {
  const majorVersion = semver.major(integrationVersion);
  return majorVersion >= 2;
};
