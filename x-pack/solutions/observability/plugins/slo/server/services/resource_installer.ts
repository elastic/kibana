/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  ClusterPutComponentTemplateRequest,
  IndicesPutIndexTemplateRequest,
  IngestPipeline,
} from '@elastic/elasticsearch/lib/api/types';
import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import { escapeRegExp } from 'lodash';
import {
  COMPOSITE_SUMMARY_INDEX_NAME,
  getSLIIndexNamePrefix,
  getSLIRoutingPipelineName,
  HEALTH_DATA_STREAM_NAME,
  SLI_DESTINATION_INDEX_NAME,
  SLI_DESTINATION_INDEX_PATTERN,
  SLI_ROUTED_VERSIONS,
  SLO_RESOURCES_VERSION,
  SUMMARY_DESTINATION_INDEX_NAME,
  SUMMARY_TEMP_INDEX_NAME,
} from '../../common/constants';
import { COMPOSITE_SUMMARY_MAPPINGS_TEMPLATE } from '../assets/component_templates/composite_summary_mappings_template';
import { SLI_MAPPINGS_TEMPLATE } from '../assets/component_templates/sli_mappings_template';
import { SLI_SETTINGS_TEMPLATE } from '../assets/component_templates/sli_settings_template';
import { SUMMARY_MAPPINGS_TEMPLATE } from '../assets/component_templates/summary_mappings_template';
import { SUMMARY_SETTINGS_TEMPLATE } from '../assets/component_templates/summary_settings_template';
import { COMPOSITE_SUMMARY_INDEX_TEMPLATE } from '../assets/index_templates/composite_summary_index_template';
import { HEALTH_INDEX_TEMPLATE } from '../assets/index_templates/health_index_template';
import { SLI_INDEX_TEMPLATE } from '../assets/index_templates/sli_index_template';
import { SUMMARY_INDEX_TEMPLATE } from '../assets/index_templates/summary_index_template';
import { getSLIRoutingPipelineTemplate } from '../assets/ingest_templates/sli_routing_pipeline_template';
import { SLOResourcesNotInstalled } from '../errors';
import { retryTransientEsErrors } from '../utils/retry';
import type { Rounding, SliRoutingState } from './sli_routing_state';
import {
  computeRoutingState,
  isSameRoutingState,
  parseRoutingStateFromMeta,
} from './sli_routing_state';

export interface ResourceInstaller {
  install(): Promise<void>;
  verify(): Promise<boolean>;
}

const COMPONENT_TEMPLATES: readonly ClusterPutComponentTemplateRequest[] = [
  SLI_MAPPINGS_TEMPLATE,
  SLI_SETTINGS_TEMPLATE,
  SUMMARY_MAPPINGS_TEMPLATE,
  SUMMARY_SETTINGS_TEMPLATE,
  COMPOSITE_SUMMARY_MAPPINGS_TEMPLATE,
];

const INDEX_TEMPLATES: readonly IndicesPutIndexTemplateRequest[] = [
  SLI_INDEX_TEMPLATE,
  SUMMARY_INDEX_TEMPLATE,
  COMPOSITE_SUMMARY_INDEX_TEMPLATE,
];

const BASE_INDICES: ReadonlyArray<{ index: string; template: IndicesPutIndexTemplateRequest }> = [
  { index: SLI_DESTINATION_INDEX_NAME, template: SLI_INDEX_TEMPLATE },
  { index: SUMMARY_DESTINATION_INDEX_NAME, template: SUMMARY_INDEX_TEMPLATE },
  { index: SUMMARY_TEMP_INDEX_NAME, template: SUMMARY_INDEX_TEMPLATE },
  { index: COMPOSITE_SUMMARY_INDEX_NAME, template: COMPOSITE_SUMMARY_INDEX_TEMPLATE },
];

const getComposedOf = ({ composed_of: composedOf }: IndicesPutIndexTemplateRequest): string[] =>
  [composedOf ?? []].flat();

export class DefaultResourceInstaller implements ResourceInstaller {
  constructor(
    private esClient: ElasticsearchClient,
    private logger: Logger,
    private configuredRounding: Rounding,
    private now: () => Date = () => new Date()
  ) {}

