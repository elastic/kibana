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
import { escapeRegExp, isEqual } from 'lodash';
import {
  COMPOSITE_SUMMARY_INDEX_NAME,
  getSLIIndexNamePrefix,
  getSLIRoutingPipelineName,
  HEALTH_DATA_STREAM_NAME,
  SLI_DESTINATION_INDEX_NAME,
  SLI_DESTINATION_INDEX_PATTERN,
  SLI_ROUTED_VERSIONS,
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
import {
  getSLIRoutingPipelineTemplate,
  isSLIRoutingPipelineCurrent,
} from '../assets/ingest_templates/sli_routing_pipeline_template';
import { SLOResourcesNotInstalled } from '../errors';
import { retryTransientEsErrors } from '../utils/retry';
import type { Rounding } from './sli_routing_state';
import {
  computeInitialRoutingState,
  parseRoutingStateFromMeta,
  reconcileRoutingState,
} from './sli_routing_state';

export interface ResourceInstaller {
  install(): Promise<void>;
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
  HEALTH_INDEX_TEMPLATE,
];

const BASE_INDICES: readonly string[] = [
  SLI_DESTINATION_INDEX_NAME,
  SUMMARY_DESTINATION_INDEX_NAME,
  SUMMARY_TEMP_INDEX_NAME,
  COMPOSITE_SUMMARY_INDEX_NAME,
];

export class DefaultResourceInstaller implements ResourceInstaller {
  constructor(
    private esClient: ElasticsearchClient,
    private logger: Logger,
    private configuredRounding: Rounding,
    private now: () => Date = () => new Date()
  ) {}

  // Every Elasticsearch call retries transient errors; the install stops at the first resource that still fails.
  public async install(): Promise<void> {
    this.logger.debug('Installing SLO shared resources');

    await Promise.all(
      COMPONENT_TEMPLATES.map((template) =>
        this.installResource(template.name, () => this.createOrUpdateComponentTemplate(template))
      )
    );

    for (const template of INDEX_TEMPLATES) {
      await this.installResource(template.name, () => this.createOrUpdateIndexTemplate(template));
    }

    for (const index of BASE_INDICES) {
      await this.installResource(index, () => this.createIndex(index));
    }
    await this.installResource(`${COMPOSITE_SUMMARY_INDEX_NAME} mappings`, () =>
      this.updateCompositeSummaryMapping()
    );
    await this.installResource(HEALTH_DATA_STREAM_NAME, () =>
      this.createDataStream(HEALTH_DATA_STREAM_NAME)
    );

    const hasDailyHistory = this.createDailyHistoryChecker();
    for (const version of SLI_ROUTED_VERSIONS) {
      await this.installResource(getSLIRoutingPipelineName(version), () =>
        this.ensureRoutingPipeline(version, hasDailyHistory)
      );
    }
  }

  private async installResource(name: string, install: () => Promise<unknown>): Promise<void> {
    try {
      await install();
    } catch (err) {
      throw new SLOResourcesNotInstalled(
        `Failed to install SLO resource [${name}]: ${err.message}`
      );
    }
  }

  private async ensureRoutingPipeline(
    version: number,
    hasDailyHistory: (version: number) => Promise<boolean>
  ): Promise<void> {
    const name = getSLIRoutingPipelineName(version);
    const current = await this.fetchRoutingPipeline(version);
    const existing = parseRoutingStateFromMeta(current?._meta);

    // A rounding change applies from the next UTC day, so every document already written keeps its index.
    const routing = existing
      ? reconcileRoutingState(existing, this.configuredRounding, this.now())
      : computeInitialRoutingState({
          configured: this.configuredRounding,
          now: this.now(),
          hasDailyHistory: await hasDailyHistory(version),
        });

    if (
      current &&
      existing &&
      isEqual(routing, existing) &&
      isSLIRoutingPipelineCurrent(current, version)
    ) {
      this.logger.debug(`SLO routing pipeline [${name}] is up to date`);
      return;
    }

    this.logger.info(`Installing SLO routing pipeline [${name}] with ${JSON.stringify(routing)}`);
    await this.execute(() =>
      this.esClient.ingest.putPipeline(getSLIRoutingPipelineTemplate(version, routing))
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
