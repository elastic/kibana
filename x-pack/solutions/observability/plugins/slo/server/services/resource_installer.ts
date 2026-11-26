/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  ClusterPutComponentTemplateRequest,
  IndicesPutIndexTemplateRequest,
} from '@elastic/elasticsearch/lib/api/types';
import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import {
  COMPOSITE_SUMMARY_INDEX_NAME,
  HEALTH_DATA_STREAM_NAME,
  SLI_DESTINATION_INDEX_NAME,
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
import { allSettledOrThrow } from '../utils/all_settled_or_throw';
import { isAbortError } from '../utils/with_deadline';
import type { RetryOptions } from '../utils/retry';
import { retryTransientEsErrors } from '../utils/retry';

export interface ResourceInstaller {
  install(): Promise<void>;
}

/** Options for one install run. */
export interface ResourceInstallerOptions {
  retryOptions: RetryOptions;
  // Every ES call is aborted, and stops retrying, once the signal fires.
  signal?: AbortSignal;
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
    private readonly esClient: ElasticsearchClient,
    private readonly logger: Logger,
    private readonly options: ResourceInstallerOptions
  ) {}

  // Every Elasticsearch call retries transient errors; the install stops at the first stage that still fails.
  public async install(): Promise<void> {
    this.logger.debug('Installing SLO shared resources');

    // Each stage waits for every call to settle so no ES call outlives the install lock.
    await allSettledOrThrow(
      COMPONENT_TEMPLATES.map((template) =>
        this.installResource(template.name, () => this.createOrUpdateComponentTemplate(template))
      )
    );
    await allSettledOrThrow(
      INDEX_TEMPLATES.map((template) =>
        this.installResource(template.name, () => this.createOrUpdateIndexTemplate(template))
      )
    );
    await allSettledOrThrow([
      ...BASE_INDICES.map((index) => this.installResource(index, () => this.createIndex(index))),
      this.installResource(HEALTH_DATA_STREAM_NAME, () =>
        this.createDataStream(HEALTH_DATA_STREAM_NAME)
      ),
    ]);
    await this.installResource(`${COMPOSITE_SUMMARY_INDEX_NAME} mappings`, () =>
      this.updateCompositeSummaryMapping()
    );
  }

  private async installResource(name: string, install: () => Promise<unknown>): Promise<void> {
    try {
      await install();
    } catch (err) {
      // A cancelled install keeps the abort error recognizable; any other failure names the resource.
      if (this.options.signal?.aborted && isAbortError(err)) {
        throw err;
      }
      throw new Error(`Failed to install SLO resource [${name}]: ${err.message}`);
    }
  }

  private async createOrUpdateComponentTemplate(template: ClusterPutComponentTemplateRequest) {
    const currentVersion = await this.fetchComponentTemplateVersion(template.name);
    if (template._meta?.version && currentVersion === template._meta.version) {
      this.logger.debug(`SLO component template found with version [${template._meta.version}]`);
    } else {
      this.logger.debug(`Installing SLO component template [${template.name}]`);
      return this.execute((options) =>
        this.esClient.cluster.putComponentTemplate(template, options)
      );
    }
  }

  private async createOrUpdateIndexTemplate(template: IndicesPutIndexTemplateRequest) {
    const currentVersion = await this.fetchIndexTemplateVersion(template.name);

    if (template._meta?.version && currentVersion === template._meta.version) {
      this.logger.debug(`SLO index template found with version [${template._meta.version}]`);
    } else {
      this.logger.debug(`Installing SLO index template [${template.name}]`);
      return this.execute((options) => this.esClient.indices.putIndexTemplate(template, options));
    }
  }

  private async createIndex(indexName: string) {
    try {
      await this.execute((options) => this.esClient.indices.create({ index: indexName }, options));
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
    await this.execute((options) =>
      this.esClient.indices.putMapping(
        { index: COMPOSITE_SUMMARY_INDEX_NAME, ...mappings },
        options
      )
    );
  }

  private async createDataStream(dataStreamName: string) {
    try {
      this.logger.debug(`Installing data stream [${dataStreamName}]`);
      await this.execute((options) =>
        this.esClient.indices.createDataStream({ name: dataStreamName }, options)
      );
    } catch (err) {
      if (err?.meta?.body?.error?.type !== 'resource_already_exists_exception') {
        throw err;
      }
    }
  }

  private async execute<T>(esCall: (options: { signal?: AbortSignal }) => Promise<T>): Promise<T> {
    const { retryOptions, signal } = this.options;
    return await retryTransientEsErrors(() => esCall({ signal }), {
      logger: this.logger,
      retryOptions,
      signal,
    });
  }

  private async fetchComponentTemplateVersion(name: string) {
    const response = await this.execute((options) =>
      this.esClient.cluster.getComponentTemplate({ name }, { ...options, ignore: [404] })
    );

    return response?.component_templates?.[0]?.component_template?._meta?.version ?? null;
  }

  private async fetchIndexTemplateVersion(name: string) {
    const response = await this.execute((options) =>
      this.esClient.indices.getIndexTemplate({ name }, { ...options, ignore: [404] })
    );

    return response?.index_templates?.[0]?.index_template?._meta?.version ?? null;
  }
}
