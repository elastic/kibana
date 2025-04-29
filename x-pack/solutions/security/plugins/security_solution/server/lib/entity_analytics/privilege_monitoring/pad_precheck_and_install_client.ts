/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  Logger,
  IScopedClusterClient,
  ElasticsearchClient,
  SavedObjectsClientContract,
} from '@kbn/core/server';

import {
  getInstalledPackages,
  getPackages,
  bulkInstallPackages,
} from '@kbn/fleet-plugin/server/services/epm/packages';

import type { DataViewsServerPluginStart } from '@kbn/data-views-plugin/server';

interface PadPrecheckAndInstallClientOpts {
  logger: Logger;
  clusterClient: IScopedClusterClient;
  namespace: string;
  soClient: SavedObjectsClientContract;
  indexPatterns: DataViewsServerPluginStart;
}

export class PadPrecheckAndInstallClient {
  private esClient: ElasticsearchClient;
  private soClient: SavedObjectsClientContract;
  private installationStatus: Record<string, unknown> = {};
  private packageVersion: string = '';
  private indexPatterns: DataViewsServerPluginStart;

  constructor(private readonly opts: PadPrecheckAndInstallClientOpts) {
    this.esClient = opts.clusterClient.asCurrentUser;
    this.soClient = opts.soClient;
    this.indexPatterns = opts.indexPatterns;
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

  private async checkIfPadPackageInstalled() {
    const { soClient } = this.opts;
    const installed = await getInstalledPackages({
      savedObjectsClient: soClient,
      esClient: this.esClient,
      perPage: 100,
      sortOrder: 'asc',
    });
    const padPackage = installed.items.find((pkg) => pkg.name === 'pad');

    if (padPackage) {
      this.packageVersion = padPackage.version;
      this.installationStatus.pad_integration_package = {
        status: padPackage.status,
        version: padPackage.version,
        title: padPackage.title,
        description: padPackage.description,
      };
      this.log('debug', `[VERIFIED] PAD package installed: ${padPackage.version}`);
      return padPackage;
    } else {
      this.log('info', '[VERIFIED] PAD package not installed');
    }
  }

  private async isIngestPipelinePresent(pipelineName: string) {
    try {
      const pipelineResponse = await this.esClient.ingest.getPipeline({ id: pipelineName });
      this.log('debug', `[VERIFIED] Ingest pipeline exists: ${pipelineName}`);
      this.installationStatus.ingest_pipeline = {
        status: 'exists',
        pipeline_id: pipelineName,
        description:
          pipelineResponse[pipelineName]?.description || 'Custom pipeline for PAD integration',
        processors: pipelineResponse[pipelineName]?.processors || [],
      };
      return pipelineResponse;
    } catch (error) {
      this.log('info', '[VERIFIED] Ingest pipeline does not exist');
      return false;
    }
  }

  private async checkAndUpdateComponentTemplateMappings() {
    const componentTemplateName = 'logs-endpoint.events.process@custom';
    const newSettings = {
      index: {
        default_pipeline: `${this.packageVersion}-ml_pad_ingest_pipeline`,
      },
    };
    const newMappings = {
      properties: {
        process: {
          properties: {
            command_line_entropy: {
              type: 'double',
            },
          },
        },
      },
    } as const;
    try {
      const componentTemplateResponse = await this.esClient.cluster.getComponentTemplate({
        name: componentTemplateName,
      });
      const templateData =
        componentTemplateResponse.component_templates?.[0]?.component_template?.template;
      const updatedMappings = {
        ...templateData?.mappings,
        ...newMappings,
      };
      const updatedSettings = {
        ...templateData?.settings,
        ...newSettings,
      };
      await this.esClient.cluster.putComponentTemplate({
        name: componentTemplateName,
        template: {
          settings: updatedSettings,
          mappings: updatedMappings,
        },
      });
      this.installationStatus.component_template = {
        status: 'updated',
        component_template_id: componentTemplateName,
        mappings: newMappings,
      };
    } catch (error) {
      this.log('info', '[VERIFIED] Component template does not exist.. Creating a new one');
      await this.esClient.cluster.putComponentTemplate({
        name: componentTemplateName,
        template: {
          settings: newSettings,
          mappings: newMappings,
        },
      });
      this.installationStatus.component_template = {
        status: 'created',
        component_template_id: componentTemplateName,
        mappings: newMappings,
        settings: newSettings,
      };
    }
  }

  private async rollOverIndex() {
    const indexName = 'logs-endpoint.events.process-default';
    try {
      await this.esClient.indices.rollover({
        alias: indexName,
      });
    } catch (error) {
      this.log('error', `Failed to roll over index ${indexName}: ${error}`);
      this.installationStatus.rollover_index = {
        status: 'failed',
        error: error.message,
      };
    }
    this.log('debug', `Index ${indexName} rolled over successfully`);
    this.installationStatus.rollover_index = {
      status: 'success',
      index_name: indexName,
    };
  }

  private async checkHealthOfTransform() {
    const transformIdPattern = 'logs-pad.pivot_transform_*'; // wildcard to match all relevant transforms
    const response = await this.esClient.transform.getTransformStats({
      transform_id: transformIdPattern,
    });

    const transformStatus = response.transforms
      .filter(
        (transform) =>
          transform.id.startsWith('logs-pad.pivot_transform_okta_multiple_sessions') ||
          transform.id.startsWith('logs-pad.pivot_transform_windows_privilege_list')
      )
      .map((transform) => ({
        id: transform.id,
        state: transform.state,
        stats: transform.stats,
      }));
    this.log('debug', `Transform status: ${JSON.stringify(transformStatus)}`);
    this.installationStatus.transform_status = {
      status: 'success',
      transforms: transformStatus,
    };
  }

  private async checkandUpdateDataViews() {
    const title = 'logs-*,ml_okta_multiple_user_sessions_pad.all,ml_windows_privilege_type_pad.all';
    const dataViews = await this.indexPatterns.dataViewsServiceFactory(
      this.soClient,
      this.esClient
    );

    // Split title into individual patterns
    const titleArray = title.split(',');

    // Loop through titleArray and check if each data view exists
    for (const pattern of titleArray) {
      const existing = await dataViews.find(pattern); // Find data view by each pattern
      const alreadyExists = existing.some((dv) => dv.title === pattern); // Check if the data view exists

      if (!alreadyExists) {
        this.log('info', `Data view ${pattern} does not exist`);
        await dataViews.createAndSave({
          title: pattern,
          timeFieldName: '@timestamp',
          name: pattern,
        });
        this.installationStatus.data_view = {
          status: 'created',
          data_view_id: pattern,
        };
      } else {
        this.log('info', `Data view ${pattern} already exists`);
        this.installationStatus.data_view = {
          status: 'exists',
          data_view_id: pattern,
        };
      }
    }
  }

  private async installPadIntegration() {
    const { soClient, namespace } = this.opts;
    const padPackage = await this.checkIfPadPackageInstalled();

    if (padPackage) {
      this.installationStatus.pad_integration_package = {
        status: padPackage.status,
        version: padPackage.version,
        title: padPackage.title,
        description: padPackage.description,
      };
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
      this.log('info', 'PAD package not found in EPM');
      return;
    }
    this.log('debug', `Installing PAD package: ${availablePad.name} ${availablePad.version}`);
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
    await this.checkIfPadPackageInstalled();
  }

  public async runPadPrecheckAndInstall(): Promise<Record<string, unknown>> {
    const mlEnabled = await this.isMlEnabled();
    this.installationStatus.ml_enabled = mlEnabled;

    await this.installPadIntegration();

    // ############### INGEST PIPELINE #####################
    this.log('debug', 'Checking if PAD ingest pipeline present or not..');
    const pipelineName = 'logs-endpoint.events.process@custom';
    const pipelinesPresent = await this.isIngestPipelinePresent(pipelineName);
    if (!pipelinesPresent) {
      const putPipelineResponse = await this.esClient.ingest.putPipeline({
        id: pipelineName,
        description: 'Custom pipeline for PAD integration',
        processors: [
          {
            pipeline: {
              name: `${this.packageVersion}-ml_pad_ingest_pipeline`,
              on_failure: [
                {
                  set: {
                    field: '_ingest.error',
                    value: 'Failed to execute ml_pad_ingest_pipeline',
                  },
                },
              ],
            },
          },
        ],
      });
      this.log('debug', `Ingest pipeline created: ${JSON.stringify(putPipelineResponse)}`);

      // After creating pipeline, fetch it to get the details
      const createdPipeline = await this.esClient.ingest.getPipeline({ id: pipelineName });

      this.installationStatus.ingest_pipeline = {
        status: 'created',
        pipeline_id: 'logs-endpoint.events.process@custom',
        description:
          createdPipeline[pipelineName]?.description || 'Custom pipeline for PAD integration',
        processors: createdPipeline[pipelineName]?.processors || [],
      };
    } else {
      const existingProcessors = pipelinesPresent[pipelineName]?.processors || [];
      const newProcessors = {
        pipeline: {
          name: `${this.packageVersion}-ml_pad_ingest_pipeline`,
          on_failure: [
            {
              set: {
                field: '_ingest.error',
                value: 'Failed to execute ml_pad_ingest_pipeline',
              },
            },
          ],
        },
      };
      const updatedPipeline = {
        processors: [...existingProcessors, newProcessors],
      };

      try {
        const updatePipelineResponse = await this.esClient.ingest.putPipeline({
          id: pipelineName,
          body: updatedPipeline as Record<string, unknown>,
        });
        this.log('debug', `Ingest pipeline updated: ${JSON.stringify(updatePipelineResponse)}`);
      } catch (err) {
        this.log('debug', `Failed to upsert pipeline ${pipelineName}: ${err}`);
      }
    }

    // ############### COMPONENT TEMPLATE MAPPINGS #####################
    await this.checkAndUpdateComponentTemplateMappings();

    // ############### ROLLOVER INDEX #####################
    await this.rollOverIndex();

    // ############### TRANSFORM STATUS #####################
    await this.checkHealthOfTransform();

    // ############### DATA VIEW #####################
    await this.checkandUpdateDataViews();

    // ############### ML JOBS #####################
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