  public async install(): Promise<void> {
    this.logger.debug('Installing SLO shared resources');
    const failed = new Set<string>();

    // Runs one install step, recording its failure instead of aborting the install.
    // A step whose dependencies failed is skipped and recorded as failed.
    const runStep = async (
      name: string,
      step: () => Promise<unknown>,
      dependsOn: string[] = []
    ): Promise<void> => {
      const failedDependencies = dependsOn.filter((dependency) => failed.has(dependency));
      if (failedDependencies.length > 0) {
        this.logger.warn(
          `Skipping SLO resource [${name}], failed dependencies: [${failedDependencies.join(', ')}]`
        );
        failed.add(name);
        return;
      }

      try {
        await step();
      } catch (err) {
        this.logger.error(`Failed to install SLO resource [${name}]: ${err.message}`);
        failed.add(name);
      }
    };

    await Promise.all(
      COMPONENT_TEMPLATES.map((template) =>
        runStep(template.name, () => this.createOrUpdateComponentTemplate(template))
      )
    );

    for (const template of INDEX_TEMPLATES) {
      await runStep(
        template.name,
        () => this.createOrUpdateIndexTemplate(template),
        getComposedOf(template)
      );
    }

    for (const { index, template } of BASE_INDICES) {
      await runStep(index, () => this.createIndex(index), [template.name]);
    }
    await runStep(
      `${COMPOSITE_SUMMARY_INDEX_NAME} mappings`,
      () => this.updateCompositeSummaryMapping(),
      [COMPOSITE_SUMMARY_INDEX_NAME]
    );

    const hasDailyHistory = this.createDailyHistoryChecker();
    for (const version of SLI_ROUTED_VERSIONS) {
      await runStep(getSLIRoutingPipelineName(version), () =>
        this.ensureRoutingPipeline(version, hasDailyHistory)
      );
    }

    await runStep(HEALTH_INDEX_TEMPLATE.name, () =>
      this.createOrUpdateIndexTemplate(HEALTH_INDEX_TEMPLATE)
    );
    await runStep(HEALTH_DATA_STREAM_NAME, () => this.createDataStream(HEALTH_DATA_STREAM_NAME), [
      HEALTH_INDEX_TEMPLATE.name,
    ]);

    if (failed.size > 0) {
      throw new SLOResourcesNotInstalled(
        `Failed to install SLO resources: [${[...failed].join(', ')}]`
      );
    }
  }

  public async verify(): Promise<boolean> {
    try {
      const results = await Promise.all([
        ...COMPONENT_TEMPLATES.map(async ({ name, _meta: meta }) => {
          const version = await this.fetchComponentTemplateVersion(name);
          return version !== null && version === meta?.version;
        }),
        ...[...INDEX_TEMPLATES, HEALTH_INDEX_TEMPLATE].map(async ({ name, _meta: meta }) => {
          const version = await this.fetchIndexTemplateVersion(name);
          return version !== null && version === meta?.version;
        }),
        ...BASE_INDICES.map(({ index }) =>
          this.execute(() => this.esClient.indices.exists({ index }))
        ),
        ...SLI_ROUTED_VERSIONS.map((version) => this.isRoutingPipelineUpToDate(version)),
      ]);

      return results.every(Boolean);
    } catch (err) {
      this.logger.debug(`Failed to verify SLO resources: ${err.message}`);
      return false;
    }
  }

  private async ensureRoutingPipeline(
    version: number,
    hasDailyHistory: (version: number) => Promise<boolean>
  ): Promise<void> {
    const name = getSLIRoutingPipelineName(version);
    const current = await this.fetchRoutingPipeline(version);
    const existing = parseRoutingStateFromMeta(current?._meta);
    const desired = computeRoutingState({
      existing,
      configured: this.configuredRounding,
      now: this.now(),
      hasDailyHistory: existing ? false : await hasDailyHistory(version),
    });

    if (current && existing && this.isRoutingPipelineCurrent(current, version, existing, desired)) {
      this.logger.debug(`SLO routing pipeline [${name}] is up to date`);
      return;
    }

    this.logger.info(`Installing SLO routing pipeline [${name}] with ${JSON.stringify(desired)}`);
    await this.execute(() =>
      this.esClient.ingest.putPipeline(getSLIRoutingPipelineTemplate(version, desired))
    );
  }

  private async isRoutingPipelineUpToDate(version: number): Promise<boolean> {
    const current = await this.fetchRoutingPipeline(version);
    const existing = parseRoutingStateFromMeta(current?._meta);
    if (!current || !existing) {
      return false;
    }

    const desired = computeRoutingState({
      existing,
      configured: this.configuredRounding,
      now: this.now(),
      hasDailyHistory: false,
    });
    return this.isRoutingPipelineCurrent(current, version, existing, desired);
  }

