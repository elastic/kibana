/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  BulkInstallResponse,
  IBulkInstallPackageError,
} from '@kbn/fleet-plugin/server/services/epm/packages';
import {
  bulkInstallPackages,
  getInstalledPackages,
  getPackages,
} from '@kbn/fleet-plugin/server/services/epm/packages';

import type {
  ElasticsearchClient,
  IScopedClusterClient,
  Logger,
  SavedObjectsClientContract,
} from '@kbn/core/server';
import type { DataViewsService } from '@kbn/data-views-plugin/common';
import type { MlJobStats } from '@elastic/elasticsearch/lib/api/types';
import type { Installable, RegistrySearchResult } from '@kbn/fleet-plugin/common';
import type { GetPrivilegedAccessDetectionPackageStatusResponse } from '../../../../../common/api/entity_analytics/privilege_monitoring/privileged_access_detection/status.gen';

interface PadPackageInstallationClientOpts {
  logger: Logger;
  clusterClient: IScopedClusterClient;
  namespace: string;
  soClient: SavedObjectsClientContract;
  dataViewsService: DataViewsService;
}

export interface PadMlJob {
  jobId: string;
  description: string | undefined;
  state: string;
}

interface JobStatsByJobId {
  [key: string]: MlJobStats;
}

export class PadPackageInstallationClient {
  private readonly esClient: ElasticsearchClient;
  private readonly soClient: SavedObjectsClientContract;

  constructor(private readonly opts: PadPackageInstallationClientOpts) {
    this.esClient = opts.clusterClient.asCurrentUser;
    this.soClient = opts.soClient;
  }

  private log(level: Exclude<keyof Logger, 'get' | 'log' | 'isLevelEnabled'>, msg: string) {
    this.opts.logger[level](
      `[Privileged access detection] [namespace: ${this.opts.namespace}] ${msg}`
    );
  }

  private async getCurrentlyInstalledPADPackage() {
    const installedPadPackages = await getInstalledPackages({
      savedObjectsClient: this.soClient,
      esClient: this.esClient,
      nameQuery: 'pad',
      perPage: 100,
      sortOrder: 'asc',
    });
    return installedPadPackages.items.find((installedPackage) => installedPackage.name === 'pad');
  }

  private async getJobs() {
    const jobs = (await this.esClient.ml.getJobs({ job_id: 'pad' })).jobs.filter(
      (each) => each.custom_settings.created_by === 'ml-module-pad'
    );

    const jobStatsByJobId = (await this.esClient.ml.getJobStats({ job_id: 'pad' })).jobs.reduce(
      (accumulator, nextJobStats) => ({ ...accumulator, [nextJobStats.job_id]: nextJobStats }),
      {} as JobStatsByJobId
    );

    return jobs.map((eachJob) => ({
      job_id: eachJob.job_id,
      description: eachJob.description,
      state: jobStatsByJobId[eachJob.job_id].state,
    }));
  }

  public async getStatus(): Promise<GetPrivilegedAccessDetectionPackageStatusResponse> {
    const packageInstalled = !!(await this.getCurrentlyInstalledPADPackage());
    const packageInstallationStatus = packageInstalled ? 'complete' : 'incomplete';
    if (!packageInstalled) {
      // even if there happen to be jobs that match our search criteria, if the package is not installed, we consider the ML installation incomplete and the jobs to not be associated with our privileged access detection usage
      return {
        package_installation_status: packageInstallationStatus,
        ml_module_setup_status: 'incomplete',
        jobs: [],
      };
    }

    try {
      const jobs = await this.getJobs();

      const mlModuleSetupStatus = jobs.length > 0 ? 'complete' : 'incomplete';

      return {
        package_installation_status: packageInstallationStatus,
        ml_module_setup_status: mlModuleSetupStatus,
        jobs,
      };
    } catch (e) {
      this.log(
        'info',
        'The privileged access detection package is installed, but the ML jobs are not yet set up.'
      );
      return {
        package_installation_status: packageInstallationStatus,
        ml_module_setup_status: 'incomplete',
        jobs: [],
      };
    }
  }

  private async getPrivilegedAccessDetectionPackageFromRegistry() {
    return (
      await getPackages({
        savedObjectsClient: this.soClient,
        category: 'security',
        prerelease: true,
      })
    ).find((availablePackage) => availablePackage.name === 'pad');
  }

  public async installPrivilegedAccessDetectionPackage() {
    const alreadyInstalledPadPackage = await this.getCurrentlyInstalledPADPackage();
    if (alreadyInstalledPadPackage) {
      return {
        message: 'Privileged access detection package was already installed.',
      };
    }

    const availablePadPackage = await this.getPrivilegedAccessDetectionPackageFromRegistry();

    if (!availablePadPackage) {
      this.log('info', 'Privileged access detection package was not found');
      throw new Error('Privileged access detection package was not found.');
    }

    const installationResponse = await this.installPackage(availablePadPackage);

    if (!installationResponse || this.isInstallError(installationResponse)) {
      throw new Error(
        `Failed to install privileged access detection package. ${installationResponse?.error}`
      );
    }
    return {
      message: 'Successfully installed privileged access detection package.',
    };
  }

  /**
   * A type guard function to determine if the bulk package installation response is an error type
   *
   * @param potentialInstallResponseError the `BulkInstallResponse` to check type of
   */
  private isInstallError = (
    potentialInstallResponseError: BulkInstallResponse
  ): potentialInstallResponseError is IBulkInstallPackageError => {
    return (potentialInstallResponseError as IBulkInstallPackageError).error !== undefined;
  };

  private async installPackage(installablePackage: Installable<RegistrySearchResult>) {
    this.log(
      'info',
      `Installing Privileged Access Detection package: ${installablePackage.name} ${installablePackage.version}`
    );

    const bulkInstallResponse = await bulkInstallPackages({
      savedObjectsClient: this.soClient,
      packagesToInstall: [
        { name: installablePackage.name, version: installablePackage.version, prerelease: true },
      ],
      esClient: this.esClient,
      spaceId: this.opts.namespace,
      skipIfInstalled: true,
      force: true,
    });
    return bulkInstallResponse.length > 0 ? bulkInstallResponse[0] : undefined;
  }
}
