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
import type { Logger, ElasticsearchClient } from '@kbn/core/server';
import type { Subject } from 'rxjs';
import { createOrUpdateComponentTemplate } from './create_or_update_component_template';
import { createOrUpdateIndex } from './create_or_update_index';
import { createOrUpdateIndexTemplate } from './create_or_update_index_template';
import { InstallShutdownError, installWithTimeout } from './install_with_timeout';
import {
  getComponentTemplate,
  getIndexTemplate,
  type GetComponentTemplateOpts,
  type GetIndexTemplateOpts,
} from './resource_installer_utils';

export interface IndexAdapterParams {
  kibanaVersion: string;
  totalFieldsLimit?: number;
  writeIndexOnly?: boolean;
}
export type SetComponentTemplateParams = GetComponentTemplateOpts;
export type SetIndexTemplateParams = Omit<
  GetIndexTemplateOpts,
  'indexPatterns' | 'kibanaVersion' | 'totalFieldsLimit'
>;
export interface GetInstallFnParams {
  logger: Logger;
  pluginStop$: Subject<void>;
  tasksTimeoutMs?: number;
}
export interface InstallParams {
  logger: Logger;
  esClient: ElasticsearchClient | Promise<ElasticsearchClient>;
  pluginStop$: Subject<void>;
  tasksTimeoutMs?: number;
}

const DEFAULT_FIELDS_LIMIT = 2500;

export class IndexAdapter {
  protected readonly kibanaVersion: string;
  protected readonly totalFieldsLimit: number;
  protected componentTemplates: ClusterPutComponentTemplateRequest[] = [];
  protected indexTemplates: IndicesPutIndexTemplateRequest[] = [];
  protected installed: boolean;
  protected writeIndexOnly: boolean;

  constructor(public readonly name: string, options: IndexAdapterParams) {
    this.installed = false;
    this.kibanaVersion = options.kibanaVersion;
    this.totalFieldsLimit = options.totalFieldsLimit ?? DEFAULT_FIELDS_LIMIT;
    this.writeIndexOnly = options.writeIndexOnly ?? false;
  }

  public setComponentTemplate(params: SetComponentTemplateParams) {
    if (this.installed) {
      throw new Error('Cannot set component template after install');
    }
    this.componentTemplates.push(getComponentTemplate(params));
  }

  public setIndexTemplate(params: SetIndexTemplateParams) {
    if (this.installed) {
      throw new Error('Cannot set index template after install');
    }
    this.indexTemplates.push(
      getIndexTemplate({
        ...params,
        indexPatterns: [this.name],
        kibanaVersion: this.kibanaVersion,
        totalFieldsLimit: this.totalFieldsLimit,
      })
    );
  }

  protected getInstallFn({ logger, pluginStop$, tasksTimeoutMs }: GetInstallFnParams) {
    return async (promise: Promise<void>, description?: string): Promise<void> => {
      try {
        await installWithTimeout({
          installFn: () => promise,
          description,
          timeoutMs: tasksTimeoutMs,
          pluginStop$,
        });
      } catch (err) {
        if (err instanceof InstallShutdownError) {
          logger.info(err.message);
        } else {
          throw err;
        }
      }
    };
  }

  public async installTemplates(params: InstallParams) {
    const { logger, pluginStop$, tasksTimeoutMs } = params;
    const esClient = await params.esClient;
    const installFn = this.getInstallFn({ logger, pluginStop$, tasksTimeoutMs });

    // Install component templates in parallel
    await Promise.all(
      this.componentTemplates.map((componentTemplate) =>
        installFn(
          createOrUpdateComponentTemplate({
            template: componentTemplate,
            esClient,
            logger,
            totalFieldsLimit: this.totalFieldsLimit,
          }),
          `create or update ${componentTemplate.name} component template`
        )
      )
    );

    // Install index templates in parallel
    await Promise.all(
      this.indexTemplates.map((indexTemplate) =>
        installFn(
          createOrUpdateIndexTemplate({
            template: indexTemplate,
            esClient,
            logger,
          }),
          `create or update ${indexTemplate.name} index template`
        )
      )
    );
  }

  public async install(params: InstallParams) {
    this.installed = true;
    const { logger, pluginStop$, tasksTimeoutMs } = params;
    const esClient = await params.esClient;

    await this.installTemplates(params);

    const installFn = this.getInstallFn({ logger, pluginStop$, tasksTimeoutMs });

    // create index when everything is ready
    await installFn(
      createOrUpdateIndex({
        name: this.name,
        esClient,
        logger,
        totalFieldsLimit: this.totalFieldsLimit,
      }),
      `${this.name} index`
    );
  }
}