  private isRoutingPipelineCurrent(
    { _meta: meta }: IngestPipeline,
    version: number,
    existing: SliRoutingState,
    desired: SliRoutingState
  ): boolean {
    return (
      meta?.version === version &&
      meta?.template_version === SLO_RESOURCES_VERSION &&
      isSameRoutingState(existing, desired)
    );
  }

  private async fetchRoutingPipeline(version: number): Promise<IngestPipeline | undefined> {
    const id = getSLIRoutingPipelineName(version);
    const response = await this.execute(() =>
      this.esClient.ingest.getPipeline({ id }, { ignore: [404] })
    );
    return response?.[id];
  }

  // Lists the SLI indices at most once per install run. A version has daily history when one of
  // its dated indices is not on the first day of a month.
  private createDailyHistoryChecker(): (version: number) => Promise<boolean> {
    let indexNames: Promise<string[]> | undefined;

    return async (version: number) => {
      indexNames ??= this.execute(() =>
        this.esClient.indices.get({
          index: SLI_DESTINATION_INDEX_PATTERN,
          expand_wildcards: 'all',
          features: ['settings'],
        })
      ).then((response) => Object.keys(response));

      const datedIndexRegex = new RegExp(
        `^${escapeRegExp(getSLIIndexNamePrefix(version))}\\d{4}-\\d{2}-(\\d{2})$`
      );
      return (await indexNames).some((name) => {
        const day = datedIndexRegex.exec(name)?.[1];
        return day !== undefined && day !== '01';
      });
    };
  }

  private async createOrUpdateComponentTemplate(template: ClusterPutComponentTemplateRequest) {
    const currentVersion = await this.fetchComponentTemplateVersion(template.name);
    if (template._meta?.version && currentVersion === template._meta.version) {
      this.logger.debug(`SLO component template found with version [${template._meta.version}]`);
    } else {
      this.logger.debug(`Installing SLO component template [${template.name}]`);
      return this.execute(() => this.esClient.cluster.putComponentTemplate(template));
    }
  }

  private async createOrUpdateIndexTemplate(template: IndicesPutIndexTemplateRequest) {
    const currentVersion = await this.fetchIndexTemplateVersion(template.name);

    if (template._meta?.version && currentVersion === template._meta.version) {
      this.logger.debug(`SLO index template found with version [${template._meta.version}]`);
    } else {
      this.logger.debug(`Installing SLO index template [${template.name}]`);
      return this.execute(() => this.esClient.indices.putIndexTemplate(template));
    }
  }

  private async createIndex(indexName: string) {
    try {
      await this.execute(() => this.esClient.indices.create({ index: indexName }));
    } catch (err) {
      if (err?.meta?.body?.error?.type !== 'resource_already_exists_exception') {
        throw err;
      }
    }
  }

  private async updateCompositeSummaryMapping() {
    const mappings = COMPOSITE_SUMMARY_MAPPINGS_TEMPLATE.template?.mappings;
    if (!mappings) {
      return;
    }
    await this.execute(() =>
      this.esClient.indices.putMapping({ index: COMPOSITE_SUMMARY_INDEX_NAME, ...mappings })
    );
  }

  private async createDataStream(dataStreamName: string) {
    try {
      this.logger.debug(`Installing data stream [${dataStreamName}]`);
      await this.execute(() => this.esClient.indices.createDataStream({ name: dataStreamName }));
    } catch (err) {
      if (err?.meta?.body?.error?.type !== 'resource_already_exists_exception') {
        throw err;
      }
    }
  }

  private async execute<T>(esCall: () => Promise<T>): Promise<T> {
    return await retryTransientEsErrors(esCall, { logger: this.logger });
  }

  private async fetchComponentTemplateVersion(name: string) {
    const response = await this.execute(() =>
      this.esClient.cluster.getComponentTemplate({ name }, { ignore: [404] })
    );

    return response?.component_templates?.[0]?.component_template?._meta?.version ?? null;
  }

  private async fetchIndexTemplateVersion(name: string) {
    const response = await this.execute(() =>
      this.esClient.indices.getIndexTemplate({ name }, { ignore: [404] })
    );

    return response?.index_templates?.[0]?.index_template?._meta?.version ?? null;
  }
}
