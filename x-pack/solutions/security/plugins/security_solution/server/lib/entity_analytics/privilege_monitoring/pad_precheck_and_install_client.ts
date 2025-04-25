/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  Logger,
  IScopedClusterClient,
  ISavedObjectTypeRegistry,
  ElasticsearchClient,
  SavedObjectsClientContract,
} from '@kbn/core/server';

import {
  getInstalledPackages,
  getPackages,
  bulkInstallPackages,
} from '@kbn/fleet-plugin/server/services/epm/packages';

interface PadPrecheckAndInstallClientOpts {
  logger: Logger;
  clusterClient: IScopedClusterClient;
  namespace: string;
  soClient: SavedObjectsClientContract;
  soTypeRegistry: ISavedObjectTypeRegistry;
}

export class PadPrecheckAndInstallClient {
  private esClient: ElasticsearchClient;
  private soClient: SavedObjectsClientContract;
  private soTypeRegistry: ISavedObjectTypeRegistry;
  private installationStatus: Record<string, unknown> = {};

  constructor(private readonly opts: PadPrecheckAndInstallClientOpts) {
    this.esClient = opts.clusterClient.asCurrentUser;
    this.soClient = opts.soClient;
    this.soTypeRegistry = opts.soTypeRegistry;
  }

  private log(level: Exclude<keyof Logger, 'get' | 'log' | 'isLevelEnabled'>, msg: string) {
    this.opts.logger[level](
      `[PAD Pre-check and installation] [namespace: ${this.opts.namespace}] ${msg}`
    );
  }

  private async isMlEnabled(): Promise<boolean> {
    try {
      await this.esClient.ml.info();
      this.log('debug', 'ML is enabled');
      return true;
    } catch (err) {
      if (err?.body?.error?.type === 'x_pack_feature_disabled_exception') {
        this.log('debug', 'ML is disabled');
        return false;
      }
      throw err;
    }
  }

  private async fetchMlJobs(jobPrefix: string) {
    const allJobs = await this.esClient.ml.getJobs();
    const stats = await this.esClient.ml.getJobStats({ job_id: `${jobPrefix}*` });

    return stats.jobs.map((job) => ({
      job_id: job.job_id,
      state: job.state,
      open_time: job.open_time,
      model_size_stats: job.model_size_stats,
      data_counts: job.data_counts,
      node: job.node,
    }));
  }

  private async installPadIntegration() {
    const { soClient, namespace } = this.opts;

    const installed = await getInstalledPackages({
      savedObjectsClient: soClient,
      esClient: this.esClient,
      perPage: 100,
      sortOrder: 'asc',
    });
    const padPackage = installed.items.find((pkg) => pkg.name === 'pad');

    if (padPackage) {
      this.installationStatus.pad_integration_package = {
        status: padPackage.status,
        version: padPackage.version,
        title: padPackage.title,
        description: padPackage.description,
      };
      this.log('debug', `PAD package already installed: ${padPackage.version}`);
      return;
    }

    const available = await getPackages({
      savedObjectsClient: soClient,
      category: 'security',
      prerelease: true,
    });
    const availablePad = available.find((pkg) => pkg.name === 'pad');

    if (!availablePad) {
      this.installationStatus.pad_integration_package = { status: 'not_found' };
      this.log('info', 'PAD package not found');
      return;
    }

    await bulkInstallPackages({
      savedObjectsClient: soClient,
      packagesToInstall: [
        { name: availablePad.name, version: availablePad.version, prerelease: true },
      ],
      esClient: this.esClient,
      spaceId: namespace,
      skipIfInstalled: false,
      force: true,
    });

    this.installationStatus.pad_integration_package = {
      status: 'installed',
      version: availablePad.version,
    };
    this.log('debug', `PAD package installed: ${availablePad.version}`);
  }

  public async runPadPrecheckAndInstall(): Promise<Record<string, unknown>> {
    const mlEnabled = await this.isMlEnabled();
    this.installationStatus.ml_enabled = mlEnabled;

    await this.installPadIntegration();

    try {
      const mlJobs = await this.fetchMlJobs('pad');
      this.installationStatus.ml_jobs = {
        count: mlJobs.length,
        jobs: mlJobs,
      };
    } catch (err) {
      this.log('error', `Failed fetching ML jobs: ${err.message}`);
      this.installationStatus.ml_jobs = { error: err.message };
    }

    return this.installationStatus;
  }
}
