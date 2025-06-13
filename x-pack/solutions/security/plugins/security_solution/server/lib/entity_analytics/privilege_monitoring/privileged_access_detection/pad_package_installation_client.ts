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

  public async getStatus(): Promise<{
    packageInstallationStatus: string;
    mlModuleSetupStatus: string;
    jobs: PadMlJob[];
  }> {
    const packageInstalled = !!(await this.getCurrentlyInstalledPADPackage());
    const packageInstallationStatus = packageInstalled ? 'COMPLETE' : 'INCOMPLETE';
    if (!packageInstalled) {
      return { packageInstallationStatus, mlModuleSetupStatus: 'INCOMPLETE', jobs: [] };
    }

    const jobs = (await this.esClient.ml.getJobs({ job_id: 'pad' })).jobs.filter(
      (each) => each.custom_settings.created_by === 'ml-module-pad'
    );

    const jobStatsByJobId = (await this.esClient.ml.getJobStats({ job_id: 'pad' })).jobs.reduce(
      (accumulator, nextJobStats) => ({ ...accumulator, [nextJobStats.job_id]: nextJobStats }),
      {} as JobStatsByJobId
    );

    const enrichedJobs = jobs.map((eachJob) => ({
      jobId: eachJob.job_id,
      description: eachJob.description,
      state: jobStatsByJobId[eachJob.job_id].state,
    }));

    const mlModuleSetupStatus = enrichedJobs.length > 0 ? 'COMPLETE' : 'INCOMPLETE';

    return {
      packageInstallationStatus,
      mlModuleSetupStatus,
      jobs: enrichedJobs,
    };
  }

  public async installPrivilegedAccessDetectionPackage() {
    const alreadyInstalledPadPackage = await this.getCurrentlyInstalledPADPackage();
    if (alreadyInstalledPadPackage) {
      return {
        status_code: 200,
        message: 'Privileged access detection package was already installed.',
      };
    }
    const availablePadPackage = (
      await getPackages({
        savedObjectsClient: this.soClient,
        category: 'security',
        prerelease: true,
      })
    ).find((availablePackage) => availablePackage.name === 'pad');

    if (!availablePadPackage) {
      this.log('info', 'Privileged access detection package was not found');
      return { status_code: 404, message: 'Privileged access detection package was not found.' };
    }

    this.log(
      'info',
      `Installing Privileged Access Detection package: ${availablePadPackage.name} ${availablePadPackage.version}`
    );

    const installResponse = await bulkInstallPackages({
      savedObjectsClient: this.soClient,
      packagesToInstall: [
        { name: availablePadPackage.name, version: availablePadPackage.version, prerelease: true },
      ],
      esClient: this.esClient,
      spaceId: this.opts.namespace,
      skipIfInstalled: true,
      force: true,
    });

    const isInstallError = (
      potentialInstallResponseError: BulkInstallResponse
    ): potentialInstallResponseError is IBulkInstallPackageError => {
      return (potentialInstallResponseError as IBulkInstallPackageError).error !== undefined;
    };

    const padInstallResponse = installResponse.length > 0 ? installResponse[0] : undefined;
    if (!padInstallResponse || isInstallError(padInstallResponse)) {
      return {
        status_code: 500,
        message: `Failed to install privileged access detection package. ${padInstallResponse?.error}`,
      };
    }
    return {
      status_code: 200,
      message: 'Successfully installed privileged access detection package.',
    };
  }
}
