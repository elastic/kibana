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
  HEALTH_DATA_STREAM_NAME,
  SLI_DESTINATION_INDEX_NAME,
  SUMMARY_DESTINATION_INDEX_NAME,
  SUMMARY_TEMP_INDEX_NAME,
} from '../../common/constants';
import { SLI_MAPPINGS_TEMPLATE } from '../assets/component_templates/sli_mappings_template';
import { SLI_SETTINGS_TEMPLATE } from '../assets/component_templates/sli_settings_template';
import { SUMMARY_MAPPINGS_TEMPLATE } from '../assets/component_templates/summary_mappings_template';
import { SUMMARY_SETTINGS_TEMPLATE } from '../assets/component_templates/summary_settings_template';
import { HEALTH_INDEX_TEMPLATE } from '../assets/index_templates/health_index_template';
import { SLI_INDEX_TEMPLATE } from '../assets/index_templates/sli_index_template';
import { SUMMARY_INDEX_TEMPLATE } from '../assets/index_templates/summary_index_template';
import { retryTransientEsErrors } from '../utils/retry';

export interface ResourceInstaller {
  ensureCommonResourcesInstalled(): Promise<void>;
}

export class DefaultResourceInstaller implements ResourceInstaller {
  constructor(private esClient: ElasticsearchClient, private logger: Logger) {}

  public async ensureCommonResourcesInstalled(): Promise<void> {
    try {
      this.logger.debug('Installing SLO shared resources');
      await Promise.all([
        this.createOrUpdateComponentTemplate(SLI_MAPPINGS_TEMPLATE),
        this.createOrUpdateComponentTemplate(SLI_SETTINGS_TEMPLATE),
        this.createOrUpdateComponentTemplate(SUMMARY_MAPPINGS_TEMPLATE),
        this.createOrUpdateComponentTemplate(SUMMARY_SETTINGS_TEMPLATE),
      ]);

      await this.createOrUpdateIndexTemplate(SLI_INDEX_TEMPLATE);
      await this.createOrUpdateIndexTemplate(SUMMARY_INDEX_TEMPLATE);

      await this.createIndex(SLI_DESTINATION_INDEX_NAME);
      await this.createIndex(SUMMARY_DESTINATION_INDEX_NAME);
      await this.createIndex(SUMMARY_TEMP_INDEX_NAME);

      await this.createOrUpdateIndexTemplate(HEALTH_INDEX_TEMPLATE);
      await this.createDataStream(HEALTH_DATA_STREAM_NAME);
    } catch (err) {
      this.logger.error(`Error while installing SLO shared resources: ${err}`);
    }
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
