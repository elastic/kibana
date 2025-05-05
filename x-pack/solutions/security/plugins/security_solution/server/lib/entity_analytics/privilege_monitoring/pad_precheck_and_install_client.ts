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
  //   CoreAuditService,
} from '@kbn/core/server';

import {
  getInstalledPackages,
  getPackages,
  bulkInstallPackages,
} from '@kbn/fleet-plugin/server/services/epm/packages';

import type { DataViewsService } from '@kbn/data-views-plugin/common';

import fetch from 'node-fetch';

const authHeader = `Basic ${Buffer.from('***:***').toString('base64')}`;
interface PadPrecheckAndInstallClientOpts {
  logger: Logger;
  clusterClient: IScopedClusterClient;
  namespace: string;
  soClient: SavedObjectsClientContract;
  dataViewsService: DataViewsService;
  //   mlSavedObjectService: MLSavedObjectService;
  //   auditService: CoreAuditService;
}

export class PadPrecheckAndInstallClient {
  private esClient: ElasticsearchClient;
  private soClient: SavedObjectsClientContract;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private installationStatus: Record<string, any> = {};
  private packageVersion: string = '';

  constructor(private readonly opts: PadPrecheckAndInstallClientOpts) {
    this.esClient = opts.clusterClient.asCurrentUser;
    this.soClient = opts.soClient;
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async kibanaFetch(path: string, method: string, body?: any, internal?: boolean) {
    const headers: Record<string, string> = {
      'kbn-xsrf': 'true',
      Authorization: authHeader,
      'Content-Type': 'application/json',
    };

    if (internal) {
      headers['elastic-api-version'] = '1';
      headers['x-elastic-internal-origin'] = 'kibana';
    }

    const response = await fetch(`http://localhost:5601${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    const data = await response.json();
    return data;
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
  private async fetchMlModule(moduleId: string) {
    try {
      const response = await this.kibanaFetch(
        `/internal/ml/modules/get_module/${moduleId}`,
        'GET',
        undefined,
        true
      );
      return response;
    } catch (error) {
      this.log('error', `Failed to fetch ML module ${moduleId}: ${error}`);
      throw error;
    }
  }

  private async setupMlModule(moduleId: string) {
    const mlModuleSetupResponse = await this.kibanaFetch(
      `/internal/ml/modules/setup/${moduleId}`,
      'POST',
      {
        indexPatternName:
          'logs-*,ml_okta_multiple_user_sessions_pad.all,ml_windows_privilege_type_pad.all',
        useDedicatedIndex: false,
        startDatafeed: true,
        start: Date.now() - 30 * 24 * 60 * 60 * 1000, // 30 days ago
        end: Date.now(),
      },
      true
    );
    this.log('debug', `ML module setup response: ${JSON.stringify(mlModuleSetupResponse)}`);
    this.installationStatus.ml_module_setup = {
      status: 'success',
      response: mlModuleSetupResponse,
    };
  }

  private async fetchMlJobs(jobPrefix: string) {
    const allJobs = await this.esClient.ml.getJobs();
    // console.log(allJobs);
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

      if (pipelineResponse[pipelineName]) {
        this.log('debug', `[VERIFIED] Ingest pipeline exists: ${pipelineName}`);
        const processors = pipelineResponse[pipelineName].processors || [];

        const mlPadProcessorName = `${this.packageVersion}-ml_pad_ingest_pipeline`;

        // Filter processors to detect if our target already exists
        const alreadyHasProcessor = processors.some(
          (proc) => proc.pipeline && proc.pipeline.name === mlPadProcessorName
        );

        // Set status object
        this.installationStatus.ingest_pipeline = {
          status: 'exists',
          pipeline_id: pipelineName,
          description:
            pipelineResponse[pipelineName].description || 'Custom pipeline for PAD integration',
          processors,
          needs_update: !alreadyHasProcessor,
        };

        return { exists: true, alreadyHasProcessor, processors };
      }

      return { exists: false, alreadyHasProcessor: false, processors: [] };
    } catch (error) {
      this.log('info', '[VERIFIED] Ingest pipeline does not exist');
      return { exists: false, alreadyHasProcessor: false, processors: [] };
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

    // Use soClient to search for existing data view
    const existing = await this.soClient.find({
      type: 'index-pattern',
      search: `"${title}"`,
      searchFields: ['title'],
      perPage: 1,
      namespaces: [this.opts.namespace], // Adjust if not using spaces
    });

    const alreadyExists = existing.saved_objects.find(
      (obj) => obj.attributes && (obj.attributes as { title: string }).title === title
    );

    if (!alreadyExists) {
      this.log('info', `Data view "${title}" does not exist. Creating...`);

      const { dataViewsService } = this.opts;

      const newDataView = await dataViewsService.createAndSave({
        title,
        timeFieldName: '@timestamp',
        name: 'Data view for PAD integration package',
      });

      this.installationStatus.data_view = {
        status: 'created',
        data_view_id: newDataView.id,
      };
    } else {
      this.log('info', `Data view "${title}" already exists`);

      this.installationStatus.data_view = {
        status: 'exists',
        data_view_id: alreadyExists.id,
      };
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
    const installResponse = await bulkInstallPackages({
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
      response: installResponse,
    };
    this.log('debug', `PAD package installed: ${availablePad.version}`);
    await this.checkIfPadPackageInstalled();
    // await this.setupMlJob();
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public async runPadPrecheckAndInstall(): Promise<Record<string, any>> {
    const mlEnabled = await this.isMlEnabled();
    this.installationStatus.ml_enabled = mlEnabled;

    await this.installPadIntegration();

    // ############### INGEST PIPELINE #####################
    // this.log('debug', 'Checking if PAD ingest pipeline present or not..');
    // const pipelineName = 'logs-endpoint.events.process@custom';
    // const { exists, alreadyHasProcessor, processors } = await this.isIngestPipelinePresent(
    //   pipelineName
    // );

    // if (!exists) {
    //   this.log('warn', `Pipeline ${pipelineName} does not exist. Cannot update.`);
    // }

    // if (alreadyHasProcessor) {
    //   this.log('info', `Pipeline ${pipelineName} already has ml_pad processor. No update needed.`);
    // }

    // const mlPadProcessorName = `${this.packageVersion}-ml_pad_ingest_pipeline`;

    // const updatedProcessors = [
    //   ...processors,
    //   {
    //     pipeline: {
    //       name: mlPadProcessorName,
    //       on_failure: [
    //         {
    //           set: {
    //             field: '_ingest.error',
    //             value: 'Failed to execute ml_pad_ingest_pipeline',
    //           },
    //         },
    //       ],
    //     },
    //   },
    // ];

    // await this.esClient.ingest.putPipeline({
    //   id: pipelineName,
    //   description: 'Custom pipeline for PAD integration',
    //   processors: updatedProcessors,
    // });

    // this.log('info', `Pipeline ${pipelineName} updated with ml_pad processor.`);

    // ############### COMPONENT TEMPLATE MAPPINGS #####################
    // await this.checkAndUpdateComponentTemplateMappings();

    // ############### ROLLOVER INDEX #####################
    // await this.rollOverIndex();

    // ############### TRANSFORM STATUS #####################
    // await this.checkHealthOfTransform();

    // ############### DATA VIEW #####################
    // await this.checkandUpdateDataViews();

    // ############### ML JOBS #####################
    // try {
    //     const mlModule = await this.fetchMlModule('pad-ml');
    //     this.log('debug', `ML module fetch response: ${JSON.stringify(mlModule)}`);
    //     await this.setupMlModule('pad-ml');
    //     const mlJobs = await this.fetchMlJobs('pad');
    //     this.installationStatus.ml_jobs = {
    //         count: mlJobs.length,
    //         jobs: mlJobs,
    //     };
    //     } catch (err) {
    //     this.log('error', `Failed fetching ML jobs: ${err.message}`);
    //     this.installationStatus.ml_jobs = { error: err.message };
    //     }

    return this.installationStatus;
  }
}
